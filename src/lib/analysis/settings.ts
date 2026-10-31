/** Evaluation loss thresholds in pawns (1 pawn = 100 centipawns). */
export type ClassificationThresholds = {
  /** Loss at or below this is "excellent" when not the engine top move. */
  excellentMaxLoss: number;
  goodMaxLoss: number;
  inaccuracyMaxLoss: number;
  mistakeMaxLoss: number;
};

/**
 * Default thresholds inspired by common online platforms (Chess.com / Lichess
 * centipawn-loss buckets) but simplified for a transparent MVP classifier.
 * All values are configurable — see docs/analysis-model.md.
 */
export const DEFAULT_CLASSIFICATION_THRESHOLDS: ClassificationThresholds = {
  excellentMaxLoss: 0.1,
  goodMaxLoss: 0.25,
  inaccuracyMaxLoss: 0.5,
  mistakeMaxLoss: 1.0,
};

/** Treat at-or-below this loss (pawns) as engine-equivalent to the top move. */
export const ENGINE_EQUIVALENT_MAX_LOSS = 0.05;

/** Treat at-or-below this loss (pawns) as "best" when the played move matches top move. */
export const BEST_MOVE_MAX_LOSS = 0.01;
