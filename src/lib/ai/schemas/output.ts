import { z } from "zod";

/** Model-facing schema (minimal, for OpenAI structured output). */
export const moveExplanationModelSchema = z.object({
  headline: z.string().describe("Short headline for the explanation"),
  summary: z.string().describe("What happened in this move"),
  whyItMatters: z.string().describe("Cause and effect — why this matters"),
  betterIdea: z
    .string()
    .nullable()
    .describe("Better alternative move idea, null if played move was best"),
  lesson: z.string().describe("One practical lesson from this move"),
  reasonClarity: z
    .enum(["supported", "partly_supported", "unclear"])
    .describe("How well the engine data supports the explanation"),
});

export const gameSummaryModelSchema = z.object({
  headline: z.string().describe("Short headline for the game summary"),
  overview: z.string().describe("Brief overview of the game"),
  turningPoint: z
    .string()
    .nullable()
    .describe("The critical turning point, null if none"),
  mainStrength: z.string().describe("Main strength shown in the game"),
  mainWeakness: z.string().describe("Main weakness shown in the game"),
  keyLesson: z.string().describe("One key lesson from this game"),
});

const MAX_FIELD_LENGTH = 600;

/** App-side validation with length caps. */
export const moveExplanationSchema = z.object({
  headline: z.string().min(1).max(120),
  summary: z.string().min(1).max(MAX_FIELD_LENGTH),
  whyItMatters: z.string().min(1).max(MAX_FIELD_LENGTH),
  betterIdea: z.string().max(MAX_FIELD_LENGTH).nullable(),
  lesson: z.string().min(1).max(MAX_FIELD_LENGTH),
  reasonClarity: z.enum(["supported", "partly_supported", "unclear"]),
});

export const gameSummarySchema = z.object({
  headline: z.string().min(1).max(120),
  overview: z.string().min(1).max(MAX_FIELD_LENGTH),
  turningPoint: z.string().max(MAX_FIELD_LENGTH).nullable(),
  mainStrength: z.string().min(1).max(MAX_FIELD_LENGTH),
  mainWeakness: z.string().min(1).max(MAX_FIELD_LENGTH),
  keyLesson: z.string().min(1).max(MAX_FIELD_LENGTH),
});
