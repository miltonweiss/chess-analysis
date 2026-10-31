import { z } from "zod";

const evaluationSchema = z.union([
  z.object({ type: z.literal("cp"), value: z.number() }),
  z.object({ type: z.literal("mate"), value: z.number() }),
  z.null(),
]);

const perspectiveSchema = z.enum(["white", "black", "neutral"]);
const colorSchema = z.enum(["white", "black"]);
const classificationSchema = z.enum([
  "brilliant",
  "great",
  "best",
  "excellent",
  "good",
  "inaccuracy",
  "mistake",
  "miss",
  "blunder",
  "forced",
  "book",
]);

const uciArraySchema = z.array(z.string().max(8)).max(8);
const fenSchema = z.string().min(10).max(120);

export const moveExplanationContextInputSchema = z.object({
  perspective: perspectiveSchema,
  ply: z.number().int().min(1).max(500),
  moveNumber: z.number().int().min(1).max(250),
  color: colorSchema,
  playedUci: z.string().min(4).max(8),
  bestUci: z.string().min(4).max(8).nullable(),
  playedWasBest: z.boolean(),
  isForced: z.boolean(),
  classification: classificationSchema,
  evaluationBefore: evaluationSchema,
  evaluationAfter: evaluationSchema,
  evaluationLoss: z.number().min(0).max(100),
  winPercentBefore: z.number().min(0).max(100),
  winPercentAfter: z.number().min(0).max(100),
  keyMomentType: z.string().max(32).optional(),
  mateKind: z.string().max(16).optional(),
  fenBefore: fenSchema,
  fenAfter: fenSchema,
  bestLine: uciArraySchema,
  afterPlayedLine: uciArraySchema,
  engineDepth: z.number().int().min(1).max(50),
  previousMoves: uciArraySchema,
  nextMoves: uciArraySchema,
  terminal: z.enum(["checkmate", "stalemate"]).optional(),
});

export const gameSummaryKeyMomentSchema = z.object({
  ply: z.number().int().min(1),
  moveNumber: z.number().int().min(1),
  color: colorSchema,
  playedUci: z.string().min(4).max(8),
  fenBefore: fenSchema,
  type: z.string().max(32),
  classification: classificationSchema,
  evaluationBefore: evaluationSchema,
  evaluationAfter: evaluationSchema,
  evaluationSwing: z.number().min(0).max(100),
});

export const gameSummaryContextInputSchema = z.object({
  perspective: perspectiveSchema,
  result: z.string().max(16),
  moveCount: z.number().int().min(1).max(500),
  analysisDepth: z.number().int().min(1).max(50),
  whiteAccuracy: z.number().min(0).max(100),
  blackAccuracy: z.number().min(0).max(100),
  whiteCounts: z.record(z.string(), z.number()),
  blackCounts: z.record(z.string(), z.number()),
  keyMoments: z.array(gameSummaryKeyMomentSchema).max(6),
  biggestMistakePly: z.number().int().optional(),
  biggestMissedOpportunityPly: z.number().int().optional(),
  bestMovePly: z.number().int().optional(),
  winPercentTrajectory: z
    .array(
      z.object({
        ply: z.number().int(),
        winPercent: z.number().min(0).max(100),
      }),
    )
    .max(12),
  untrustedOpening: z.string().max(200).optional(),
});
