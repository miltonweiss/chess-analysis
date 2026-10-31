import { z } from "zod";
import {
  gameSummaryContextInputSchema,
  moveExplanationContextInputSchema,
} from "@/lib/ai/schemas/context";

export const explainMoveRequestSchema = z.object({
  context: moveExplanationContextInputSchema,
  regenerate: z.boolean().optional(),
});

const gameSummaryMoveLookupSchema = z.object({
  ply: z.number().int().min(1),
  fenBefore: z.string().min(10).max(120),
  playedUci: z.string().min(4).max(8),
});

export const summarizeGameRequestSchema = z.object({
  context: gameSummaryContextInputSchema,
  moveLookup: z.array(gameSummaryMoveLookupSchema).max(500),
  regenerate: z.boolean().optional(),
});
