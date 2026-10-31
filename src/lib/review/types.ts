import type { MoveAnalysis, MoveClassification } from "@/lib/analysis/types";
import type { GameMetadata, PlayerColor } from "@/lib/chess/types";
import type { AnalysisSettings } from "@/lib/engine/settings";
import type { Evaluation } from "@/lib/engine/types";

export type ClassificationCounts = Record<MoveClassification, number>;

export type PlayerAccuracy = {
  score: number;
  moveCount: number;
  /** True when no moves were analyzed for this player. */
  isEmpty: boolean;
};

export type PlayerReview = {
  accuracy: PlayerAccuracy;
  averageEvaluationLoss: number;
  counts: ClassificationCounts;
};

export type KeyMomentType = "blunder" | "missed-win" | "turning-point" | "mate";

export type MateKind = "missed" | "allowed";

export type KeyMoment = {
  ply: number;
  moveNumber: number;
  color: PlayerColor;
  type: KeyMomentType;
  mateKind?: MateKind;
  evaluationBefore: Evaluation | null;
  evaluationAfter: Evaluation | null;
  /** Win% swing from the mover's perspective (positive = lost chances). */
  evaluationSwing: number;
  classification: MoveClassification;
  playedMove: string;
};

export type EvaluationPoint = {
  ply: number;
  moveNumber: number;
  evaluation: Evaluation | null;
  terminal?: "checkmate" | "stalemate";
  winner?: PlayerColor;
  /** Win% from White's perspective for graphing. */
  winPercent: number;
};

export type GameReviewOpening = {
  eco: string;
  name: string;
};

export type GameReview = {
  metadata: GameMetadata;
  opening?: GameReviewOpening;
  resultSummary?: string;
  moveAnalyses: MoveAnalysis[];
  settings: AnalysisSettings;
  white: PlayerReview;
  black: PlayerReview;
  keyMoments: KeyMoment[];
  evaluationTimeline: EvaluationPoint[];
  biggestMistake?: MoveAnalysis;
  biggestMissedOpportunity?: MoveAnalysis;
  bestMove?: MoveAnalysis;
  biggestSwing?: KeyMoment;
  higherAccuracy?: PlayerColor;
};
