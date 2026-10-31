import { evaluationContextFromEngine } from "@/lib/analysis/evaluationContext";
import type { MoveAnalysis } from "@/lib/analysis/types";
import type { PlayerColor } from "@/lib/chess/types";
import {
  DEFAULT_REVIEW_SETTINGS,
  type ReviewSettings,
} from "@/lib/review/settings";
import { playerWinPercent } from "@/lib/review/winProbability";
import type { PlayerAccuracy } from "@/lib/review/types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function harmonicMean(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const sum = values.reduce((acc, value) => acc + 1 / Math.max(value, 0.001), 0);
  return values.length / sum;
}

function weightedMean(values: number[], weights: number[]): number | null {
  if (values.length === 0 || values.length !== weights.length) {
    return null;
  }

  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) {
    return null;
  }

  const weighted = values.reduce((sum, value, index) => sum + value * weights[index], 0);
  return weighted / totalWeight;
}

/** Per-move accuracy from mover win% before/after (Lichess-inspired formula). */
export function moveAccuracy(
  winBefore: number,
  winAfter: number,
  settings: ReviewSettings = DEFAULT_REVIEW_SETTINGS,
): number {
  if (winAfter >= winBefore) {
    return 100;
  }

  const winDiff = winBefore - winAfter;
  const raw =
    settings.accuracyA * Math.exp(-settings.accuracyK * winDiff) + settings.accuracyB;
  return clamp(raw + settings.uncertaintyBonus, 0, 100);
}

function slidingWindowSize(moveCount: number, settings: ReviewSettings): number {
  const computed = Math.floor(moveCount / 10);
  return clamp(computed, settings.windowMin, settings.windowMax);
}

export function calculatePlayerAccuracy(
  moveAnalyses: MoveAnalysis[],
  color: PlayerColor,
  settings: ReviewSettings = DEFAULT_REVIEW_SETTINGS,
): PlayerAccuracy {
  const playerMoves = moveAnalyses.filter(
    (move) =>
      move.color === color &&
      move.classification !== "book" &&
      move.classification !== "forced",
  );

  if (playerMoves.length === 0) {
    return { score: 100, moveCount: 0, isEmpty: true };
  }

  const winPercents = playerMoves.flatMap((move) => {
    const beforeContext = evaluationContextFromEngine(move.engineBefore);
    const afterContext = evaluationContextFromEngine(move.engineAfter);
    const before = playerWinPercent(move.evaluationBefore, color, beforeContext, settings);
    const after = playerWinPercent(move.evaluationAfter, color, afterContext, settings);
    return [before, after];
  });

  const moveAccuracies = playerMoves.map((move) => {
    const beforeContext = evaluationContextFromEngine(move.engineBefore);
    const afterContext = evaluationContextFromEngine(move.engineAfter);
    const before = playerWinPercent(move.evaluationBefore, color, beforeContext, settings);
    const after = playerWinPercent(move.evaluationAfter, color, afterContext, settings);
    return moveAccuracy(before, after, settings);
  });

  const windowSize = slidingWindowSize(playerMoves.length, settings);
  const windows: number[][] = [];

  if (winPercents.length >= windowSize) {
    for (let index = 0; index <= winPercents.length - windowSize; index += 1) {
      windows.push(winPercents.slice(index, index + windowSize));
    }
  }

  const weights = windows.map((window) => {
    const stddev = standardDeviation(window);
    return clamp(stddev, settings.weightMin, settings.weightMax);
  });

  const weightedAccuracies: number[] = [];
  const weightValues: number[] = [];

  for (let index = 0; index < moveAccuracies.length; index += 1) {
    const windowIndex = Math.min(index, weights.length - 1);
    if (windowIndex >= 0 && weights[windowIndex] !== undefined) {
      weightedAccuracies.push(moveAccuracies[index]);
      weightValues.push(weights[windowIndex]);
    }
  }

  const volatilityWeighted = weightedMean(weightedAccuracies, weightValues);
  const harmonic = harmonicMean(moveAccuracies);

  let score = 100;
  if (volatilityWeighted !== null && harmonic !== null) {
    score = (volatilityWeighted + harmonic) / 2;
  } else if (harmonic !== null) {
    score = harmonic;
  } else if (volatilityWeighted !== null) {
    score = volatilityWeighted;
  }

  return {
    score: clamp(score, 0, 100),
    moveCount: playerMoves.length,
    isEmpty: false,
  };
}
