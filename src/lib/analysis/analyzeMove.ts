import { classifyMove } from "@/lib/analysis/classification";
import { evaluationLoss } from "@/lib/analysis/evaluation";
import { mergeEvaluationContext } from "@/lib/analysis/evaluationContext";
import { isForcedPosition } from "@/lib/analysis/forcedMove";
import type { MoveAnalysis } from "@/lib/analysis/types";
import { uciMovesMatch, uciToSan } from "@/lib/analysis/uciToSan";
import type { ChessMove } from "@/lib/chess/types";
import type { EngineAnalysis } from "@/lib/engine/types";
import type { ClassificationThresholds } from "@/lib/analysis/settings";

export type BuildMoveAnalysisInput = {
  move: ChessMove;
  engineBefore: EngineAnalysis;
  engineAfter: EngineAnalysis;
  thresholds?: ClassificationThresholds;
};

export function buildMoveAnalysis(input: BuildMoveAnalysisInput): MoveAnalysis {
  const { move, engineBefore, engineAfter } = input;
  const evaluationBefore = engineBefore.evaluation;
  const evaluationAfter = engineAfter.evaluation;
  const bestMove = engineBefore.bestMove ?? undefined;
  const bestMoveSan =
    bestMove !== undefined ? uciToSan(move.fenBefore, bestMove) ?? undefined : undefined;
  const forced = isForcedPosition(move.fenBefore);
  const playedBestMove = bestMove ? uciMovesMatch(move.uci, bestMove) : false;

  const evalContext = mergeEvaluationContext(engineBefore, engineAfter);

  const classification = classifyMove({
    playerColor: move.color,
    evaluationBefore,
    evaluationAfter,
    playedMoveUci: move.uci,
    bestMoveUci: bestMove ?? null,
    alternativeLines: (engineBefore.lines ?? []).map((line) => ({
      bestMoveUci: line.bestMove,
      evaluation: line.evaluation,
    })),
    isForced: forced,
    thresholds: input.thresholds,
    fenBefore: move.fenBefore,
    fenAfter: move.fenAfter,
  });

  return {
    ply: move.ply,
    moveNumber: move.moveNumber,
    color: move.color,
    playedMove: move.san,
    playedMoveUci: move.uci,
    bestMove,
    bestMoveSan,
    evaluationBefore,
    evaluationAfter,
    evaluationLoss: evaluationLoss(
      evaluationBefore,
      evaluationAfter,
      move.color,
      evalContext,
    ),
    classification,
    engineBefore,
    engineAfter,
    principalVariation: engineBefore.principalVariation,
    playedBestMove,
    isForced: forced,
  };
}
