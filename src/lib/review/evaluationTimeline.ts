import { evaluationContextFromEngine } from "@/lib/analysis/evaluationContext";
import type { MoveAnalysis } from "@/lib/analysis/types";
import type { EvaluationPoint } from "@/lib/review/types";
import { winPercentWhite } from "@/lib/review/winProbability";

export function buildEvaluationTimeline(moves: MoveAnalysis[]): EvaluationPoint[] {
  if (moves.length === 0) {
    return [];
  }

  const first = moves[0];
  const startEngine = first.engineBefore;
  const startContext = evaluationContextFromEngine(startEngine);

  const timeline: EvaluationPoint[] = [
    {
      ply: 0,
      moveNumber: 0,
      evaluation: startEngine?.evaluation ?? first.evaluationBefore,
      terminal: startEngine?.terminal,
      winner: startEngine?.winner,
      winPercent: winPercentWhite(
        startEngine?.evaluation ?? first.evaluationBefore,
        startContext,
      ),
    },
  ];

  for (const move of moves) {
    const afterContext = evaluationContextFromEngine(move.engineAfter);
    timeline.push({
      ply: move.ply,
      moveNumber: move.moveNumber,
      evaluation: move.evaluationAfter,
      terminal: move.engineAfter?.terminal,
      winner: move.engineAfter?.winner,
      winPercent: winPercentWhite(move.evaluationAfter, afterContext),
    });
  }

  return timeline;
}
