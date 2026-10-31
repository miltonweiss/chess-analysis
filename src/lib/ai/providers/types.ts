import type {
  GameSummary,
  MoveExplanation,
  VerifiedGameSummaryContext,
  VerifiedMoveExplanationContext,
} from "@/lib/ai/types";

export type ProviderOptions = {
  signal?: AbortSignal;
  groundingRetry?: {
    violations: string[];
  };
};

export interface ChessExplanationProvider {
  explainMove(
    ctx: VerifiedMoveExplanationContext,
    options?: ProviderOptions,
  ): Promise<MoveExplanation>;

  summarizeGame(
    ctx: VerifiedGameSummaryContext,
    options?: ProviderOptions,
  ): Promise<GameSummary>;
}
