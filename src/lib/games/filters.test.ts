import { describe, expect, it } from "vitest";
import { filterAndSortGames } from "@/lib/games/filters";
import type { StoredGame } from "@/lib/games/types";

const games: StoredGame[] = [
  {
    id: "1",
    source: "chess.com",
    white: { name: "Alice", rating: 1600 },
    black: { name: "Bob", rating: 1500 },
    userColor: "white",
    result: "win",
    endTime: 100,
    timeClass: "blitz",
    rules: "chess",
    moveCount: 40,
    importedAt: 1,
    analysisSummary: {
      whiteAccuracy: 92,
      blackAccuracy: 88,
      whiteCounts: {
        brilliant: 0,
        great: 0,
        best: 0,
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
        best: 0,
        excellent: 0,
        good: 0,
        inaccuracy: 0,
        mistake: 0,
        miss: 0,
        blunder: 0,
        forced: 0,
        book: 0,
      },
      analyzedAt: 1,
      version: {
        engineVersion: "stockfish",
        depth: 15,
        classifierVersion: "classifier-v1",
        accuracyVersion: "accuracy-v1",
      },
    },
  },
  {
    id: "2",
    source: "chess.com",
    white: { name: "Carol", rating: 1700 },
    black: { name: "Alice", rating: 1600 },
    userColor: "black",
    result: "loss",
    endTime: 200,
    timeClass: "rapid",
    rules: "chess",
    moveCount: 60,
    importedAt: 1,
  },
];

describe("filterAndSortGames", () => {
  it("filters by search and analysis status", () => {
    const result = filterAndSortGames(games, {
      search: "bob",
      timeClass: "all",
      result: "all",
      analysis: "analyzed",
      sort: "newest",
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("1");
  });

  it("sorts by newest", () => {
    const result = filterAndSortGames(games, {
      search: "",
      timeClass: "all",
      result: "all",
      analysis: "all",
      sort: "newest",
    });

    expect(result.map((game) => game.id)).toEqual(["2", "1"]);
  });

  it("sorts by accuracy", () => {
    const result = filterAndSortGames(games, {
      search: "",
      timeClass: "all",
      result: "all",
      analysis: "all",
      sort: "accuracy",
    });

    expect(result[0]?.id).toBe("1");
  });
});
