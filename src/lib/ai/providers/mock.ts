import type { ChessExplanationProvider } from "@/lib/ai/providers/types";
import type {
  GameSummary,
  MoveExplanation,
  VerifiedGameSummaryContext,
  VerifiedMoveExplanationContext,
} from "@/lib/ai/types";

export class MockProvider implements ChessExplanationProvider {
  async explainMove(
    ctx: VerifiedMoveExplanationContext,
  ): Promise<MoveExplanation> {
    const isNegative = ["inaccuracy", "mistake", "miss", "blunder"].includes(
      ctx.classification,
    );

    return {
      headline: isNegative
        ? `Why ${ctx.playedSan} was a ${ctx.classification}`
        : `${ctx.playedSan} was a strong move`,
      summary: isNegative
        ? `${ctx.playedSan} allowed the evaluation to drop from ${ctx.evalBeforeDisplay} to ${ctx.evalAfterDisplay}.`
        : `${ctx.playedSan} maintained or improved the position at ${ctx.evalAfterDisplay}.`,
      whyItMatters: ctx.bestSan
        ? `The engine preferred ${ctx.bestSan} with line ${ctx.bestLineSan.join(" ")}.`
        : "The engine line supports this assessment.",
      betterIdea: ctx.bestSan && !ctx.playedWasBest ? ctx.bestSan : null,
      lesson: isNegative
        ? "Check forcing moves before committing to a move."
        : "Maintaining piece activity is key in this type of position.",
      reasonClarity: "supported",
    };
  }

  async summarizeGame(
    ctx: VerifiedGameSummaryContext,
  ): Promise<GameSummary> {
    return {
      headline: `Game review: ${ctx.result}`,
      overview: `A ${ctx.moveCount}-move game with White at ${ctx.whiteAccuracy.toFixed(1)}% accuracy and Black at ${ctx.blackAccuracy.toFixed(1)}%.`,
      turningPoint:
        ctx.keyMomentsSan.length > 0
          ? `The critical moment was ${ctx.keyMomentsSan[0]!.playedSan}.`
          : null,
      mainStrength: "Solid opening play from both sides.",
      mainWeakness: ctx.biggestMistakeSan
        ? `The biggest mistake was ${ctx.biggestMistakeSan}.`
        : "No major mistakes detected.",
      keyLesson: "Review key moments to understand where the game changed.",
    };
  }
}
