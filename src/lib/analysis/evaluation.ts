import type { EvaluationContext } from "@/lib/analysis/evaluationContext";
import type { PlayerColor } from "@/lib/chess/types";
import type { Evaluation } from "@/lib/engine/types";

/**
 * Large base used to order mate scores above any realistic centipawn value.
 * Mate +N (White mates in N) maps to MATE_BASE - N so shorter mates rank higher.
 */
export const MATE_SCORE_BASE = 100_000;

export type EvaluationComparison = {
  /** Drop in the moving player's advantage, in pawns (never negative). */
  evaluationLoss: number;
  /** Signed change from White's perspective, in centipawn-equivalent units. */
  whiteDeltaCp: number;
};

/**
 * Maps a White-POV evaluation to a sortable centipawn-equivalent value.
 * Higher = better for White.
 */
export function evaluationToCentipawns(
  evaluation: Evaluation | null,
  context?: EvaluationContext,
): number {
  if (!evaluation) {
    return 0;
  }

  if (
    evaluation.type === "mate" &&
    evaluation.value === 0 &&
    context?.terminal === "checkmate" &&
    context.winner
  ) {
    return context.winner === "white" ? MATE_SCORE_BASE : -MATE_SCORE_BASE;
  }

  if (evaluation.type === "cp") {
    return evaluation.value * 100;
  }

  if (evaluation.value === 0) {
    return 0;
  }

  if (evaluation.value > 0) {
    return MATE_SCORE_BASE - evaluation.value;
  }

  return -MATE_SCORE_BASE + Math.abs(evaluation.value);
}

/**
 * Compare before/after evaluations from the moving player's perspective.
 *
 * Convention: all evaluations are White's perspective (+ = White better).
 * White loss  = before - after
 * Black loss  = after - before
 */
export function compareEvaluations(
  before: Evaluation | null,
  after: Evaluation | null,
  playerColor: PlayerColor,
  context?: { before?: EvaluationContext; after?: EvaluationContext },
): EvaluationComparison {
  const beforeCp = evaluationToCentipawns(before, context?.before);
  const afterCp = evaluationToCentipawns(after, context?.after);
  const whiteDeltaCp = afterCp - beforeCp;

  const rawLossCp =
    playerColor === "white" ? beforeCp - afterCp : afterCp - beforeCp;

  return {
    evaluationLoss: Math.max(0, rawLossCp / 100),
    whiteDeltaCp,
  };
}

export function evaluationLoss(
  before: Evaluation | null,
  after: Evaluation | null,
  playerColor: PlayerColor,
  context?: { before?: EvaluationContext; after?: EvaluationContext },
): number {
  return compareEvaluations(before, after, playerColor, context).evaluationLoss;
}
