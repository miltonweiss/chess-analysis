import type { AiErrorCode } from "@/lib/ai/types";

export class AiError extends Error {
  readonly code: AiErrorCode;

  constructor(code: AiErrorCode, message: string) {
    super(message);
    this.name = "AiError";
    this.code = code;
  }
}

export const USER_FACING_ERROR =
  "Unable to generate the explanation. Your engine analysis is still available.";

export function userMessageForCode(code: AiErrorCode): string {
  switch (code) {
    case "not_configured":
      return "AI explanations are not configured. Set OPENAI_API_KEY on the server.";
    case "rate_limited":
      return "Too many AI requests. Please wait a moment and try again.";
    case "provider_timeout":
      return "The AI request timed out. Please try again.";
    case "ungrounded_output":
      return "The AI explanation could not be verified. Please try again.";
    case "aborted":
      return "Explanation request was cancelled.";
    default:
      return USER_FACING_ERROR;
  }
}
