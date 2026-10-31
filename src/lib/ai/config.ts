/** Server-only configuration — never import from client components. */

export type AiConfig = {
  openaiApiKey: string | undefined;
  openaiModel: string;
  reasoningEffort: "low" | "medium" | "high";
  provider: "openai" | "mock";
  requestTimeoutMs: number;
  rateLimitPerMinute: number;
  maxOutputTokens: number;
  maxBodyBytes: number;
};

function readEnv(key: string, fallback?: string): string | undefined {
  return process.env[key] ?? fallback;
}

export function getAiConfig(): AiConfig {
  const provider = readEnv("AI_PROVIDER", "openai") as "openai" | "mock";

  return {
    openaiApiKey: readEnv("OPENAI_API_KEY"),
    openaiModel: readEnv("OPENAI_MODEL", "gpt-6-luna")!,
    reasoningEffort: (readEnv("OPENAI_REASONING_EFFORT", "medium") as AiConfig["reasoningEffort"]),
    provider,
    requestTimeoutMs: Number(readEnv("AI_REQUEST_TIMEOUT_MS", "60000")),
    rateLimitPerMinute: Number(readEnv("AI_RATE_LIMIT_PER_MINUTE", "20")),
    maxOutputTokens: 800,
    maxBodyBytes: 32_768,
  };
}

export function isAiConfigured(config: AiConfig = getAiConfig()): boolean {
  if (config.provider === "mock") {
    return process.env.NODE_ENV !== "production";
  }
  return Boolean(config.openaiApiKey);
}
