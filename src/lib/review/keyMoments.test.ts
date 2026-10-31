import { describe, expect, it } from "vitest";
import type { MoveAnalysis } from "@/lib/analysis/types";
import { detectKeyMoments } from "@/lib/review/keyMoments";

function move(partial: Partial<MoveAnalysis> & Pick<MoveAnalysis, "ply" | "color">): MoveAnalysis {
  return {
    moveNumber: Math.ceil(partial.ply / 2),
    playedMove: "e4",
    playedMoveUci: "e2e4",
    evaluationBefore: { type: "cp", value: 0.5 },
    evaluationAfter: { type: "cp", value: 0.4 },
    evaluationLoss: 0.1,
    classification: "good",
    playedBestMove: false,
    isForced: false,
    ...partial,
  };
}

describe("detectKeyMoments", () => {
  it("returns empty for stable games", () => {
    const moments = detectKeyMoments([
      move({ ply: 1, color: "white" }),
      move({ ply: 2, color: "black" }),
    ]);
    expect(moments).toHaveLength(0);
  });

  it("detects major blunders", () => {
    const moments = detectKeyMoments([
      move({
        ply: 1,
        color: "white",
        evaluationBefore: { type: "cp", value: 0.5 },
        evaluationAfter: { type: "cp", value: -2.5 },
        classification: "blunder",
        evaluationLoss: 3,
      }),
    ]);
    expect(moments.some((moment) => moment.type === "blunder")).toBe(true);
  });

  it("detects missed winning chances", () => {
    const moments = detectKeyMoments([
      move({
        ply: 1,
        color: "white",
        evaluationBefore: { type: "cp", value: 3.0 },
        evaluationAfter: { type: "cp", value: 0.8 },
        classification: "inaccuracy",
        evaluationLoss: 2.2,
      }),
    ]);
    expect(moments.some((moment) => moment.type === "missed-win")).toBe(true);
  });

  it("detects mate allowed on terminal position", () => {
    const moments = detectKeyMoments([
      move({
        ply: 1,
        color: "white",
        evaluationBefore: { type: "cp", value: 0.5 },
        evaluationAfter: { type: "mate", value: 0 },
        classification: "blunder",
        engineAfter: {
          fen: "x",
          depth: 0,
          evaluation: { type: "mate", value: 0 },
          bestMove: null,
          principalVariation: [],
          lines: [],
          settings: { depth: 15 },
          source: "terminal",
          terminal: "checkmate",
          winner: "black",
        },
      }),
    ]);
    expect(moments.some((moment) => moment.type === "mate")).toBe(true);
  });
});
