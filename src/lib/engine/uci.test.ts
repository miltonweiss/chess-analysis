import { describe, expect, it } from "vitest";
import {
  formatEvaluation,
  normalizeEvaluation,
  parseBestMove,
  parseInfoLine,
  scoreToWhitePov,
} from "@/lib/engine/uci";

describe("uci parser", () => {
  it("parses info lines with cp score and pv", () => {
    const info = parseInfoLine(
      "info depth 15 seldepth 18 multipv 1 score cp 42 nodes 120000 nps 900000 time 130 pv e2e4 e7e5",
    );

    expect(info).not.toBeNull();
    expect(info?.depth).toBe(15);
    expect(info?.score).toEqual({ type: "cp", value: 42 });
    expect(info?.pv).toEqual(["e2e4", "e7e5"]);
  });

  it("parses mate scores", () => {
    const info = parseInfoLine("info depth 20 score mate 3 pv d1h5 g7g6 h5g6");
    expect(info?.score).toEqual({ type: "mate", value: 3 });
  });

  it("parses mate 0 at depth 0", () => {
    const info = parseInfoLine("info depth 0 score mate 0");
    expect(info?.depth).toBe(0);
    expect(info?.score).toEqual({ type: "mate", value: 0 });
  });

  it("flags lowerbound lines", () => {
    const info = parseInfoLine("info depth 10 score cp 100 lowerbound");
    expect(info?.hasBound).toBe(true);
  });

  it("ignores info string and currmove lines", () => {
    expect(parseInfoLine("info string NNUE evaluation enabled")).toBeNull();
    expect(parseInfoLine("info depth 10 currmove e2e4")).toBeNull();
  });

  it("parses bestmove with ponder", () => {
    expect(parseBestMove("bestmove e2e4 ponder e7e5")).toEqual({
      bestMove: "e2e4",
      ponder: "e7e5",
    });
  });

  it("parses bestmove none", () => {
    expect(parseBestMove("bestmove (none)")).toEqual({ bestMove: null });
  });

  it("normalizes cp evaluation to white perspective in pawns", () => {
    expect(normalizeEvaluation({ type: "cp", value: 43 }, "w")).toEqual({
      type: "cp",
      value: 0.43,
    });
    expect(normalizeEvaluation({ type: "cp", value: 43 }, "b")).toEqual({
      type: "cp",
      value: -0.43,
    });
  });

  it("normalizes mate evaluation to white perspective", () => {
    expect(normalizeEvaluation({ type: "mate", value: 3 }, "w")).toEqual({
      type: "mate",
      value: 3,
    });
    expect(normalizeEvaluation({ type: "mate", value: -2 }, "b")).toEqual({
      type: "mate",
      value: 2,
    });
  });

  it("formats evaluations for display", () => {
    expect(formatEvaluation({ type: "cp", value: 0.42 })).toBe("+0.42");
    expect(formatEvaluation({ type: "cp", value: -1.3 })).toBe("-1.30");
    expect(formatEvaluation({ type: "mate", value: 3 })).toBe("+M3");
    expect(formatEvaluation({ type: "mate", value: -2 })).toBe("-M2");
    expect(formatEvaluation({ type: "mate", value: 0 })).toBe("#");
  });

  it("keeps deprecated scoreToWhitePov working", () => {
    expect(scoreToWhitePov({ type: "cp", value: 50 }, "b")).toEqual({
      type: "cp",
      value: -50,
    });
  });
});
