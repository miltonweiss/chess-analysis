import type { VerifiedGameSummaryContext } from "@/lib/ai/types";
import {
  perspectiveInstruction,
  SHARED_SYSTEM_RULES,
} from "@/lib/ai/prompts/shared";
import { formatEvaluation } from "@/lib/engine/uci";

export const GAME_SUMMARY_PROMPT_VERSION = "v1";

export function buildGameSummaryMessages(ctx: VerifiedGameSummaryContext): {
  system: string;
  user: string;
} {
  const system = `${SHARED_SYSTEM_RULES}\n\n${perspectiveInstruction(ctx.perspective)}\n\nSummarize this chess game based on the objective analysis data provided.`;

  const gameData = {
    result: ctx.result,
    moveCount: ctx.moveCount,
    analysisDepth: ctx.analysisDepth,
    whiteAccuracy: ctx.whiteAccuracy,
    blackAccuracy: ctx.blackAccuracy,
    whiteCounts: ctx.whiteCounts,
    blackCounts: ctx.blackCounts,
    keyMoments: ctx.keyMomentsSan.map((km) => ({
      move: `${km.color === "white" ? km.moveNumber + "." : km.moveNumber + "..."} ${km.playedSan}`,
      type: km.type,
      classification: km.classification,
      evalBefore: formatEvaluation(km.evaluationBefore),
      evalAfter: formatEvaluation(km.evaluationAfter),
      swing: km.evaluationSwing,
    })),
    biggestMistake: ctx.biggestMistakeSan ?? null,
    biggestMissedOpportunity: ctx.biggestMissedOpportunitySan ?? null,
    bestMove: ctx.bestMoveSan ?? null,
    winPercentTrajectory: ctx.winPercentTrajectory,
  };

  let user = `GAME_DATA:
${JSON.stringify(gameData, null, 2)}`;

  if (ctx.untrustedOpening) {
    user += `\n\nUNTRUSTED_GAME_DATA:
${JSON.stringify({ opening: ctx.untrustedOpening })}`;
  }

  user += "\n\nSummarize this game based ONLY on the data above.";

  return { system, user };
}
