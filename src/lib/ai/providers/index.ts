import { getAiConfig } from "@/lib/ai/config";
import { AiError } from "@/lib/ai/errors";
import type { ChessExplanationProvider } from "@/lib/ai/providers/types";
import { MockProvider } from "@/lib/ai/providers/mock";
import { OpenAiProvider } from "@/lib/ai/providers/openai";

let cachedProvider: ChessExplanationProvider | null = null;

export function getProvider(): ChessExplanationProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const config = getAiConfig();

  if (config.provider === "mock") {
    if (process.env.NODE_ENV === "production") {
      throw new AiError("not_configured", "Mock provider is not available in production");
    }
    cachedProvider = new MockProvider();
    return cachedProvider;
  }

  cachedProvider = new OpenAiProvider(config);
  return cachedProvider;
}

export function resetProvider(): void {
  cachedProvider = null;
}
