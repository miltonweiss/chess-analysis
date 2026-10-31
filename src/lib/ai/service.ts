import type { AiCache } from "@/lib/ai/cache/aiCache";
import { buildCacheKey } from "@/lib/ai/cache/cacheKey";
import { getAiConfig, isAiConfigured } from "@/lib/ai/config";
import { verifyGameSummaryContext, verifyMoveExplanationContext } from "@/lib/ai/context/verifyContext";
import { AiError, userMessageForCode } from "@/lib/ai/errors";
import { buildAllowedMoves, checkGrounding } from "@/lib/ai/grounding";
import { MOVE_EXPLANATION_PROMPT_VERSION } from "@/lib/ai/prompts/move-explanation";
import { GAME_SUMMARY_PROMPT_VERSION } from "@/lib/ai/prompts/game-summary";
import type { ChessExplanationProvider } from "@/lib/ai/providers/types";
import { RateLimiter } from "@/lib/ai/rateLimit";
import {
  gameSummaryContextInputSchema,
  moveExplanationContextInputSchema,
} from "@/lib/ai/schemas/context";
import type {
  AiResponse,
  AiStatus,
  GameSummary,
  GameSummaryContextInput,
  MoveExplanation,
  MoveExplanationContextInput,
} from "@/lib/ai/types";

export type AiServiceDeps = {
  provider: ChessExplanationProvider;
  moveCache: AiCache<MoveExplanation>;
  summaryCache: AiCache<GameSummary>;
  rateLimiter: RateLimiter;
};

const globalMoveCache = new Map<string, MoveExplanation>();
const globalSummaryCache = new Map<string, GameSummary>();

function simpleCache<T>(store: Map<string, T>): AiCache<T> {
  return {
    get: (key) => store.get(key),
    set: (key, value) => store.set(key, value),
    delete: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

let defaultDeps: AiServiceDeps | null = null;

export function createDefaultDeps(provider: ChessExplanationProvider): AiServiceDeps {
  const config = getAiConfig();
  return {
    provider,
    moveCache: simpleCache(globalMoveCache),
    summaryCache: simpleCache(globalSummaryCache),
    rateLimiter: new RateLimiter(config.rateLimitPerMinute),
  };
}

export function getDefaultDeps(provider: ChessExplanationProvider): AiServiceDeps {
  if (!defaultDeps) {
    defaultDeps = createDefaultDeps(provider);
  }
  return defaultDeps;
}

export function getAiStatus(): AiStatus {
  const config = getAiConfig();
  return {
    configured: isAiConfigured(config),
    provider: config.provider,
    model: config.openaiModel,
  };
}

function checkRateLimit(deps: AiServiceDeps, clientId: string): void {
  if (!deps.rateLimiter.check(clientId)) {
    throw new AiError("rate_limited", userMessageForCode("rate_limited"));
  }
}

export async function explainMove(
  input: MoveExplanationContextInput,
  options: { regenerate?: boolean; clientId?: string; signal?: AbortSignal },
  deps: AiServiceDeps,
): Promise<AiResponse<MoveExplanation>> {
  const config = getAiConfig();

  if (!isAiConfigured(config)) {
    return errorResponse("not_configured");
  }

  try {
    checkRateLimit(deps, options.clientId ?? "default");

    const parsed = moveExplanationContextInputSchema.parse(input);
    const verified = verifyMoveExplanationContext(parsed);

    const cacheExtra = `${config.openaiModel}:${config.reasoningEffort}`;
    const cacheKey = await buildCacheKey(
      "explain-move",
      MOVE_EXPLANATION_PROMPT_VERSION,
      verified,
      cacheExtra,
    );

    if (!options.regenerate) {
      const cached = deps.moveCache.get(cacheKey);
      if (cached) {
        return successResponse(cached, config.openaiModel, MOVE_EXPLANATION_PROMPT_VERSION, true);
      }
    }

    let explanation = await deps.provider.explainMove(verified, {
      signal: options.signal,
    });

    const allowed = buildAllowedMoves(verified);
    const grounding = checkGrounding(explanation, allowed);

    if (!grounding.ok) {
      explanation = await deps.provider.explainMove(verified, {
        signal: options.signal,
        groundingRetry: { violations: grounding.violations },
      });

      const retryGrounding = checkGrounding(explanation, allowed);
      if (!retryGrounding.ok) {
        return errorResponse("ungrounded_output");
      }
    }

    deps.moveCache.set(cacheKey, explanation);
    return successResponse(explanation, config.openaiModel, MOVE_EXPLANATION_PROMPT_VERSION, false);
  } catch (error) {
    return handleError(error);
  }
}

export async function summarizeGame(
  input: GameSummaryContextInput,
  moveLookup: Map<number, { fenBefore: string; playedUci: string }>,
  options: { regenerate?: boolean; clientId?: string; signal?: AbortSignal },
  deps: AiServiceDeps,
): Promise<AiResponse<GameSummary>> {
  const config = getAiConfig();

  if (!isAiConfigured(config)) {
    return errorResponse("not_configured");
  }

  try {
    checkRateLimit(deps, options.clientId ?? "default");

    const parsed = gameSummaryContextInputSchema.parse(input);
    const verified = verifyGameSummaryContext(parsed, moveLookup);

    const cacheExtra = `${config.openaiModel}:${config.reasoningEffort}`;
    const cacheKey = await buildCacheKey(
      "summarize-game",
      GAME_SUMMARY_PROMPT_VERSION,
      verified,
      cacheExtra,
    );

    if (!options.regenerate) {
      const cached = deps.summaryCache.get(cacheKey);
      if (cached) {
        return successResponse(cached, config.openaiModel, GAME_SUMMARY_PROMPT_VERSION, true);
      }
    }

    const summary = await deps.provider.summarizeGame(verified, {
      signal: options.signal,
    });

    deps.summaryCache.set(cacheKey, summary);
    return successResponse(summary, config.openaiModel, GAME_SUMMARY_PROMPT_VERSION, false);
  } catch (error) {
    return handleError(error);
  }
}

function successResponse<T>(
  data: T,
  model: string,
  promptVersion: string,
  cached: boolean,
): AiResponse<T> {
  return {
    ok: true,
    data,
    meta: { model, promptVersion, cached },
  };
}

function errorResponse(code: import("@/lib/ai/types").AiErrorCode): AiResponse<never> {
  return {
    ok: false,
    error: {
      code,
      message: userMessageForCode(code),
    },
  };
}

function handleError(error: unknown): AiResponse<never> {
  if (error instanceof AiError) {
    return errorResponse(error.code);
  }
  if (error instanceof Error && error.name === "ZodError") {
    return errorResponse("invalid_request");
  }
  return errorResponse("provider_error");
}
