import type { MoveExplanationContextInput } from "@/lib/ai/types";

/** Curated positions for manual AI quality evaluation. */
export const EVAL_FIXTURES: {
  name: string;
  category: string;
  context: MoveExplanationContextInput;
}[] = [
  {
    name: "Tactical blunder — Scholar's mate attempt",
    category: "tactical-blunder",
    context: {
      perspective: "neutral",
      ply: 4,
      moveNumber: 2,
      color: "white",
      playedUci: "d1h5",
      bestUci: "g1f3",
      playedWasBest: false,
      isForced: false,
      classification: "blunder",
      evaluationBefore: { type: "cp", value: 0.3 },
      evaluationAfter: { type: "cp", value: -2.5 },
      evaluationLoss: 2.8,
      winPercentBefore: 55,
      winPercentAfter: 15,
      fenBefore:
        "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
      fenAfter:
        "rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2",
      bestLine: ["g1f3", "b8c6"],
      afterPlayedLine: ["b8c6"],
      engineDepth: 15,
      previousMoves: ["e2e4", "e7e5"],
      nextMoves: ["b8c6"],
    },
  },
  {
    name: "Good opening move",
    category: "good-move",
    context: {
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
      fenBefore:
        "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      fenAfter:
        "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      bestLine: ["e2e4", "e7e5"],
      afterPlayedLine: ["e7e5"],
      engineDepth: 15,
      previousMoves: [],
      nextMoves: ["e7e5"],
    },
  },
];
