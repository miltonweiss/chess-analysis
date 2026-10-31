import { buildCacheKey } from "@/lib/ai/cache/cacheKey";
import { dedupeRequest, LruAiCache } from "@/lib/ai/cache/aiCache";
import { MOVE_EXPLANATION_PROMPT_VERSION } from "@/lib/ai/prompts/move-explanation";
import { GAME_SUMMARY_PROMPT_VERSION } from "@/lib/ai/prompts/game-summary";
import type {
  AiResponse,
  AiStatus,
  GameSummary,
  GameSummaryContextInput,
  GameSummaryMoveLookup,
  MoveExplanation,
  MoveExplanationContextInput,
} from "@/lib/ai/types";

const clientMoveCache = new LruAiCache<MoveExplanation>(100);
const clientSummaryCache = new LruAiCache<GameSummary>(20);

let cachedStatus: AiStatus | null = null;

export async function fetchAiStatus(): Promise<AiStatus> {
  if (cachedStatus) {
    return cachedStatus;
  }
  const response = await fetch("/api/ai/status");
  cachedStatus = (await response.json()) as AiStatus;
  return cachedStatus;
}

export async function requestMoveExplanation(
  context: MoveExplanationContextInput,
  options?: { regenerate?: boolean; signal?: AbortSignal },
): Promise<AiResponse<MoveExplanation>> {
  const cacheKey = await buildCacheKey(
    "explain-move",
    MOVE_EXPLANATION_PROMPT_VERSION,
    context,
  );

  if (!options?.regenerate) {
    const cached = clientMoveCache.get(cacheKey);
    if (cached) {
      return {
        ok: true,
        data: cached,
        meta: { model: "cached", promptVersion: MOVE_EXPLANATION_PROMPT_VERSION, cached: true },
      };
    }
  }

  return dedupeRequest(`${cacheKey}:${options?.regenerate ?? false}`, async () => {
    const response = await fetch("/api/ai/explain-move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context, regenerate: options?.regenerate }),
      signal: options?.signal,
    });

    const result = (await response.json()) as AiResponse<MoveExplanation>;

    if (result.ok && !options?.regenerate) {
      clientMoveCache.set(cacheKey, result.data);
    }

    return result;
  });
}

export async function requestGameSummary(
  context: GameSummaryContextInput,
  moveLookup: GameSummaryMoveLookup[],
  options?: { regenerate?: boolean; signal?: AbortSignal },
): Promise<AiResponse<GameSummary>> {
  const cacheKey = await buildCacheKey(
    "summarize-game",
    GAME_SUMMARY_PROMPT_VERSION,
    context,
  );

  if (!options?.regenerate) {
    const cached = clientSummaryCache.get(cacheKey);
    if (cached) {
      return {
        ok: true,
        data: cached,
        meta: { model: "cached", promptVersion: GAME_SUMMARY_PROMPT_VERSION, cached: true },
      };
    }
  }

  return dedupeRequest(`${cacheKey}:${options?.regenerate ?? false}`, async () => {
    const response = await fetch("/api/ai/summarize-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context,
        moveLookup,
        regenerate: options?.regenerate,
      }),
      signal: options?.signal,
    });

    const result = (await response.json()) as AiResponse<GameSummary>;

    if (result.ok && !options?.regenerate) {
      clientSummaryCache.set(cacheKey, result.data);
    }

    return result;
  });
}

export function clearAiStatusCache(): void {
  cachedStatus = null;
}
