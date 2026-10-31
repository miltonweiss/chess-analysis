import { describe, expect, it } from "vitest";
import {
  gameSummarySchema,
  moveExplanationSchema,
} from "@/lib/ai/schemas/output";

describe("output schemas", () => {
  it("accepts valid move explanation", () => {
    const result = moveExplanationSchema.safeParse({
      headline: "A mistake",
      summary: "The move lost material.",
      whyItMatters: "It allowed a tactic.",
      betterIdea: "Nf3 was better.",
      lesson: "Check tactics.",
      reasonClarity: "supported",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing field", () => {
    const result = moveExplanationSchema.safeParse({
      headline: "A mistake",
      summary: "The move lost material.",
    });
    expect(result.success).toBe(false);
  });

  it("rejects over-length field", () => {
    const result = moveExplanationSchema.safeParse({
      headline: "A mistake",
      summary: "x".repeat(700),
      whyItMatters: "It allowed a tactic.",
      betterIdea: null,
      lesson: "Check tactics.",
      reasonClarity: "supported",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid game summary", () => {
    const result = gameSummarySchema.safeParse({
      headline: "Solid game",
      overview: "Both sides played well.",
      turningPoint: null,
      mainStrength: "Good opening.",
      mainWeakness: "One blunder.",
      keyLesson: "Review key moments.",
    });
    expect(result.success).toBe(true);
  });
});
