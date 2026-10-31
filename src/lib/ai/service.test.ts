import { describe, expect, it } from "vitest";
import { LruAiCache } from "@/lib/ai/cache/aiCache";
import { MockProvider } from "@/lib/ai/providers/mock";
import { RateLimiter } from "@/lib/ai/rateLimit";
import {
  createDefaultDeps,
  explainMove,
  getAiStatus,
  summarizeGame,
} from "@/lib/ai/service";
import type {
  GameSummary,
  MoveExplanation,
  MoveExplanationContextInput,
} from "@/lib/ai/types";

const validMoveContext: MoveExplanationContextInput = {
  perspective: "neutral",
  ply: 1,
  moveNumber: 1,
  color: "white",
  playedUci: "e2e4",
  bestUci: "e2e4",
  playedWasBest: true,
  isForced: false,
  classification: "best",
  evaluationBefore: { type: "cp", value: 0.2 },
  evaluationAfter: { type: "cp", value: 0.28 },
  evaluationLoss: 0,
  winPercentBefore: 52,
  winPercentAfter: 54,
  fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  fenAfter: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  bestLine: ["e2e4"],
  afterPlayedLine: [],
  engineDepth: 15,
  previousMoves: [],
  nextMoves: [],
};

describe("AI service", () => {
  it("returns status", () => {
    const status = getAiStatus();
    expect(status).toHaveProperty("configured");
    expect(status).toHaveProperty("provider");
  });

  it("explains move with mock provider", async () => {
    process.env.AI_PROVIDER = "mock";
    const provider = new MockProvider();
    const deps = createDefaultDeps(provider);

    const result = await explainMove(validMoveContext, {}, deps);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.headline).toBeTruthy();
    }
  });

  it("caches move explanation", async () => {
    const provider = new MockProvider();
    let callCount = 0;
    const trackingProvider = {
      explainMove: async (...args: Parameters<typeof provider.explainMove>) => {
        callCount += 1;
        return provider.explainMove(...args);
      },
      summarizeGame: provider.summarizeGame.bind(provider),
    };

    const deps = {
      provider: trackingProvider,
      moveCache: new LruAiCache<MoveExplanation>(),
      summaryCache: new LruAiCache<GameSummary>(),
      rateLimiter: new RateLimiter(100),
    };

    await explainMove(validMoveContext, {}, deps);
    await explainMove(validMoveContext, {}, deps);
    expect(callCount).toBe(1);
  });

  it("returns error for invalid context", async () => {
    const provider = new MockProvider();
    const deps = createDefaultDeps(provider);

    const result = await explainMove(
      { ...validMoveContext, playedUci: "x" },
      {},
      deps,
    );
    expect(result.ok).toBe(false);
  });

  it("summarizes game", async () => {
    const provider = new MockProvider();
    const deps = createDefaultDeps(provider);

    const result = await summarizeGame(
      {
        perspective: "neutral",
        result: "1-0",
        moveCount: 2,
        analysisDepth: 15,
        whiteAccuracy: 90,
        blackAccuracy: 85,
        whiteCounts: { best: 1 },
        blackCounts: { best: 1 },
        keyMoments: [],
        winPercentTrajectory: [{ ply: 0, winPercent: 50 }],
      },
      new Map([[1, { fenBefore: validMoveContext.fenBefore, playedUci: "e2e4" }]]),
      {},
      deps,
    );

    expect(result.ok).toBe(true);
  });
});
