import { buildMoveAnalysis } from "@/lib/analysis/analyzeMove";
import {
  computeBookPlies,
  getOpeningIndex,
  openingAfterBookLine,
  resolveOpeningDisplay,
} from "@/lib/openings/lookup";
import type { ClassificationThresholds } from "@/lib/analysis/settings";
import {
  GameAnalysisAbortedError,
  type GameAnalysis,
  type GameAnalysisProgress,
} from "@/lib/analysis/types";
import type { ChessMove, GameMetadata } from "@/lib/chess/types";
import { analyzePosition } from "@/lib/engine/analyzePosition";
import type { AnalysisCache } from "@/lib/engine/analysisCache";
import type { AnalysisSettings } from "@/lib/engine/settings";
import type { ChessEngine } from "@/lib/engine/types";
import { EngineAbortedError } from "@/lib/engine/types";

export type AnalyzeGameOptions = {
  signal?: AbortSignal;
  onProgress?: (progress: GameAnalysisProgress) => void;
  thresholds?: ClassificationThresholds;
  initialFen?: string;
  metadata?: GameMetadata;
};

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new GameAnalysisAbortedError();
  }
}

function reportProgress(
  options: AnalyzeGameOptions,
  partial: Omit<GameAnalysisProgress, "total" | "moveCount"> & {
    total?: number;
    moveCount?: number;
  },
  moves: ChessMove[],
): void {
  const total = moves.length * 2;
  options.onProgress?.({
    current: partial.current,
    total,
    currentPly: partial.currentPly,
    currentColor: partial.currentColor,
    currentMove: partial.currentMove,
    moveCount: moves.length,
    engineDepth: partial.engineDepth,
  });
}

export async function analyzeGame(
  engine: ChessEngine,
  cache: AnalysisCache,
  moves: ChessMove[],
  settings: AnalysisSettings,
  options: AnalyzeGameOptions = {},
): Promise<GameAnalysis> {
  const analyzedMoves: GameAnalysis["moves"] = [];
  let positionsCompleted = 0;

  if (moves.length === 0) {
    return { moves: [], settings };
  }

  const initialFen = options.initialFen ?? moves[0]?.fenBefore;
  const openingIndex = await getOpeningIndex();
  const bookPlies = initialFen
    ? computeBookPlies(openingIndex, initialFen, moves)
    : new Set<number>();

  reportProgress(
    options,
    {
      current: 0,
      currentPly: 0,
      currentColor: "white",
      currentMove: 0,
    },
    moves,
  );

  for (let index = 0; index < moves.length; index += 1) {
    assertNotAborted(options.signal);

    const move = moves[index];

    reportProgress(
      options,
      {
        current: positionsCompleted,
        currentPly: move.ply,
        currentColor: move.color,
        currentMove: index + 1,
        engineDepth: settings.depth,
      },
      moves,
    );

    let engineBefore;
    let engineAfter;

    try {
      engineBefore = await analyzePosition(engine, cache, move.fenBefore, settings, {
        signal: options.signal,
        onProgress: (progress) => {
          reportProgress(
            options,
            {
              current: positionsCompleted,
              currentPly: move.ply,
              currentColor: move.color,
              currentMove: index + 1,
              engineDepth: progress.depth,
            },
            moves,
          );
        },
      });
      positionsCompleted += 1;

      reportProgress(
        options,
        {
          current: positionsCompleted,
          currentPly: move.ply,
          currentColor: move.color,
          currentMove: index + 1,
          engineDepth: settings.depth,
        },
        moves,
      );

      engineAfter = await analyzePosition(engine, cache, move.fenAfter, settings, {
        signal: options.signal,
        onProgress: (progress) => {
          reportProgress(
            options,
            {
              current: positionsCompleted,
              currentPly: move.ply,
              currentColor: move.color,
              currentMove: index + 1,
              engineDepth: progress.depth,
            },
            moves,
          );
        },
      });
      positionsCompleted += 1;
    } catch (error) {
      if (error instanceof EngineAbortedError || error instanceof GameAnalysisAbortedError) {
        throw new GameAnalysisAbortedError();
      }
      throw error;
    }

    let moveAnalysis = buildMoveAnalysis({
      move,
      engineBefore,
      engineAfter,
      thresholds: options.thresholds,
    });

    if (bookPlies.has(move.ply)) {
      moveAnalysis = {
        ...moveAnalysis,
        classification: "book",
        evaluationLoss: 0,
      };
    }

    analyzedMoves.push(moveAnalysis);
  }

  // Post-pass: convert blunder/mistake/inaccuracy into "miss" when player failed to punish
  // an opponent's previous mistake (the position was heavily swung in player's favour,
  // but player played a suboptimal move that failed to capitalize on the opportunity).
  for (let i = 1; i < analyzedMoves.length; i += 1) {
    const current = analyzedMoves[i];
    const prev = analyzedMoves[i - 1];

    if (
      current.classification === "book" ||
      current.classification === "forced" ||
      current.classification === "best" ||
      current.classification === "great" ||
      current.classification === "brilliant"
    ) {
      continue;
    }

    const prevWasFlaw =
      prev.classification === "blunder" ||
      prev.classification === "mistake" ||
      prev.classification === "inaccuracy";

    // If opponent made a blunder/mistake and current player made a blunder/mistake/inaccuracy,
    // they missed the tactical opportunity
    if (prevWasFlaw && (current.classification === "blunder" || current.classification === "mistake")) {
      analyzedMoves[i] = {
        ...current,
        classification: "miss",
      };
    }
  }

  reportProgress(
    options,
    {
      current: moves.length * 2,
      currentPly: moves[moves.length - 1]?.ply ?? 0,
      currentColor: moves[moves.length - 1]?.color ?? "white",
      currentMove: moves.length,
      engineDepth: settings.depth,
    },
    moves,
  );

  const detectedOpening =
    initialFen !== undefined
      ? openingAfterBookLine(openingIndex, initialFen, moves)
      : null;
  const opening = resolveOpeningDisplay(detectedOpening, options.metadata ?? {});

  return {
    moves: analyzedMoves,
    settings,
    opening: opening ?? undefined,
  };
}
