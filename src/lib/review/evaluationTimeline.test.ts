import { describe, expect, it } from "vitest";
import type { MoveAnalysis } from "@/lib/analysis/types";
import { buildEvaluationTimeline } from "@/lib/review/evaluationTimeline";

function sampleMove(ply: number, after: number): MoveAnalysis {
  return {
    ply,
    moveNumber: Math.ceil(ply / 2),
    color: ply % 2 === 1 ? "white" : "black",
    playedMove: "e4",
    playedMoveUci: "e2e4",
    evaluationBefore: { type: "cp", value: 0 },
    evaluationAfter: { type: "cp", value: after },
    evaluationLoss: 0.1,
    classification: "good",
    playedBestMove: false,
    isForced: false,
    engineBefore: {
      fen: "start",
      depth: 15,
      evaluation: { type: "cp", value: 0 },
      bestMove: "e2e4",
      principalVariation: ["e2e4"],
      lines: [],
      settings: { depth: 15 },
      source: "engine",
    },
  };
}

describe("buildEvaluationTimeline", () => {
  it("returns moves.length + 1 points", () => {
    const timeline = buildEvaluationTimeline([
      sampleMove(1, 0.2),
      sampleMove(2, 0.1),
    ]);
    expect(timeline).toHaveLength(3);
    expect(timeline[0].ply).toBe(0);
    expect(timeline[2].ply).toBe(2);
  });

  it("preserves White POV win percent ordering", () => {
    const timeline = buildEvaluationTimeline([
      sampleMove(1, 0.5),
      sampleMove(2, -0.5),
    ]);
    expect(timeline[1].winPercent).toBeGreaterThan(timeline[2].winPercent);
  });
});
