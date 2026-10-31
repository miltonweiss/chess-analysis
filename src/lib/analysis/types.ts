import type { PlayerColor } from "@/lib/chess/types";
import type { AnalysisSettings } from "@/lib/engine/settings";
import type { EngineAnalysis, Evaluation } from "@/lib/engine/types";

/** Engine-quality classification. "book" is reserved for future opening metadata. */
export type MoveClassification =
  | "brilliant"
  | "great"
  | "best"
  | "excellent"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "miss"
  | "blunder"
  | "forced"
  | "book";

export type MoveAnalysis = {
  ply: number;
  moveNumber: number;
  color: PlayerColor;

  playedMove: string;
  playedMoveUci: string;

  bestMove?: string;
  bestMoveSan?: string;

  evaluationBefore: Evaluation | null;
  evaluationAfter: Evaluation | null;
  evaluationLoss: number;

  classification: MoveClassification;

  engineBefore?: EngineAnalysis;
  engineAfter?: EngineAnalysis;
  principalVariation?: string[];

  /** True when the played move matches the engine's top choice. */
  playedBestMove: boolean;
  /** True when only one legal move existed before the played move. */
  isForced: boolean;

  /** Reserved for a future opening book layer — not set in Phase 4. */
  openingMetadata?: undefined;
};

export type GameOpening = {
  eco: string;
  name: string;
};

export type GameAnalysis = {
  moves: MoveAnalysis[];
  settings: AnalysisSettings;
  opening?: GameOpening;
};

export type GameAnalysisProgress = {
  /** Completed unique positions analyzed (0..total). */
  current: number;
  /** Total unique positions = moves.length + 1. */
  total: number;
  currentPly: number;
  currentColor: PlayerColor;
  /** Current move index being processed (1-based for display). */
  currentMove: number;
  moveCount: number;
  engineDepth?: number;
};

export type GameAnalysisState =
  | { type: "idle" }
  | { type: "analyzing"; progress: GameAnalysisProgress }
  | { type: "complete"; result: GameAnalysis }
  | { type: "cancelled" }
  | { type: "error"; message: string };

export class GameAnalysisAbortedError extends Error {
  constructor(message = "Game analysis aborted") {
    super(message);
    this.name = "GameAnalysisAbortedError";
  }
}
