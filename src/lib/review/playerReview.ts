import type { MoveAnalysis } from "@/lib/analysis/types";
import type { PlayerColor } from "@/lib/chess/types";
import { calculatePlayerAccuracy } from "@/lib/review/accuracy";
import {
  DEFAULT_REVIEW_SETTINGS,
  type ReviewSettings,
} from "@/lib/review/settings";
import type { ClassificationCounts, PlayerReview } from "@/lib/review/types";

const EMPTY_COUNTS: ClassificationCounts = {
  brilliant: 0,
  great: 0,
  best: 0,
  excellent: 0,
  good: 0,
  inaccuracy: 0,
  mistake: 0,
  miss: 0,
  blunder: 0,
  forced: 0,
  book: 0,
};

export function buildPlayerReview(
  moveAnalyses: MoveAnalysis[],
  color: PlayerColor,
  settings: ReviewSettings = DEFAULT_REVIEW_SETTINGS,
): PlayerReview {
  const playerMoves = moveAnalyses.filter((move) => move.color === color);
  const counts: ClassificationCounts = { ...EMPTY_COUNTS };

  for (const move of playerMoves) {
    counts[move.classification] += 1;
  }

  const totalLoss = playerMoves.reduce((sum, move) => sum + move.evaluationLoss, 0);

  return {
    accuracy: calculatePlayerAccuracy(moveAnalyses, color, settings),
    averageEvaluationLoss:
      playerMoves.length > 0 ? totalLoss / playerMoves.length : 0,
    counts,
  };
}
