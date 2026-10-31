/** Configurable review model constants (inspired by Lichess published formulas). */
export type ReviewSettings = {
  /** Sigmoid slope for centipawn → win% mapping. */
  winPercentSlope: number;
  /** Accuracy exponential coefficients. */
  accuracyA: number;
  accuracyK: number;
  accuracyB: number;
  /** Added to each move accuracy before clamping. */
  uncertaintyBonus: number;
  /** Mate scores map to ±this many centipawns before win% step. */
  mateCentipawnCap: number;
  /** Sliding window size bounds for game accuracy aggregation. */
  windowMin: number;
  windowMax: number;
  /** Volatility weight clamp for window stddev. */
  weightMin: number;
  weightMax: number;
  /** Key moment thresholds (win% points, mover perspective). */
  blunderWinDrop: number;
  missedWinBefore: number;
  missedWinDrop: number;
  missedWinAfterMax: number;
  turningPointSwing: number;
  /** Heuristic for biggest missed opportunity. */
  missedOpportunityMinWin: number;
  /** Heuristic for "best move" in critical positions. */
  bestMoveWinMin: number;
  bestMoveWinMax: number;
};

export const DEFAULT_REVIEW_SETTINGS: ReviewSettings = {
  winPercentSlope: 0.00368208,
  accuracyA: 103.1668100711649,
  accuracyK: 0.04354415386753951,
  accuracyB: -3.166924740191411,
  uncertaintyBonus: 1,
  mateCentipawnCap: 10_000,
  windowMin: 2,
  windowMax: 8,
  weightMin: 0.5,
  weightMax: 12,
  blunderWinDrop: 20,
  missedWinBefore: 75,
  missedWinDrop: 15,
  missedWinAfterMax: 65,
  turningPointSwing: 15,
  missedOpportunityMinWin: 65,
  bestMoveWinMin: 35,
  bestMoveWinMax: 65,
};
