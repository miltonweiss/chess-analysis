import { describe, expect, it } from "vitest";
import { MockProvider } from "@/lib/ai/providers/mock";
import type {
  VerifiedGameSummaryContext,
  VerifiedMoveExplanationContext,
} from "@/lib/ai/types";

const moveCtx: VerifiedMoveExplanationContext = {
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
  playedSan: "e4",
  bestSan: "e4",
  bestLineSan: ["e4"],
  afterPlayedLineSan: [],
  previousMovesSan: [],
  nextMovesSan: [],
  evalBeforeDisplay: "+0.20",
  evalAfterDisplay: "+0.28",
};

describe("MockProvider", () => {
  const provider = new MockProvider();

  it("returns move explanation", async () => {
    const result = await provider.explainMove(moveCtx);
    expect(result.headline).toContain("e4");
    expect(result.reasonClarity).toBe("supported");
  });

  it("returns game summary", async () => {
    const ctx: VerifiedGameSummaryContext = {
      perspective: "neutral",
      result: "1-0",
      moveCount: 20,
      analysisDepth: 15,
      whiteAccuracy: 90,
      blackAccuracy: 80,
      whiteCounts: { best: 5 },
      blackCounts: { best: 4 },
      keyMoments: [],
      winPercentTrajectory: [{ ply: 0, winPercent: 50 }],
      keyMomentsSan: [],
    };

    const result = await provider.summarizeGame(ctx);
    expect(result.headline).toContain("1-0");
    expect(result.keyLesson).toBeTruthy();
  });
});
