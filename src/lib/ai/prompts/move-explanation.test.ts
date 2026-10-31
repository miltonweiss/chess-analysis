import { describe, expect, it } from "vitest";
import {
  buildMoveExplanationMessages,
  MOVE_EXPLANATION_PROMPT_VERSION,
} from "@/lib/ai/prompts/move-explanation";
import type { VerifiedMoveExplanationContext } from "@/lib/ai/types";

const baseCtx: VerifiedMoveExplanationContext = {
  perspective: "neutral",
  ply: 10,
  moveNumber: 5,
  color: "white",
  playedUci: "d1h5",
  bestUci: "g1f3",
  playedWasBest: false,
  isForced: false,
  classification: "mistake",
  evaluationBefore: { type: "cp", value: 0.5 },
  evaluationAfter: { type: "cp", value: -1.0 },
  evaluationLoss: 1.5,
  winPercentBefore: 55,
  winPercentAfter: 35,
  fenBefore: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  fenAfter: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
  bestLine: ["g1f3"],
  afterPlayedLine: [],
  engineDepth: 15,
  previousMoves: [],
  nextMoves: [],
  playedSan: "Qh5",
  bestSan: "Nf3",
  bestLineSan: ["Nf3"],
  afterPlayedLineSan: [],
  previousMovesSan: [],
  nextMovesSan: [],
  evalBeforeDisplay: "+0.50",
  evalAfterDisplay: "-1.00",
};

describe("move explanation prompts", () => {
  it("has version constant", () => {
    expect(MOVE_EXPLANATION_PROMPT_VERSION).toBe("v1");
  });

  it("system message is static and contains no interpolated data", () => {
    const a = buildMoveExplanationMessages(baseCtx);
    const b = buildMoveExplanationMessages({ ...baseCtx, ply: 99 });
    expect(a.system).toBe(b.system);
    expect(a.system).toContain("NEVER invent");
  });

  it("user message contains engine data block", () => {
    const { user } = buildMoveExplanationMessages(baseCtx);
    expect(user).toContain("ENGINE_DATA:");
    expect(user).toContain("Qh5");
    expect(user).not.toContain("UNTRUSTED");
  });

  it("switches mode for negative classifications", () => {
    const negative = buildMoveExplanationMessages(baseCtx);
    const positive = buildMoveExplanationMessages({
      ...baseCtx,
      classification: "best",
    });
    expect(negative.system).toContain("what went wrong");
    expect(positive.system).toContain("strong move");
  });
});
