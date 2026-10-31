import { describe, expect, it } from "vitest";
import {
  compareEvaluations,
  evaluationLoss,
  evaluationToCentipawns,
  MATE_SCORE_BASE,
} from "@/lib/analysis/evaluation";

describe("evaluationToCentipawns", () => {
  it("converts cp evaluations from White POV pawns to centipawns", () => {
    expect(evaluationToCentipawns({ type: "cp", value: 0.5 })).toBe(50);
    expect(evaluationToCentipawns({ type: "cp", value: -1.2 })).toBe(-120);
  });

  it("orders mate scores above normal cp values", () => {
    const mateIn3 = evaluationToCentipawns({ type: "mate", value: 3 });
    const mateIn1 = evaluationToCentipawns({ type: "mate", value: 1 });
    expect(mateIn1).toBeGreaterThan(mateIn3);
    expect(mateIn3).toBeGreaterThan(1000);
  });

  it("ranks Black mates below White mates", () => {
    const whiteMate = evaluationToCentipawns({ type: "mate", value: 2 });
    const blackMate = evaluationToCentipawns({ type: "mate", value: -2 });
    expect(whiteMate).toBeGreaterThan(blackMate);
    expect(blackMate).toBe(-MATE_SCORE_BASE + 2);
  });
});

describe("evaluationLoss", () => {
  it("computes White loss as before minus after", () => {
    expect(
      evaluationLoss({ type: "cp", value: 0.5 }, { type: "cp", value: -1.0 }, "white"),
    ).toBeCloseTo(1.5);
  });

  it("computes Black loss as after minus before", () => {
    expect(
      evaluationLoss({ type: "cp", value: -0.5 }, { type: "cp", value: 1.0 }, "black"),
    ).toBeCloseTo(1.5);
  });

  it("returns almost zero loss for near-equal moves", () => {
    expect(
      evaluationLoss({ type: "cp", value: 0.5 }, { type: "cp", value: 0.48 }, "white"),
    ).toBeCloseTo(0.02);
  });

  it("never returns negative loss", () => {
    expect(
      evaluationLoss({ type: "cp", value: -1.0 }, { type: "cp", value: 0.5 }, "white"),
    ).toBe(0);
  });

  it("detects large loss when White allows faster mate", () => {
    const loss = evaluationLoss(
      { type: "mate", value: 3 },
      { type: "mate", value: 1 },
      "white",
    );
    expect(loss).toBe(0);
  });

  it("treats delaying own mate as a small centipawn-equivalent loss", () => {
    const loss = evaluationLoss(
      { type: "mate", value: 1 },
      { type: "mate", value: 3 },
      "white",
    );
    expect(loss).toBeCloseTo(0.02);
  });

  it("resolves terminal checkmate on the board with winner context", () => {
    const before = evaluationToCentipawns(
      { type: "mate", value: 1 },
      undefined,
    );
    const afterWhiteMate = evaluationToCentipawns(
      { type: "mate", value: 0 },
      { terminal: "checkmate", winner: "white" },
    );
    const afterBlackMate = evaluationToCentipawns(
      { type: "mate", value: 0 },
      { terminal: "checkmate", winner: "black" },
    );

    expect(afterWhiteMate).toBeGreaterThan(before);
    expect(afterBlackMate).toBeLessThan(-before);

    const whiteDeliversMate = evaluationLoss(
      { type: "mate", value: 1 },
      { type: "mate", value: 0 },
      "white",
      {
        after: { terminal: "checkmate", winner: "white" },
      },
    );
    expect(whiteDeliversMate).toBe(0);
  });

  it("detects catastrophic loss when White goes from winning mate to being mated", () => {
    const loss = evaluationLoss(
      { type: "mate", value: 3 },
      { type: "mate", value: -1 },
      "white",
    );
    expect(loss).toBeGreaterThan(100);
  });

  it("detects Black loss when delaying their own mating attack", () => {
    const loss = evaluationLoss(
      { type: "mate", value: -2 },
      { type: "mate", value: -5 },
      "black",
    );
    expect(loss).toBeCloseTo(0.03);
  });

  it("detects loss when moving from cp advantage to opponent mate", () => {
    const loss = evaluationLoss(
      { type: "cp", value: 5.0 },
      { type: "mate", value: -3 },
      "white",
    );
    expect(loss).toBeGreaterThan(100);
  });
});

describe("compareEvaluations", () => {
  it("returns signed white delta", () => {
    const result = compareEvaluations(
      { type: "cp", value: 0.5 },
      { type: "cp", value: -1.0 },
      "white",
    );
    expect(result.whiteDeltaCp).toBe(-150);
    expect(result.evaluationLoss).toBeCloseTo(1.5);
  });
});
