import { describe, expect, it } from "vitest";
import type { MoveAnalysis } from "@/lib/analysis/types";
import { calculatePlayerAccuracy, moveAccuracy } from "@/lib/review/accuracy";

function createMove(
  ply: number,
  color: "white" | "black",
  before: number,
  after: number,
  classification: MoveAnalysis["classification"] = "good",
): MoveAnalysis {
  return {
    ply,
    moveNumber: Math.ceil(ply / 2),
    color,
    playedMove: "e4",
    playedMoveUci: "e2e4",
    evaluationBefore: { type: "cp", value: before },
    evaluationAfter: { type: "cp", value: after },
    evaluationLoss: Math.max(0, color === "white" ? before - after : after - before),
    classification,
    playedBestMove: false,
    isForced: false,
  };
}

describe("moveAccuracy", () => {
  it("returns 100 when win% does not drop", () => {
    expect(moveAccuracy(60, 62)).toBe(100);
  });

  it("returns lower accuracy for larger win% drops", () => {
    const small = moveAccuracy(55, 52);
    const large = moveAccuracy(55, 30);
    expect(small).toBeGreaterThan(large);
  });

  it("clamps to 0..100", () => {
    expect(moveAccuracy(90, 10)).toBeGreaterThanOrEqual(0);
    expect(moveAccuracy(90, 10)).toBeLessThanOrEqual(100);
  });
});

describe("calculatePlayerAccuracy", () => {
  it("returns near 100 for perfect play", () => {
    const moves = [
      createMove(1, "white", 0.3, 0.28),
      createMove(2, "black", -0.28, -0.26),
    ];
    const result = calculatePlayerAccuracy(moves, "white");
    expect(result.score).toBeGreaterThan(95);
  });

  it("returns lower score for blunder-heavy games", () => {
    const good = [createMove(1, "white", 0.5, 0.48)];
    const bad = [createMove(1, "white", 0.5, -2.0, "blunder")];
    const goodScore = calculatePlayerAccuracy(good, "white").score;
    const badScore = calculatePlayerAccuracy(bad, "white").score;
    expect(badScore).toBeLessThan(goodScore - 20);
  });

  it("penalizes 0 to -1 more than -8 to -9", () => {
    const equalToLosing = calculatePlayerAccuracy(
      [createMove(1, "white", 0, -1, "mistake")],
      "white",
    ).score;
    const alreadyLost = calculatePlayerAccuracy(
      [createMove(1, "white", -8, -9, "good")],
      "white",
    ).score;
    expect(alreadyLost).toBeGreaterThan(equalToLosing);
  });

  it("never exceeds 0..100 bounds", () => {
    const extreme = calculatePlayerAccuracy(
      [createMove(1, "white", 5, -5, "blunder")],
      "white",
    );
    expect(extreme.score).toBeGreaterThanOrEqual(0);
    expect(extreme.score).toBeLessThanOrEqual(100);
  });

  it("computes White and Black independently", () => {
    const moves = [
      createMove(1, "white", 0.5, 0.48),
      createMove(2, "black", -0.48, 1.0, "blunder"),
    ];
    const white = calculatePlayerAccuracy(moves, "white").score;
    const black = calculatePlayerAccuracy(moves, "black").score;
    expect(white).toBeGreaterThan(black);
  });

  it("is deterministic", () => {
    const moves = [createMove(1, "white", 0.3, 0.1)];
    const first = calculatePlayerAccuracy(moves, "white").score;
    const second = calculatePlayerAccuracy(moves, "white").score;
    expect(first).toBe(second);
  });
});
