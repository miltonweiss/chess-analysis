import { evaluationContextFromEngine } from "@/lib/analysis/evaluationContext";
import type { MoveAnalysis } from "@/lib/analysis/types";
import {
  DEFAULT_REVIEW_SETTINGS,
  type ReviewSettings,
} from "@/lib/review/settings";
import type { KeyMoment, KeyMomentType, MateKind } from "@/lib/review/types";
import { playerWinPercent } from "@/lib/review/winProbability";

function winSwing(move: MoveAnalysis, settings: ReviewSettings): number {
  const beforeContext = evaluationContextFromEngine(move.engineBefore);
  const afterContext = evaluationContextFromEngine(move.engineAfter);
  const before = playerWinPercent(
    move.evaluationBefore,
    move.color,
    beforeContext,
    settings,
  );
  const after = playerWinPercent(
    move.evaluationAfter,
    move.color,
    afterContext,
    settings,
  );
  return Math.max(0, before - after);
}

function detectMateMoment(move: MoveAnalysis): { type: "mate"; mateKind: MateKind } | null {
  const before = move.evaluationBefore;
  const after = move.evaluationAfter;

  const hadOwnMate =
    before?.type === "mate" &&
    ((move.color === "white" && before.value > 0) ||
      (move.color === "black" && before.value < 0));

  const hasOwnMateAfter =
    after?.type === "mate" &&
    ((move.color === "white" && after.value > 0) ||
      (move.color === "black" && after.value < 0));

  const opponentMateAfter =
    after?.type === "mate" &&
    ((move.color === "white" && after.value < 0) ||
      (move.color === "black" && after.value > 0));

  const opponentMateBefore =
    before?.type === "mate" &&
    ((move.color === "white" && before.value < 0) ||
      (move.color === "black" && before.value > 0));

  if (hadOwnMate && !hasOwnMateAfter) {
    return { type: "mate", mateKind: "missed" };
  }

  if (opponentMateAfter && !opponentMateBefore) {
    return { type: "mate", mateKind: "allowed" };
  }

  if (
    move.engineAfter?.terminal === "checkmate" &&
    move.engineAfter.winner &&
    move.engineAfter.winner !== move.color
  ) {
    return { type: "mate", mateKind: "allowed" };
  }

  return null;
}

function classifyKeyMoment(
  move: MoveAnalysis,
  settings: ReviewSettings,
): { type: KeyMomentType; mateKind?: MateKind } | null {
  const mate = detectMateMoment(move);
  if (mate) {
    return mate;
  }

  const swing = winSwing(move, settings);
  const beforeContext = evaluationContextFromEngine(move.engineBefore);
  const afterContext = evaluationContextFromEngine(move.engineAfter);
  const winBefore = playerWinPercent(
    move.evaluationBefore,
    move.color,
    beforeContext,
    settings,
  );
  const winAfter = playerWinPercent(
    move.evaluationAfter,
    move.color,
    afterContext,
    settings,
  );

  if (
    swing >= settings.blunderWinDrop &&
    (move.classification === "mistake" || move.classification === "blunder" || move.classification === "miss")
  ) {
    return { type: "blunder" };
  }

  if (
    winBefore >= settings.missedWinBefore &&
    (swing >= settings.missedWinDrop || winAfter <= settings.missedWinAfterMax)
  ) {
    return { type: "missed-win" };
  }

  const whiteBefore = move.color === "white" ? winBefore : 100 - winBefore;
  const whiteAfter = move.color === "white" ? winAfter : 100 - winAfter;
  const crossedFifty =
    (whiteBefore >= 50 && whiteAfter < 50) || (whiteBefore < 50 && whiteAfter >= 50);

  if (crossedFifty && swing >= settings.turningPointSwing) {
    return { type: "turning-point" };
  }

  return null;
}

export function detectKeyMoments(
  moveAnalyses: MoveAnalysis[],
  settings: ReviewSettings = DEFAULT_REVIEW_SETTINGS,
): KeyMoment[] {
  const moments: KeyMoment[] = [];

  for (const move of moveAnalyses) {
    if (move.classification === "book" || move.classification === "forced") {
      continue;
    }

    const classified = classifyKeyMoment(move, settings);
    if (!classified) {
      continue;
    }

    moments.push({
      ply: move.ply,
      moveNumber: move.moveNumber,
      color: move.color,
      type: classified.type,
      mateKind: classified.mateKind,
      evaluationBefore: move.evaluationBefore,
      evaluationAfter: move.evaluationAfter,
      evaluationSwing: winSwing(move, settings),
      classification: move.classification,
      playedMove: move.playedMove,
    });
  }

  return moments.sort((left, right) => left.ply - right.ply);
}
