import type { EvaluationContext } from "@/lib/analysis/evaluationContext";
import { evaluationToCentipawns } from "@/lib/analysis/evaluation";
import type { PlayerColor } from "@/lib/chess/types";
import type { Evaluation } from "@/lib/engine/types";
import {
  DEFAULT_REVIEW_SETTINGS,
  type ReviewSettings,
} from "@/lib/review/settings";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Convert evaluation to centipawns for win% (mates capped). */
export function evaluationToWinCentipawns(
  evaluation: Evaluation | null,
  context?: EvaluationContext,
  settings: ReviewSettings = DEFAULT_REVIEW_SETTINGS,
): number {
  const cp = evaluationToCentipawns(evaluation, context);

  if (Math.abs(cp) >= 50_000) {
    return cp > 0 ? settings.mateCentipawnCap : -settings.mateCentipawnCap;
  }

  return cp;
}

/** Win probability from White's perspective (0–100). */
export function winPercentWhite(
  evaluation: Evaluation | null,
  context?: EvaluationContext,
  settings: ReviewSettings = DEFAULT_REVIEW_SETTINGS,
): number {
  if (
    context?.terminal === "checkmate" &&
    context.winner
  ) {
    return context.winner === "white" ? 100 : 0;
  }

  if (context?.terminal === "stalemate") {
    return 50;
  }

  const cp = evaluationToWinCentipawns(evaluation, context, settings);
  const raw = 50 + 50 * (2 / (1 + Math.exp(-settings.winPercentSlope * cp)) - 1);
  return clamp(raw, 0, 100);
}

/** Win probability from the given player's perspective. */
export function playerWinPercent(
  evaluation: Evaluation | null,
  color: PlayerColor,
  context?: EvaluationContext,
  settings?: ReviewSettings,
): number {
  const whiteWin = winPercentWhite(evaluation, context, settings);
  return color === "white" ? whiteWin : 100 - whiteWin;
}
