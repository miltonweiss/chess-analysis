import type { MoveAnalysis } from "@/lib/analysis/types";
import { evaluationContextFromEngine } from "@/lib/analysis/evaluationContext";
import type { ChessMove } from "@/lib/chess/types";
import type {
  ExplanationPerspective,
  MoveExplanationContextInput,
} from "@/lib/ai/types";
import type { GameReview } from "@/lib/review/types";
import { playerWinPercent } from "@/lib/review/winProbability";

const MAX_LINE = 6;
const MAX_PREV = 4;
const MAX_NEXT = 3;

export function buildMoveExplanationContext(
  review: GameReview,
  moveAnalysis: MoveAnalysis,
  moves: ChessMove[],
  perspective: ExplanationPerspective,
): MoveExplanationContextInput | null {
  const move = moves.find((m) => m.ply === moveAnalysis.ply);
  if (!move) {
    return null;
  }

  const beforeContext = evaluationContextFromEngine(moveAnalysis.engineBefore);
  const afterContext = evaluationContextFromEngine(moveAnalysis.engineAfter);

  const winBefore = playerWinPercent(
    moveAnalysis.evaluationBefore,
    moveAnalysis.color,
    beforeContext,
  );
  const winAfter = playerWinPercent(
    moveAnalysis.evaluationAfter,
    moveAnalysis.color,
    afterContext,
  );

  const keyMoment = review.keyMoments.find((km) => km.ply === moveAnalysis.ply);

  const moveIndex = moves.findIndex((m) => m.ply === moveAnalysis.ply);
  const previousMoves = moves
    .slice(Math.max(0, moveIndex - MAX_PREV), moveIndex)
    .map((m) => m.uci);
  const nextMoves = moves
    .slice(moveIndex + 1, moveIndex + 1 + MAX_NEXT)
    .map((m) => m.uci);

  return {
    perspective,
    ply: moveAnalysis.ply,
    moveNumber: moveAnalysis.moveNumber,
    color: moveAnalysis.color,
    playedUci: moveAnalysis.playedMoveUci,
    bestUci: moveAnalysis.bestMove ?? null,
    playedWasBest: moveAnalysis.playedBestMove,
    isForced: moveAnalysis.isForced,
    classification: moveAnalysis.classification,
    evaluationBefore: moveAnalysis.evaluationBefore,
    evaluationAfter: moveAnalysis.evaluationAfter,
    evaluationLoss: moveAnalysis.evaluationLoss,
    winPercentBefore: winBefore,
    winPercentAfter: winAfter,
    keyMomentType: keyMoment?.type,
    mateKind: keyMoment?.mateKind,
    fenBefore: move.fenBefore,
    fenAfter: move.fenAfter,
    bestLine: (moveAnalysis.principalVariation ?? []).slice(0, MAX_LINE),
    afterPlayedLine: (moveAnalysis.engineAfter?.principalVariation ?? []).slice(
      0,
      MAX_LINE,
    ),
    engineDepth: moveAnalysis.engineBefore?.depth ?? review.settings.depth,
    previousMoves,
    nextMoves,
    terminal: moveAnalysis.engineAfter?.terminal,
  };
}
