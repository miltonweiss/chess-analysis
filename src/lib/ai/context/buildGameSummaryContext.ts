import type {
  ExplanationPerspective,
  GameSummaryContextInput,
  GameSummaryMoveLookup,
} from "@/lib/ai/types";
import type { ChessMove } from "@/lib/chess/types";
import type { GameReview } from "@/lib/review/types";
import { sanitizeUntrustedText } from "@/lib/ai/context/chessVerify";

function sampleTrajectory(
  timeline: GameReview["evaluationTimeline"],
  maxPoints = 12,
): { ply: number; winPercent: number }[] {
  if (timeline.length <= maxPoints) {
    return timeline.map((p) => ({ ply: p.ply, winPercent: p.winPercent }));
  }

  const step = Math.ceil(timeline.length / maxPoints);
  const sampled: { ply: number; winPercent: number }[] = [];
  for (let i = 0; i < timeline.length; i += step) {
    sampled.push({
      ply: timeline[i]!.ply,
      winPercent: timeline[i]!.winPercent,
    });
  }
  const last = timeline[timeline.length - 1]!;
  if (sampled[sampled.length - 1]?.ply !== last.ply) {
    sampled.push({ ply: last.ply, winPercent: last.winPercent });
  }
  return sampled.slice(0, maxPoints);
}

export function buildGameSummaryContext(
  review: GameReview,
  moves: ChessMove[],
  perspective: ExplanationPerspective,
): GameSummaryContextInput {
  const moveByPly = new Map(moves.map((m) => [m.ply, m]));
  return {
    perspective,
    result: review.resultSummary ?? "*",
    moveCount: review.moveAnalyses.length,
    analysisDepth: review.settings.depth,
    whiteAccuracy: review.white.accuracy.score,
    blackAccuracy: review.black.accuracy.score,
    whiteCounts: review.white.counts as unknown as Record<string, number>,
    blackCounts: review.black.counts as unknown as Record<string, number>,
    keyMoments: review.keyMoments.slice(0, 6).map((km) => ({
      ply: km.ply,
      moveNumber: km.moveNumber,
      color: km.color,
      playedUci:
        review.moveAnalyses.find((m) => m.ply === km.ply)?.playedMoveUci ?? "",
      fenBefore: moveByPly.get(km.ply)?.fenBefore ?? "",
      type: km.type,
      classification: km.classification,
      evaluationBefore: km.evaluationBefore,
      evaluationAfter: km.evaluationAfter,
      evaluationSwing: km.evaluationSwing,
    })),
    biggestMistakePly: review.biggestMistake?.ply,
    biggestMissedOpportunityPly: review.biggestMissedOpportunity?.ply,
    bestMovePly: review.bestMove?.ply,
    winPercentTrajectory: sampleTrajectory(review.evaluationTimeline),
    untrustedOpening: review.metadata.opening
      ? sanitizeUntrustedText(review.metadata.opening)
      : undefined,
  };
}

export function buildGameSummaryMoveLookup(moves: ChessMove[]): GameSummaryMoveLookup[] {
  return moves.map((m) => ({
    ply: m.ply,
    fenBefore: m.fenBefore,
    playedUci: m.uci,
  }));
}
