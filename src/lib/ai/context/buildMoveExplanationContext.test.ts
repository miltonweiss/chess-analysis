import { describe, expect, it } from "vitest";
import type { MoveAnalysis } from "@/lib/analysis/types";
import type { ChessMove } from "@/lib/chess/types";
import { buildMoveExplanationContext } from "@/lib/ai/context/buildMoveExplanationContext";
import type { GameReview } from "@/lib/review/types";

function makeReview(moves: MoveAnalysis[]): GameReview {
  return {
    metadata: { white: "Alice", black: "Bob", event: "Test Event" },
    moveAnalyses: moves,
    settings: { depth: 15 },
    white: {
      accuracy: { score: 90, moveCount: 1, isEmpty: false },
      averageEvaluationLoss: 0.1,
      counts: {
        brilliant: 0,
        great: 0,
        best: 1,
        excellent: 0,
        good: 0,
        inaccuracy: 0,
        mistake: 0,
        miss: 0,
        blunder: 0,
        forced: 0,
        book: 0,
      },
    },
    black: {
      accuracy: { score: 85, moveCount: 0, isEmpty: true },
      averageEvaluationLoss: 0,
      counts: {
        brilliant: 0,
        great: 0,
        best: 0,
        excellent: 0,
        good: 0,
        inaccuracy: 0,
        mistake: 0,
        miss: 0,
        blunder: 0,
        forced: 0,
        book: 0,
      },
    },
    keyMoments: [],
    evaluationTimeline: [],
  };
}

const chessMove: ChessMove = {
  ply: 1,
  moveNumber: 1,
  color: "white",
  san: "e4",
  uci: "e2e4",
  from: "e2",
  to: "e4",
  fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  fenAfter: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
};

const moveAnalysis: MoveAnalysis = {
  ply: 1,
  moveNumber: 1,
  color: "white",
  playedMove: "e4",
  playedMoveUci: "e2e4",
  evaluationBefore: { type: "cp", value: 0.2 },
  evaluationAfter: { type: "cp", value: 0.28 },
  evaluationLoss: 0,
  classification: "best",
  playedBestMove: true,
  isForced: false,
  engineBefore: {
    fen: chessMove.fenBefore,
    depth: 15,
    evaluation: { type: "cp", value: 0.2 },
    bestMove: "e2e4",
    principalVariation: ["e2e4", "e7e5"],
    lines: [],
    settings: { depth: 15 },
    source: "engine",
  },
};

describe("buildMoveExplanationContext", () => {
  it("includes expected fields without PGN metadata", () => {
    const ctx = buildMoveExplanationContext(
      makeReview([moveAnalysis]),
      moveAnalysis,
      [chessMove],
      "white",
    );

    expect(ctx).not.toBeNull();
    expect(ctx!.perspective).toBe("white");
    expect(ctx!.playedUci).toBe("e2e4");
    expect(ctx!.fenBefore).toBe(chessMove.fenBefore);
    expect(ctx!.bestLine.length).toBeLessThanOrEqual(6);
    expect(JSON.stringify(ctx)).not.toContain("Alice");
    expect(JSON.stringify(ctx)).not.toContain("Test Event");
  });

  it("is deterministic for same input", () => {
    const review = makeReview([moveAnalysis]);
    const a = buildMoveExplanationContext(review, moveAnalysis, [chessMove], "neutral");
    const b = buildMoveExplanationContext(review, moveAnalysis, [chessMove], "neutral");
    expect(a).toEqual(b);
  });
});
