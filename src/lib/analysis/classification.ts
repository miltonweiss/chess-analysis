import { Chess, type Square } from "chess.js";
import type { PlayerColor } from "@/lib/chess/types";
import type { MoveClassification } from "@/lib/analysis/types";
import {
  BEST_MOVE_MAX_LOSS,
  DEFAULT_CLASSIFICATION_THRESHOLDS,
  ENGINE_EQUIVALENT_MAX_LOSS,
  type ClassificationThresholds,
} from "@/lib/analysis/settings";
import { evaluationLoss } from "@/lib/analysis/evaluation";
import { uciMovesMatch } from "@/lib/analysis/uciToSan";
import type { Evaluation } from "@/lib/engine/types";
import { playerWinPercent } from "@/lib/review/winProbability";

export type ClassifyMoveAlternativeLine = {
  bestMoveUci: string | null;
  evaluation: Evaluation | null;
};

export type ClassifyMoveInput = {
  playerColor: PlayerColor;
  evaluationBefore: Evaluation | null;
  evaluationAfter: Evaluation | null;
  playedMoveUci: string;
  bestMoveUci: string | null;
  alternativeLines?: ClassifyMoveAlternativeLine[];
  isForced?: boolean;
  thresholds?: ClassificationThresholds;
  fenBefore?: string;
  fenAfter?: string;
};

const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

function isEquivalentTopMove(input: ClassifyMoveInput): boolean {
  const topEval = input.evaluationBefore;
  if (!topEval || !input.alternativeLines?.length) {
    return false;
  }

  for (const line of input.alternativeLines) {
    if (!line.bestMoveUci || !line.evaluation) {
      continue;
    }
    if (!uciMovesMatch(input.playedMoveUci, line.bestMoveUci)) {
      continue;
    }

    const gap = evaluationLoss(topEval, line.evaluation, input.playerColor);
    if (gap <= ENGINE_EQUIVALENT_MAX_LOSS) {
      return true;
    }
  }

  return false;
}

/**
 * Checks whether the played move involves a sacrifice:
 * a non-pawn piece moved to a square where it can be captured by the opponent,
 * or a piece capture where the capturing piece is more valuable than what was taken
 * and is immediately attacked by a lower/equal piece.
 */
function isSacrificeMove(
  fenBefore: string,
  playedMoveUci: string,
  playerColor: PlayerColor,
): boolean {
  try {
    const chess = new Chess(fenBefore);
    const from = playedMoveUci.slice(0, 2) as Square;
    const to = playedMoveUci.slice(2, 4) as Square;
    const promotion = playedMoveUci[4] as "q" | "r" | "b" | "n" | undefined;

    const pieceBefore = chess.get(from);
    if (!pieceBefore) {
      return false;
    }

    // Pawn pushes are not sacrifices unless promoting into immediate capture of higher value
    const pieceVal = PIECE_VALUES[pieceBefore.type] ?? 0;
    const targetPieceBefore = chess.get(to);
    const targetVal = targetPieceBefore ? PIECE_VALUES[targetPieceBefore.type] ?? 0 : 0;

    const moveRes = chess.move({ from, to, promotion });
    if (!moveRes) {
      return false;
    }

    const opponentColor = playerColor === "white" ? "b" : "w";

    // Can opponent attack the destination square?
    // chess.attackers returns squares of pieces attacking `to`
    const enemyAttackers = chess.attackers(to, opponentColor);
    if (!enemyAttackers || enemyAttackers.length === 0) {
      return false;
    }

    // Find the min value among enemy attackers
    let minEnemyAttackerVal = 999;
    for (const sq of enemyAttackers) {
      const p = chess.get(sq);
      if (p) {
        const v = PIECE_VALUES[p.type] ?? 0;
        if (v < minEnemyAttackerVal) {
          minEnemyAttackerVal = v;
        }
      }
    }

    // Material left exposed on destination
    const movedVal = promotion ? PIECE_VALUES[promotion] ?? 9 : pieceVal;
    if (movedVal >= 3 && targetVal < movedVal && minEnemyAttackerVal <= movedVal) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Brilliant:
 * - Best move (or <= BEST_MOVE_MAX_LOSS)
 * - Sacrifices material on destination square
 * - Player still stands at least roughly equal afterwards (win% >= 45%)
 * - Position wasn't already a blowout before (win% < 92%)
 */
function isBrilliantMove(input: ClassifyMoveInput, isTopChoice: boolean): boolean {
  if (!isTopChoice || !input.fenBefore) {
    return false;
  }

  const winBefore = playerWinPercent(input.evaluationBefore, input.playerColor);
  const winAfter = playerWinPercent(input.evaluationAfter, input.playerColor);

  if (winBefore >= 92 || winAfter < 45) {
    return false;
  }

  return isSacrificeMove(input.fenBefore, input.playedMoveUci, input.playerColor);
}

/**
 * Great:
 * - Played move is the top choice (or equivalent)
 * - The second-best alternative line drops win% by at least 10%
 * - Position wasn't already a total blowout (win% before < 95%)
 */
function isGreatMove(input: ClassifyMoveInput, isTopChoice: boolean): boolean {
  if (!isTopChoice) {
    return false;
  }

  const lines = input.alternativeLines;
  if (!lines || lines.length < 2) {
    return false;
  }

  // Find second best line that isn't the played move
  const secondLine = lines.find(
    (line) => line.bestMoveUci && !uciMovesMatch(input.playedMoveUci, line.bestMoveUci),
  );
  if (!secondLine || !secondLine.evaluation) {
    return false;
  }

  const topWin = playerWinPercent(input.evaluationBefore, input.playerColor);
  const secondWin = playerWinPercent(secondLine.evaluation, input.playerColor);

  if (topWin >= 95) {
    return false;
  }

  return topWin - secondWin >= 10;
}

export function classifyMove(input: ClassifyMoveInput): MoveClassification {
  const thresholds = input.thresholds ?? DEFAULT_CLASSIFICATION_THRESHOLDS;

  if (input.isForced) {
    return "forced";
  }

  const matchesTop = Boolean(
    input.bestMoveUci && uciMovesMatch(input.playedMoveUci, input.bestMoveUci),
  );
  const isEquivalent = isEquivalentTopMove(input);

  const loss = evaluationLoss(
    input.evaluationBefore,
    input.evaluationAfter,
    input.playerColor,
  );

  const isTopChoice = matchesTop || isEquivalent || loss <= BEST_MOVE_MAX_LOSS;

  if (isTopChoice) {
    if (isBrilliantMove(input, true)) {
      return "brilliant";
    }
    if (isGreatMove(input, true)) {
      return "great";
    }
    return "best";
  }

  if (loss <= ENGINE_EQUIVALENT_MAX_LOSS) {
    return "excellent";
  }

  if (loss <= thresholds.excellentMaxLoss) {
    return "excellent";
  }

  if (loss <= thresholds.goodMaxLoss) {
    return "good";
  }

  if (loss <= thresholds.inaccuracyMaxLoss) {
    return "inaccuracy";
  }

  if (loss <= thresholds.mistakeMaxLoss) {
    return "mistake";
  }

  return "blunder";
}

export function classificationLabel(classification: MoveClassification): string {
  switch (classification) {
    case "brilliant":
      return "Brilliant";
    case "great":
      return "Great";
    case "best":
      return "Best";
    case "excellent":
      return "Excellent";
    case "good":
      return "Good";
    case "inaccuracy":
      return "Inaccuracy";
    case "mistake":
      return "Mistake";
    case "miss":
      return "Miss";
    case "blunder":
      return "Blunder";
    case "forced":
      return "Forced";
    case "book":
      return "Book";
    default:
      return classification;
  }
}
