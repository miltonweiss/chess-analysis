"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { analyzeGame } from "@/lib/analysis/analyzeGame";
import {
  GameAnalysisAbortedError,
  type GameAnalysis,
  type GameAnalysisProgress,
  type GameAnalysisState,
} from "@/lib/analysis/types";
import type { ChessMove, GameMetadata } from "@/lib/chess/types";
import { analyzePosition } from "@/lib/engine/analyzePosition";
import {
  acquireEngine,
  releaseEngine,
  type EngineHandle,
} from "@/lib/engine/engineRegistry";
import { type AnalysisSettings } from "@/lib/engine/settings";
import { analysisSettingsFromUser } from "@/lib/storage/preferences";

export type UseGameAnalysisOptions = {
  initialAnalysis?: GameAnalysis;
  onComplete?: (analysis: GameAnalysis) => void;
  initialFen?: string;
  metadata?: GameMetadata;
};

function movesSignature(moves: ChessMove[]): string {
  return moves.map((move) => move.uci).join(",");
}

function analysisMatchesMoves(analysis: GameAnalysis, moves: ChessMove[]): boolean {
  if (analysis.moves.length !== moves.length) {
    return false;
  }

  return analysis.moves.every((entry, index) => entry.playedMoveUci === moves[index]?.uci);
}

export function useGameAnalysis(
  moves: ChessMove[],
  options: UseGameAnalysisOptions = {},
) {
  const handleRef = useRef<EngineHandle | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestRef = useRef(0);
  const movesSignatureRef = useRef<string | null>(null);
  const onCompleteRef = useRef(options.onComplete);

  const initialAnalysis =
    options.initialAnalysis &&
    analysisMatchesMoves(options.initialAnalysis, moves)
      ? options.initialAnalysis
      : null;

  const [settings, setSettings] = useState<AnalysisSettings>(() =>
    initialAnalysis?.settings ?? analysisSettingsFromUser(),
  );
  const [gameAnalysisState, setGameAnalysisState] = useState<GameAnalysisState>(
    initialAnalysis
      ? { type: "complete", result: initialAnalysis }
      : { type: "idle" },
  );
  const [progress, setProgress] = useState<GameAnalysisProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentMovesSignature = movesSignature(moves);

  useEffect(() => {
    onCompleteRef.current = options.onComplete;
  }, [options.onComplete]);

  useEffect(() => {
    const handle = acquireEngine();
    handleRef.current = handle;

    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
      releaseEngine();
      handleRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (movesSignatureRef.current === null) {
      movesSignatureRef.current = currentMovesSignature;
      return;
    }

    if (movesSignatureRef.current === currentMovesSignature) {
      return;
    }

    movesSignatureRef.current = currentMovesSignature;
    abortRef.current?.abort();
    abortRef.current = null;
    requestRef.current += 1;
    setProgress(null);
    setError(null);
    setGameAnalysisState({ type: "idle" });
  }, [currentMovesSignature]);

  const analyzeFullGame = useCallback(async () => {
    const handle = handleRef.current;
    if (!handle || moves.length === 0) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestRef.current;

    setError(null);
    const initialProgress: GameAnalysisProgress = {
      current: 0,
      total: moves.length * 2,
      currentPly: 0,
      currentColor: "white",
      currentMove: 0,
      moveCount: moves.length,
      engineDepth: settings.depth,
    };
    setProgress(initialProgress);
    setGameAnalysisState({ type: "analyzing", progress: initialProgress });

    try {
      const result = await analyzeGame(handle.engine, handle.cache, moves, settings, {
        signal: controller.signal,
        initialFen: options.initialFen,
        metadata: options.metadata,
        onProgress: (nextProgress) => {
          if (requestId !== requestRef.current) {
            return;
          }
          setProgress(nextProgress);
          setGameAnalysisState({ type: "analyzing", progress: nextProgress });
        },
      });

      if (requestId !== requestRef.current) {
        return;
      }

      setGameAnalysisState({ type: "complete", result });
      setProgress(null);
      onCompleteRef.current?.(result);
    } catch (caught) {
      if (caught instanceof GameAnalysisAbortedError) {
        if (requestId === requestRef.current) {
          setGameAnalysisState({ type: "cancelled" });
          setProgress(null);
        }
        return;
      }

      if (requestId !== requestRef.current) {
        return;
      }

      const message = caught instanceof Error ? caught.message : "Game analysis failed";
      setError(message);
      setGameAnalysisState({ type: "error", message });
      setProgress(null);
    }
  }, [moves, settings, options.initialFen, options.metadata]);

  const stopGameAnalysis = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    handleRef.current?.engine.stop();
    requestRef.current += 1;
    setProgress(null);
    setGameAnalysisState({ type: "cancelled" });
  }, []);

  const retry = useCallback(() => {
    setError(null);
    setGameAnalysisState({ type: "idle" });
    void analyzeFullGame();
  }, [analyzeFullGame]);

  const setDepth = useCallback((depth: number) => {
    setSettings((current) => ({ ...current, depth }));
  }, []);

  const setEquivalentMoveDetection = useCallback((enabled: boolean) => {
    setSettings((current) => ({ ...current, multipv: enabled ? 2 : 1 }));
  }, []);

  const gameAnalysis: GameAnalysis | null =
    gameAnalysisState.type === "complete" ? gameAnalysisState.result : null;

  const isAnalyzing = gameAnalysisState.type === "analyzing";

  /**
   * Engine continuation for a position (UCI moves, best first). Used to keep a
   * "best line" going past the end of the stored principal variation.
   * Returns [] while the full-game analysis owns the engine, or when the
   * position is terminal.
   */
  const fetchBestContinuation = useCallback(
    async (fen: string): Promise<string[]> => {
      const handle = handleRef.current;
      if (!handle || isAnalyzing) {
        return [];
      }

      const result = await analyzePosition(handle.engine, handle.cache, fen, {
        ...settings,
        multipv: 1,
      });

      if (result.principalVariation.length > 0) {
        return result.principalVariation;
      }
      return result.bestMove ? [result.bestMove] : [];
    },
    [settings, isAnalyzing],
  );
  const hasMatchingInitialAnalysis = initialAnalysis !== null;

  return {
    hasMatchingInitialAnalysis,
    gameAnalysis,
    gameAnalysisState,
    progress,
    error,
    isAnalyzing,
    settings,
    setDepth,
    setEquivalentMoveDetection,
    analyzeFullGame,
    stopGameAnalysis,
    retry,
    fetchBestContinuation,
  };
}

export type UseGameAnalysisReturn = ReturnType<typeof useGameAnalysis>;
