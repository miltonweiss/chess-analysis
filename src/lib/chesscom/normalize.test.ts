import { describe, expect, it } from "vitest";
import type { ChessComGame } from "@/lib/chesscom/types";
import { inferTimeClass, normalizeChessComGame } from "@/lib/chesscom/normalize";

const baseGame: ChessComGame = {
  url: "https://www.chess.com/game/live/12345",
  pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2024.01.01"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]
[TimeControl "180"]
[TimeClass "blitz"]

1. e4 e5 2. Nf3 Nc6 1-0`,
  end_time: 1_704_067_200,
  time_control: "180",
  time_class: "blitz",
  rated: true,
  rules: "chess",
  white: { username: "Alice", rating: 1500, result: "win" },
  black: { username: "Bob", rating: 1400, result: "timeout" },
};

describe("inferTimeClass", () => {
  it("prefers API time_class", () => {
    expect(inferTimeClass("600", "rapid")).toBe("rapid");
  });

  it("infers from time control", () => {
    expect(inferTimeClass("60", undefined)).toBe("bullet");
    expect(inferTimeClass("300", undefined)).toBe("blitz");
    expect(inferTimeClass("900", undefined)).toBe("rapid");
  });
});

describe("normalizeChessComGame", () => {
  it("normalizes a standard chess game", () => {
    const result = normalizeChessComGame(baseGame, "alice");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.entry.game.id).toBe("chess.com:live:12345");
      expect(result.entry.game.userColor).toBe("white");
      expect(result.entry.game.result).toBe("win");
      expect(result.entry.game.moveCount).toBe(4);
    }
  });

  it("stores the final position and last move", () => {
    const result = normalizeChessComGame(baseGame, "alice");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.entry.game.finalFen).toBe(
        "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
      );
      expect(result.entry.game.lastMove).toEqual({ from: "b8", to: "c6" });
    }
  });

  it("skips non-chess variants", () => {
    const result = normalizeChessComGame({ ...baseGame, rules: "chess960" }, "alice");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("variant");
    }
  });

  it("skips invalid PGN", () => {
    const result = normalizeChessComGame({ ...baseGame, pgn: "not a pgn" }, "alice");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("invalid_pgn");
    }
  });
});
