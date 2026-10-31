import { describe, expect, it } from "vitest";
import { buildAllowedMoves, checkGrounding, extractMoveTokens } from "@/lib/ai/grounding";

describe("grounding", () => {
  it("extracts piece moves from text", () => {
    const tokens = extractMoveTokens("Nf3 is better than Qh5 which hangs the queen.");
    expect(tokens).toContain("Nf3");
    expect(tokens).toContain("Qh5");
  });

  it("ignores bare square names", () => {
    const tokens = extractMoveTokens("The pawn on e4 is weak.");
    expect(tokens).not.toContain("e4");
  });

  it("passes when all moves are allowed", () => {
    const allowed = buildAllowedMoves({
      playedSan: "Qh5",
      bestSan: "Nf3",
      bestLineSan: ["Nf3", "d6"],
      afterPlayedLineSan: ["Qh5", "Nf3"],
      previousMovesSan: ["e4"],
      nextMovesSan: [],
    });

    const result = checkGrounding(
      {
        headline: "A mistake",
        summary: "Qh5 allowed Nf3.",
        whyItMatters: "After Qh5, Nf3 wins material.",
        betterIdea: "Nf3 keeps control.",
        lesson: "Check forcing moves.",
        reasonClarity: "supported",
      },
      allowed,
    );

    expect(result.ok).toBe(true);
  });

  it("fails when inventing a move", () => {
    const allowed = buildAllowedMoves({
      playedSan: "Qh5",
      bestSan: "Nf3",
      bestLineSan: ["Nf3"],
      afterPlayedLineSan: [],
      previousMovesSan: [],
      nextMovesSan: [],
    });

    const result = checkGrounding(
      {
        headline: "Bad",
        summary: "Rxh7 wins.",
        whyItMatters: "Rxh7 is winning.",
        betterIdea: null,
        lesson: "Look for tactics.",
        reasonClarity: "supported",
      },
      allowed,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations).toContain("Rxh7");
    }
  });
});
