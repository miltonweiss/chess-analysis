import { describe, expect, it } from "vitest";
import type { GameAnalysis } from "@/lib/analysis/types";
import { buildGameReview } from "@/lib/review/review";

describe("buildGameReview", () => {
  it("aggregates player reviews and timeline", () => {
    const gameAnalysis: GameAnalysis = {
      settings: { depth: 15 },
      moves: [
        {
          ply: 1,
          moveNumber: 1,
          color: "white",
          playedMove: "e4",
          playedMoveUci: "e2e4",
          evaluationBefore: { type: "cp", value: 0.3 },
          evaluationAfter: { type: "cp", value: 0.28 },
          evaluationLoss: 0.02,
          classification: "best",
          playedBestMove: true,
          isForced: false,
        },
        {
          ply: 2,
          moveNumber: 1,
          color: "black",
          playedMove: "e5",
          playedMoveUci: "e7e5",
          evaluationBefore: { type: "cp", value: 0.28 },
          evaluationAfter: { type: "cp", value: 4.0 },
          evaluationLoss: 3.72,
          classification: "blunder",
          playedBestMove: false,
          isForced: false,
        },
      ],
    };

    const review = buildGameReview({ white: "A", black: "B", result: "1-0" }, gameAnalysis);

    expect(review.white.counts.best).toBe(1);
    expect(review.black.counts.blunder).toBe(1);
    expect(review.evaluationTimeline).toHaveLength(3);
    expect(review.keyMoments.length).toBeGreaterThan(0);
    expect(review.biggestMistake?.ply).toBe(2);
    expect(review.higherAccuracy).toBe("white");
  });
});
