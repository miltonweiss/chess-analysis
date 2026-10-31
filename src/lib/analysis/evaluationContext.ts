import type { PlayerColor } from "@/lib/chess/types";
import type { EngineAnalysis } from "@/lib/engine/types";

export type EvaluationContext = {
  terminal?: EngineAnalysis["terminal"];
  winner?: PlayerColor;
};

export function evaluationContextFromEngine(
  engine?: EngineAnalysis,
): EvaluationContext | undefined {
  if (!engine?.terminal && !engine?.winner) {
    return undefined;
  }

  return {
    terminal: engine.terminal,
    winner: engine.winner,
  };
}

export function mergeEvaluationContext(
  before?: EngineAnalysis,
  after?: EngineAnalysis,
): { before?: EvaluationContext; after?: EvaluationContext } {
  return {
    before: evaluationContextFromEngine(before),
    after: evaluationContextFromEngine(after),
  };
}
