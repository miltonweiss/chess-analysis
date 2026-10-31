import type { GameAnalysis } from "@/lib/analysis/types";
import type { AnalysisVersion } from "@/lib/analysis/version";
import type { GameMetadata } from "@/lib/chess/types";
import { buildGameReview } from "@/lib/review/review";
import type { AnalysisSummary } from "@/lib/games/types";

export function buildAnalysisSummary(
  analysis: GameAnalysis,
  metadata: GameMetadata,
  version: AnalysisVersion,
  analyzedAt: number,
): AnalysisSummary {
  const review = buildGameReview(metadata, analysis);

  return {
    whiteAccuracy: review.white.accuracy.score,
    blackAccuracy: review.black.accuracy.score,
    whiteCounts: review.white.counts,
    blackCounts: review.black.counts,
    analyzedAt,
    version,
  };
}
