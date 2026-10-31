import { formatEvaluation } from "@/lib/engine/uci";
import type {
  GameSummaryContextInput,
  MoveExplanationContextInput,
  VerifiedGameSummaryContext,
  VerifiedMoveExplanationContext,
} from "@/lib/ai/types";
import {
  sanitizeUntrustedText,
  uciToSanFromFen,
  verifyMoveFromFen,
  verifyPvLine,
} from "@/lib/ai/context/chessVerify";
import { AiError } from "@/lib/ai/errors";

export function verifyMoveExplanationContext(
  input: MoveExplanationContextInput,
): VerifiedMoveExplanationContext {
  const played = verifyMoveFromFen(input.fenBefore, input.playedUci, input.fenAfter);
  if (!played.ok) {
    throw new AiError("invalid_request", played.reason);
  }

  let bestSan: string | null = null;
  if (input.bestUci) {
    bestSan = uciToSanFromFen(input.fenBefore, input.bestUci);
    if (!bestSan) {
      throw new AiError("invalid_request", "Best move is illegal from position");
    }
  }

  const bestLineSan = verifyPvLine(input.fenBefore, input.bestLine);
  if (bestLineSan === null) {
    throw new AiError("invalid_request", "Engine best line contains illegal moves");
  }

  const afterPlayedLineSan = verifyPvLine(input.fenAfter, input.afterPlayedLine);
  if (afterPlayedLineSan === null) {
    throw new AiError("invalid_request", "After-played line contains illegal moves");
  }

  const previousMovesSan: string[] = [];
  let prevFen = input.fenBefore;
  for (const uci of input.previousMoves) {
    const idx = input.previousMoves.indexOf(uci);
    if (idx === 0) {
      const moveIdx = input.ply - input.previousMoves.length - 1;
      void moveIdx;
    }
    const result = verifyMoveFromFen(prevFen, uci);
    if (!result.ok) {
      break;
    }
    previousMovesSan.push(result.san);
    prevFen = result.fenAfter;
  }

  const nextMovesSan: string[] = [];
  let nextFen = input.fenAfter;
  for (const uci of input.nextMoves) {
    const result = verifyMoveFromFen(nextFen, uci);
    if (!result.ok) {
      break;
    }
    nextMovesSan.push(result.san);
    nextFen = result.fenAfter;
  }

  return {
    ...input,
    playedSan: played.san,
    bestSan,
    bestLineSan,
    afterPlayedLineSan,
    previousMovesSan,
    nextMovesSan,
    evalBeforeDisplay: formatEvaluation(input.evaluationBefore),
    evalAfterDisplay: formatEvaluation(input.evaluationAfter),
  };
}

export function verifyGameSummaryContext(
  input: GameSummaryContextInput,
  moveLookup: Map<number, { fenBefore: string; playedUci: string }>,
): VerifiedGameSummaryContext {
  const keyMomentsSan = input.keyMoments.map((km) => {
    const fen = moveLookup.get(km.ply)?.fenBefore ?? km.fenBefore;
    const playedSan = uciToSanFromFen(fen, km.playedUci) ?? km.playedUci;
    return { ...km, playedSan };
  });

  function sanForPly(ply?: number): string | undefined {
    if (!ply) return undefined;
    const move = moveLookup.get(ply);
    if (!move) return undefined;
    return uciToSanFromFen(move.fenBefore, move.playedUci) ?? undefined;
  }

  return {
    ...input,
    untrustedOpening: input.untrustedOpening
      ? sanitizeUntrustedText(input.untrustedOpening)
      : undefined,
    keyMomentsSan,
    biggestMistakeSan: sanForPly(input.biggestMistakePly),
    biggestMissedOpportunitySan: sanForPly(input.biggestMissedOpportunityPly),
    bestMoveSan: sanForPly(input.bestMovePly),
  };
}
