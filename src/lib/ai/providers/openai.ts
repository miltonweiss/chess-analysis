import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ChessExplanationProvider, ProviderOptions } from "@/lib/ai/providers/types";
import type { AiConfig } from "@/lib/ai/config";
import { AiError } from "@/lib/ai/errors";
import {
  buildMoveExplanationMessages,
  MOVE_EXPLANATION_PROMPT_VERSION,
} from "@/lib/ai/prompts/move-explanation";
import {
  buildGameSummaryMessages,
  GAME_SUMMARY_PROMPT_VERSION,
} from "@/lib/ai/prompts/game-summary";
import {
  gameSummaryModelSchema,
  gameSummarySchema,
  moveExplanationModelSchema,
  moveExplanationSchema,
} from "@/lib/ai/schemas/output";
import type {
  GameSummary,
  MoveExplanation,
  VerifiedGameSummaryContext,
  VerifiedMoveExplanationContext,
} from "@/lib/ai/types";

export class OpenAiProvider implements ChessExplanationProvider {
  private client: OpenAI;
  private config: AiConfig;

  constructor(config: AiConfig) {
    if (!config.openaiApiKey) {
      throw new AiError("not_configured", "OPENAI_API_KEY is not set");
    }
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.openaiApiKey,
      timeout: config.requestTimeoutMs,
      maxRetries: 1,
    });
  }

  async explainMove(
    ctx: VerifiedMoveExplanationContext,
    options?: ProviderOptions,
  ): Promise<MoveExplanation> {
    const messages = buildMoveExplanationMessages(ctx);
    let userContent = messages.user;

    if (options?.groundingRetry) {
      userContent += `\n\nIMPORTANT: Your previous response mentioned moves not in the engine data: ${options.groundingRetry.violations.join(", ")}. Only reference moves from the provided engine lines.`;
    }

    try {
      const response = await this.client.responses.parse(
        {
          model: this.config.openaiModel,
          input: [
            { role: "system", content: messages.system },
            { role: "user", content: userContent },
          ],
          text: {
            format: zodTextFormat(moveExplanationModelSchema, "move_explanation"),
          },
          reasoning: { effort: this.config.reasoningEffort },
          store: false,
          max_output_tokens: this.config.maxOutputTokens,
        },
        { signal: options?.signal },
      );

      if (!response.output_parsed) {
        throw new AiError("malformed_output", "Model returned no parsed output");
      }

      return moveExplanationSchema.parse(response.output_parsed);
    } catch (error) {
      throw mapOpenAiError(error);
    }
  }

  async summarizeGame(
    ctx: VerifiedGameSummaryContext,
    options?: ProviderOptions,
  ): Promise<GameSummary> {
    const messages = buildGameSummaryMessages(ctx);

    try {
      const response = await this.client.responses.parse(
        {
          model: this.config.openaiModel,
          input: [
            { role: "system", content: messages.system },
            { role: "user", content: messages.user },
          ],
          text: {
            format: zodTextFormat(gameSummaryModelSchema, "game_summary"),
          },
          reasoning: { effort: this.config.reasoningEffort },
          store: false,
          max_output_tokens: this.config.maxOutputTokens,
        },
        { signal: options?.signal },
      );

      if (!response.output_parsed) {
        throw new AiError("malformed_output", "Model returned no parsed output");
      }

      return gameSummarySchema.parse(response.output_parsed);
    } catch (error) {
      throw mapOpenAiError(error);
    }
  }
}

function mapOpenAiError(error: unknown): AiError {
  if (error instanceof AiError) {
    return error;
  }

  if (error instanceof OpenAI.APIError) {
    if (error.status === 401) {
      return new AiError("not_configured", "Invalid OpenAI API key");
    }
    if (error.status === 429) {
      return new AiError("rate_limited", "OpenAI rate limit exceeded");
    }
    if (error.status === 408 || error.message.includes("timeout")) {
      return new AiError("provider_timeout", "OpenAI request timed out");
    }
    return new AiError("provider_error", error.message);
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return new AiError("aborted", "Request was aborted");
  }

  if (error instanceof Error && error.name === "AbortError") {
    return new AiError("aborted", "Request was aborted");
  }

  return new AiError(
    "provider_error",
    error instanceof Error ? error.message : "Unknown provider error",
  );
}

export { MOVE_EXPLANATION_PROMPT_VERSION, GAME_SUMMARY_PROMPT_VERSION };
