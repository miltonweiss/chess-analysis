import type { MoveClassification } from "@/lib/analysis/types";
import type { PlayerColor } from "@/lib/chess/types";
import type { Evaluation } from "@/lib/engine/types";

export type ExplanationPerspective = "white" | "black" | "neutral";

export type ReasonClarity = "supported" | "partly_supported" | "unclear";

export type MoveExplanation = {
  headline: string;
  summary: string;
  whyItMatters: string;
  betterIdea: string | null;
  lesson: string;
  reasonClarity: ReasonClarity;
};

export type GameSummary = {
  headline: string;
  overview: string;
  turningPoint: string | null;
  mainStrength: string;
  mainWeakness: string;
  keyLesson: string;
};

export type AiErrorCode =
  | "invalid_request"
  | "payload_too_large"
  | "not_configured"
  | "rate_limited"
  | "provider_error"
  | "provider_timeout"
  | "malformed_output"
  | "ungrounded_output"
  | "aborted";

export type AiResponseMeta = {
  model: string;
  promptVersion: string;
  cached: boolean;
};

export type AiSuccessResponse<T> = {
  ok: true;
  data: T;
  meta: AiResponseMeta;
};

export type AiErrorResponse = {
  ok: false;
  error: {
    code: AiErrorCode;
    message: string;
  };
};

export type AiResponse<T> = AiSuccessResponse<T> | AiErrorResponse;

export type AiStatus = {
  configured: boolean;
  provider: string;
  model: string;
};

/** Raw context sent from client — server re-validates and enriches. */
export type MoveExplanationContextInput = {
  perspective: ExplanationPerspective;
  ply: number;
  moveNumber: number;
  color: PlayerColor;
  playedUci: string;
  bestUci: string | null;
  playedWasBest: boolean;
  isForced: boolean;
  classification: MoveClassification;
  evaluationBefore: Evaluation | null;
  evaluationAfter: Evaluation | null;
  evaluationLoss: number;
  winPercentBefore: number;
  winPercentAfter: number;
  keyMomentType?: string;
  mateKind?: string;
  fenBefore: string;
  fenAfter: string;
  bestLine: string[];
  afterPlayedLine: string[];
  engineDepth: number;
  previousMoves: string[];
  nextMoves: string[];
  terminal?: "checkmate" | "stalemate";
};

/** Verified context with server-derived SAN — used in prompts. */
export type VerifiedMoveExplanationContext = MoveExplanationContextInput & {
  playedSan: string;
  bestSan: string | null;
  bestLineSan: string[];
  afterPlayedLineSan: string[];
  previousMovesSan: string[];
  nextMovesSan: string[];
  evalBeforeDisplay: string;
  evalAfterDisplay: string;
};

export type GameSummaryKeyMomentInput = {
  ply: number;
  moveNumber: number;
  color: PlayerColor;
  playedUci: string;
  fenBefore: string;
  type: string;
  classification: MoveClassification;
  evaluationBefore: Evaluation | null;
  evaluationAfter: Evaluation | null;
  evaluationSwing: number;
};

export type GameSummaryMoveLookup = {
  ply: number;
  fenBefore: string;
  playedUci: string;
};

export type GameSummaryContextInput = {
  perspective: ExplanationPerspective;
  result: string;
  moveCount: number;
  analysisDepth: number;
  whiteAccuracy: number;
  blackAccuracy: number;
  whiteCounts: Record<string, number>;
  blackCounts: Record<string, number>;
  keyMoments: GameSummaryKeyMomentInput[];
  biggestMistakePly?: number;
  biggestMissedOpportunityPly?: number;
  bestMovePly?: number;
  winPercentTrajectory: { ply: number; winPercent: number }[];
  untrustedOpening?: string;
};

export type VerifiedGameSummaryContext = GameSummaryContextInput & {
  keyMomentsSan: Array<
    GameSummaryKeyMomentInput & { playedSan: string }
  >;
  biggestMistakeSan?: string;
  biggestMissedOpportunitySan?: string;
  bestMoveSan?: string;
};
