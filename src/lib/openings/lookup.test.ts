import { describe, expect, it } from "vitest";
import { DEFAULT_POSITION } from "chess.js";
import type { ChessMove } from "@/lib/chess/types";
import {
  computeBookPlies,
  findOpeningInIndex,
  indexFromRecords,
  openingAfterBookLine,
  positionKey,
} from "@/lib/openings/lookup";

const START = DEFAULT_POSITION;

function move(partial: Partial<ChessMove> & Pick<ChessMove, "ply" | "uci" | "fenBefore" | "fenAfter">): ChessMove {
  return {
    moveNumber: Math.ceil(partial.ply / 2),
    color: partial.ply % 2 === 1 ? "white" : "black",
    san: partial.san ?? partial.uci,
    from: partial.uci.slice(0, 2),
    to: partial.uci.slice(2, 4),
    ...partial,
  };
}

describe("opening lookup", () => {
  it("matches positions by first four FEN fields", () => {
    const index = indexFromRecords([
      { eco: "B00", name: "Starting Position", epd: positionKey(START) },
    ]);

    expect(findOpeningInIndex(index, START)).toEqual({
      eco: "B00",
      name: "Starting Position",
    });
  });

  it("marks consecutive book plies until an unknown position", () => {
    const afterE4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const afterE5 = "rnbqkbnr/pppp1ppp/8/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";
    const afterNf3 = "rnbqkbnr/pppp1ppp/8/4p3/8/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2";

    const index = indexFromRecords([
      { eco: "A00", name: "Start", epd: positionKey(START) },
      { eco: "B00", name: "King's Pawn", epd: positionKey(afterE4) },
      { eco: "C20", name: "Open Game", epd: positionKey(afterE5) },
    ]);

    const moves = [
      move({ ply: 1, uci: "e2e4", fenBefore: START, fenAfter: afterE4 }),
      move({ ply: 2, uci: "e7e5", fenBefore: afterE4, fenAfter: afterE5 }),
      move({ ply: 3, uci: "g1f3", fenBefore: afterE5, fenAfter: afterNf3 }),
    ];

    const book = computeBookPlies(index, START, moves);
    expect(book).toEqual(new Set([1, 2, 3]));
    expect(openingAfterBookLine(index, START, moves)?.eco).toBe("C20");
  });
});
