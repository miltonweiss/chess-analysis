import { describe, expect, it } from "vitest";
import type { LoadedGame } from "@/lib/chess/types";
import {
  deriveChessComGameId,
  deriveGameIdFromLoadedGame,
  derivePgnGameId,
} from "@/lib/games/gameId";

const sampleGame: LoadedGame = {
  initialFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  pgn: "1. e4 e5",
  metadata: {
    white: "Alice",
    black: "Bob",
    date: "2024.01.01",
    result: "1-0",
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

describe("deriveChessComGameId", () => {
  it("parses live game URLs", () => {
    expect(deriveChessComGameId("https://www.chess.com/game/live/123456789")).toBe(
      "chess.com:live:123456789",
    );
  });

  it("parses daily game URLs", () => {
    expect(deriveChessComGameId("https://www.chess.com/game/daily/987654321")).toBe(
      "chess.com:daily:987654321",
    );
  });

  it("returns null for unknown URLs", () => {
    expect(deriveChessComGameId("https://lichess.org/abc123")).toBeNull();
  });
});

describe("derivePgnGameId", () => {
  it("is stable for the same game", async () => {
    const first = await derivePgnGameId(sampleGame);
    const second = await derivePgnGameId(sampleGame);
    expect(first).toBe(second);
    expect(first.startsWith("pgn:")).toBe(true);
  });

  it("changes when moves change", async () => {
    const first = await derivePgnGameId(sampleGame);
    const changed = {
      ...sampleGame,
      moves: sampleGame.moves.slice(0, 1),
    };
    const second = await derivePgnGameId(changed);
    expect(first).not.toBe(second);
  });
});

describe("deriveGameIdFromLoadedGame", () => {
  it("prefers chess.com URL when provided", async () => {
    const id = await deriveGameIdFromLoadedGame(
      sampleGame,
      "https://www.chess.com/game/live/555",
    );
    expect(id).toBe("chess.com:live:555");
  });
});
