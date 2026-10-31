import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import type { LoadedGame } from "@/lib/chess/types";
import { createAnalysisVersion } from "@/lib/analysis/version";
import type { GameAnalysis } from "@/lib/analysis/types";
import { resetDatabaseConnection } from "@/lib/storage/indexedDb";
import {
  clearAllGames,
  countGames,
  getAnalysis,
  getGame,
  getPgn,
  hasGame,
  backfillFinalPositions,
  listGames,
  saveAnalysis,
  saveGames,
  saveLoadedGame,
} from "@/lib/storage/gameRepository";

const loadedGame: LoadedGame = {
  initialFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  pgn: '[Event "Test"]\n1. e4 e5 1-0',
  metadata: {
    white: "Alice",
    black: "Bob",
    result: "1-0",
    date: "2024.01.01",
  },
  moves: [
    {
      ply: 1,
      moveNumber: 1,
      color: "white",
      san: "e4",
      uci: "e2e4",
      from: "e2",
      to: "e4",
      fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      fenAfter: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
    },
    {
      ply: 2,
      moveNumber: 1,
      color: "black",
      san: "e5",
      uci: "e7e5",
      from: "e7",
      to: "e5",
      fenBefore: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      fenAfter: "rnbqkbnr/pppppppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    },
  ],
};

beforeEach(async () => {
  resetDatabaseConnection();
  await clearAllGames();
});

describe("gameRepository", () => {
  it("saves and loads games with separate PGN store", async () => {
    const saved = await saveLoadedGame(loadedGame, {
      source: "pgn",
      userColor: "white",
      endTime: 1_700_000_000_000,
      timeClass: "blitz",
    });

    expect(await countGames()).toBe(1);
    expect(await hasGame(saved.id)).toBe(true);

    const game = await getGame(saved.id);
    expect(game?.white.name).toBe("Alice");
    expect(game?.result).toBe("win");

    const pgn = await getPgn(saved.id);
    expect(pgn).toContain("1. e4");
  });

  it("deduplicates by id on re-save", async () => {
    const first = await saveLoadedGame(loadedGame, { source: "pgn" });
    const second = await saveLoadedGame(loadedGame, { source: "pgn" });

    expect(first.id).toBe(second.id);
    expect(await countGames()).toBe(1);
  });

  it("round-trips analysis and denormalizes summary onto game", async () => {
    const saved = await saveLoadedGame(loadedGame, { source: "pgn" });

    const analysis: GameAnalysis = {
      settings: { depth: 15 },
      moves: [],
    };

    const version = createAnalysisVersion({ depth: 15 });
    const summary = {
      whiteAccuracy: 90,
      blackAccuracy: 85,
      whiteCounts: {
        brilliant: 0,
        great: 0,
        best: 1,
        excellent: 0,
        good: 0,
        inaccuracy: 0,
        mistake: 0,
        miss: 0,
        blunder: 0,
        forced: 0,
        book: 0,
      },
      blackCounts: {
        brilliant: 0,
        great: 0,
        best: 1,
        excellent: 0,
        good: 0,
        inaccuracy: 0,
        mistake: 0,
        miss: 0,
        blunder: 0,
        forced: 0,
        book: 0,
      },
      analyzedAt: Date.now(),
      version,
    };

    await saveAnalysis({
      gameId: saved.id,
      version,
      analysis,
      summary,
      analyzedAt: summary.analyzedAt,
    });

    const stored = await getAnalysis(saved.id);
    expect(stored?.analysis.settings.depth).toBe(15);

    const game = await getGame(saved.id);
    expect(game?.analysisSummary?.whiteAccuracy).toBe(90);
  });

  it("saveGames writes batch entries", async () => {
    await saveGames([
      {
        game: {
          id: "test:1",
          source: "manual",
          white: { name: "A" },
          black: { name: "B" },
          endTime: 1,
          timeClass: "blitz",
          rules: "chess",
          moveCount: 0,
          importedAt: Date.now(),
        },
        pgn: "1. e4",
      },
    ]);

    expect(await getPgn("test:1")).toBe("1. e4");
  });

  it("stores the final position and last move on save", async () => {
    const saved = await saveLoadedGame(loadedGame, { source: "pgn" });

    const game = await getGame(saved.id);
    expect(game?.finalFen).toBe(loadedGame.moves[1].fenAfter);
    expect(game?.lastMove).toEqual({ from: "e7", to: "e5" });
  });

  it("backfills final positions for games saved without them", async () => {
    await saveGames([
      {
        game: {
          id: "test:legacy",
          source: "manual",
          white: { name: "A" },
          black: { name: "B" },
          endTime: 1,
          timeClass: "blitz",
          rules: "chess",
          moveCount: 2,
          importedAt: Date.now(),
        },
        pgn: "1. e4 e5 1-0",
      },
    ]);

    const games = await listGames();
    const updated = await backfillFinalPositions(games);

    const expectedFen = "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";

    const legacy = updated.find((game) => game.id === "test:legacy");
    expect(legacy?.finalFen).toBe(expectedFen);
    expect(legacy?.lastMove).toEqual({ from: "e7", to: "e5" });

    const stored = await getGame("test:legacy");
    expect(stored?.finalFen).toBe(expectedFen);
  });
});
