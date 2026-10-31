import type { VerifiedMoveExplanationContext } from "@/lib/ai/types";
import {
  perspectiveInstruction,
  SHARED_SYSTEM_RULES,
} from "@/lib/ai/prompts/shared";

export const MOVE_EXPLANATION_PROMPT_VERSION = "v1";

const NEGATIVE_CLASSIFICATIONS = new Set(["inaccuracy", "mistake", "miss", "blunder"]);

export function buildMoveExplanationMessages(ctx: VerifiedMoveExplanationContext): {
  system: string;
  user: string;
} {
  const isNegative = NEGATIVE_CLASSIFICATIONS.has(ctx.classification);
  const mode = isNegative
    ? "Explain what went wrong with this move."
    : "Explain why this was a strong move.";

  const system = `${SHARED_SYSTEM_RULES}\n\n${perspectiveInstruction(ctx.perspective)}\n\n${mode}`;

  const engineData = {
    mover: ctx.color,
    moveNumber: ctx.moveNumber,
    ply: ctx.ply,
    playedMove: ctx.playedSan,
    bestMove: ctx.bestSan,
    playedWasBest: ctx.playedWasBest,
    isForced: ctx.isForced,
    classification: ctx.classification,
    evaluationBefore: ctx.evalBeforeDisplay,
    evaluationAfter: ctx.evalAfterDisplay,
    evaluationLoss: ctx.evaluationLoss,
    winPercentBefore: ctx.winPercentBefore,
    winPercentAfter: ctx.winPercentAfter,
    engineDepth: ctx.engineDepth,
    bestLine: ctx.bestLineSan.join(" "),
    afterPlayedLine: ctx.afterPlayedLineSan.join(" "),
    fenBefore: ctx.fenBefore,
    fenAfter: ctx.fenAfter,
    previousMoves: ctx.previousMovesSan.join(" "),
    nextMoves: ctx.nextMovesSan.join(" "),
    terminal: ctx.terminal ?? null,
    keyMomentType: ctx.keyMomentType ?? null,
    mateKind: ctx.mateKind ?? null,
  };

  const user = `ENGINE_DATA:
${JSON.stringify(engineData, null, 2)}

Explain this move based ONLY on the engine data above.`;

  return { system, user };
}
