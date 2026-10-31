import { describe, expect, it } from "vitest";
import { uciMovesMatch, uciToSan } from "@/lib/analysis/uciToSan";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("uciToSan", () => {
  it("converts normal opening moves", () => {
    expect(uciToSan(START_FEN, "e2e4")).toBe("e4");
    expect(uciToSan(START_FEN, "g1f3")).toBe("Nf3");
  });

  it("converts captures", () => {
    const fen =
      "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4";
    expect(uciToSan(fen, "c4f7")).toBe("Bxf7+");
  });

  it("converts castling", () => {
    const fen =
      "r3k2r/pppp1ppp/4b3/8/8/8/PPPP1PPP/R3K2R w KQkq - 0 8";
    expect(uciToSan(fen, "e1g1")).toBe("O-O");
    expect(uciToSan(fen, "e1c1")).toBe("O-O-O");
  });

  it("converts promotion", () => {
    const fen = "8/P7/8/8/8/8/8/4k2K w - - 0 1";
    expect(uciToSan(fen, "a7a8q")).toBe("a8=Q");
  });

  it("converts checking move SAN", () => {
    const fen = "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4";
    expect(uciToSan(fen, "c4f7")).toBe("Bxf7+");
  });

  it("converts checkmate SAN on the board", () => {
    const fen = "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2";
    expect(uciToSan(fen, "d8h4")).toBe("Qh4#");
  });
});

describe("uciMovesMatch", () => {
  it("matches case-insensitively", () => {
    expect(uciMovesMatch("E2E4", "e2e4")).toBe(true);
    expect(uciMovesMatch("e2e4", "g1f3")).toBe(false);
  });
});
