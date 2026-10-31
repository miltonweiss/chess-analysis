import type { PlayerColor } from "@/lib/chess/types";
import type { AnalysisSettings } from "@/lib/engine/settings";

export type EngineStatus =
  | "idle"
  | "initializing"
  | "ready"
  | "analyzing"
  | "error"
  | "destroyed";

/** Raw UCI score: centipawns or mate-in-N, relative to side to move. */
export type UciScore =
  | { type: "cp"; value: number }
  | { type: "mate"; value: number };

/** Normalized evaluation: White's perspective, pawns or mate-in-N. */
export type Evaluation =
  | { type: "cp"; value: number }
  | { type: "mate"; value: number };

export type EngineInfo = {
  depth: number;
  seldepth?: number;
  multipv: number;
  score?: UciScore;
  hasBound?: boolean;
  nodes?: number;
  nps?: number;
  timeMs?: number;
  pv: string[];
};

export type EngineSearchLine = {
  bestMove: string | null;
  principalVariation: string[];
  score: UciScore | null;
  depth: number;
};

/** Raw result returned by StockfishEngine.analyze before normalization. */
export type EngineSearchResult = {
  fen: string;
  bestMove: string | null;
  ponder?: string;
  depth: number;
  score: UciScore | null;
  principalVariation: string[];
  lines: EngineSearchLine[];
  nodes?: number;
  timeMs?: number;
};

export type EngineAnalysisLine = {
  evaluation: Evaluation | null;
  bestMove: string | null;
  principalVariation: string[];
  depth: number;
};

/** Public analysis result used by UI, cache, and future move analysis. */
export type EngineAnalysis = {
  fen: string;
  depth: number;
  evaluation: Evaluation | null;
  bestMove: string | null;
  principalVariation: string[];
  /** Additional principal variations when MultiPV > 1. */
  lines: EngineAnalysisLine[];
  nodes?: number;
  timeMs?: number;
  settings: AnalysisSettings;
  source: "engine" | "cache" | "terminal";
  terminal?: "checkmate" | "stalemate";
  /** Set when terminal is checkmate — the side that delivered mate. */
  winner?: PlayerColor;
};

export type AnalysisProgress = {
  depth: number;
  evaluation: Evaluation | null;
  principalVariation: string[];
};

export type EngineOptions = {
  depth?: number;
  movetime?: number;
  multipv?: number;
  signal?: AbortSignal;
};

export type EngineIdentity = {
  name: string;
  author?: string;
};

export interface ChessEngine {
  readonly status: EngineStatus;
  initialize(): Promise<EngineIdentity>;
  analyze(
    fen: string,
    options?: EngineOptions,
    onProgress?: (progress: AnalysisProgress) => void,
  ): Promise<EngineSearchResult>;
  stop(): void;
  destroy(): void;
  subscribe(listener: (status: EngineStatus) => void): () => void;
}

export type AnalysisState =
  | { type: "idle" }
  | { type: "analyzing"; fen: string }
  | { type: "complete"; result: EngineAnalysis }
  | { type: "error"; message: string };

export class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EngineError";
  }
}

export class EngineAbortedError extends Error {
  constructor(message = "Analysis aborted") {
    super(message);
    this.name = "EngineAbortedError";
  }
}

/** @deprecated Use UciScore */
export type Score = UciScore;
