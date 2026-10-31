import type { GameAnalysis } from "@/lib/analysis/types";
import { evaluationContextFromEngine } from "@/lib/analysis/evaluationContext";
import type { GameMetadata, PlayerColor } from "@/lib/chess/types";
import { buildEvaluationTimeline } from "@/lib/review/evaluationTimeline";
import { detectKeyMoments } from "@/lib/review/keyMoments";
import { buildPlayerReview } from "@/lib/review/playerReview";
import {
  DEFAULT_REVIEW_SETTINGS,
  type ReviewSettings,
} from "@/lib/review/settings";
import type { GameReview, KeyMoment } from "@/lib/review/types";
import { playerWinPercent } from "@/lib/review/winProbability";

function findBiggestMistake(gameAnalysis: GameAnalysis, settings: ReviewSettings) {
  let bestMove = undefined;
  let bestSwing = -1;

  for (const move of gameAnalysis.moves) {
    if (move.classification === "book") {
      continue;
    }

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
    const swing = before - after;

    if (swing > bestSwing) {
      bestSwing = swing;
      bestMove = move;
    }
  }

  return bestSwing > 0 ? bestMove : undefined;
}

function findBiggestMissedOpportunity(
  gameAnalysis: GameAnalysis,
  settings: ReviewSettings,
) {
  let bestMove = undefined;
  let bestSwing = -1;

  for (const move of gameAnalysis.moves) {
    if (move.classification === "book") {
      continue;
    }

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

    if (before < settings.missedOpportunityMinWin) {
      continue;
    }

    const swing = before - after;
    if (swing > bestSwing) {
      bestSwing = swing;
      bestMove = move;
    }
  }

  return bestSwing > 0 ? bestMove : undefined;
}

function findBestMoveHighlight(gameAnalysis: GameAnalysis, settings: ReviewSettings) {
  let candidate = undefined;
  let bestScore = -1;

  for (const move of gameAnalysis.moves) {
    if (move.classification !== "best" && move.classification !== "excellent") {
      continue;
    }

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

    if (before < settings.bestMoveWinMin || before > settings.bestMoveWinMax) {
      continue;
    }

    const improvement = after - before;
    if (improvement > bestScore) {
      bestScore = improvement;
      candidate = move;
    }
  }

  return candidate;
}

function findBiggestSwing(keyMoments: KeyMoment[]): KeyMoment | undefined {
  if (keyMoments.length === 0) {
    return undefined;
  }

  return keyMoments.reduce((max, moment) =>
    moment.evaluationSwing > max.evaluationSwing ? moment : max,
  );
}

function resolveHigherAccuracy(white: number, black: number): PlayerColor | undefined {
  if (Math.abs(white - black) < 0.05) {
    return undefined;
  }

  return white > black ? "white" : "black";
}

export function buildGameReview(
  metadata: GameMetadata,
  gameAnalysis: GameAnalysis,
  settings: ReviewSettings = DEFAULT_REVIEW_SETTINGS,
): GameReview {
  const keyMoments = detectKeyMoments(gameAnalysis.moves, settings);
  const white = buildPlayerReview(gameAnalysis.moves, "white", settings);
  const black = buildPlayerReview(gameAnalysis.moves, "black", settings);

  return {
    metadata,
    opening: gameAnalysis.opening,
    resultSummary: metadata.result,
    moveAnalyses: gameAnalysis.moves,
    settings: gameAnalysis.settings,
    white,
    black,
    keyMoments,
    evaluationTimeline: buildEvaluationTimeline(gameAnalysis.moves),
    biggestMistake: findBiggestMistake(gameAnalysis, settings),
    biggestMissedOpportunity: findBiggestMissedOpportunity(gameAnalysis, settings),
    bestMove: findBestMoveHighlight(gameAnalysis, settings),
    biggestSwing: findBiggestSwing(keyMoments),
    higherAccuracy: resolveHigherAccuracy(white.accuracy.score, black.accuracy.score),
  };
}
