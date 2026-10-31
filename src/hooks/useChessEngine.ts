"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { analyzePosition } from "@/lib/engine/analyzePosition";
import {
  acquireEngine,
  releaseEngine,
  type EngineHandle,
} from "@/lib/engine/engineRegistry";
import {
  type AnalysisSettings,
} from "@/lib/engine/settings";
import { analysisSettingsFromUser } from "@/lib/storage/preferences";
import type {
  AnalysisProgress,
  AnalysisState,
  EngineAnalysis,
  EngineIdentity,
  EngineStatus,
} from "@/lib/engine/types";
import { EngineAbortedError } from "@/lib/engine/types";

type RunState =
  | { sessionKey: string; phase: "analyzing"; fen: string; progress: AnalysisProgress | null }
  | { sessionKey: string; phase: "complete"; fen: string; result: EngineAnalysis }
  | { sessionKey: string; phase: "error"; fen: string; message: string };

export function useChessEngine(currentFen: string) {
  const handleRef = useRef<EngineHandle | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const analyzeRequestRef = useRef(0);

  const [engineHandle, setEngineHandle] = useState<EngineHandle | null>(null);
  const [settings, setSettings] = useState<AnalysisSettings>(() => analysisSettingsFromUser());
  const [identity, setIdentity] = useState<EngineIdentity | null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [runState, setRunState] = useState<RunState | null>(null);
  const [sessionGeneration, setSessionGeneration] = useState(0);

  const sessionKey = `${currentFen}|${settings.depth}|${settings.movetime ?? ""}|${settings.multipv ?? 1}|${sessionGeneration}`;

  useEffect(() => {
    const handle = acquireEngine();
    handleRef.current = handle;
    queueMicrotask(() => {
      setEngineHandle(handle);
    });

    handle.engine
      .initialize()
      .then((result) => {
        setIdentity(result);
        setEngineError(null);
      })
      .catch((error: Error) => {
        if (error.message !== "Engine destroyed") {
          setEngineError(error.message);
        }
      });

    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
      releaseEngine();
      handleRef.current = null;
      setEngineHandle(null);
      setIdentity(null);
    };
  }, []);

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    handleRef.current?.engine.stop();
    analyzeRequestRef.current += 1;
    queueMicrotask(() => {
      setSessionGeneration((generation) => generation + 1);
    });
  }, [currentFen, settings]);

  const analysisState = useMemo((): AnalysisState => {
    if (runState && runState.sessionKey === sessionKey && runState.fen === currentFen) {
      if (runState.phase === "analyzing") {
        return { type: "analyzing", fen: runState.fen };
      }
      if (runState.phase === "error") {
        return { type: "error", message: runState.message };
      }
      return { type: "complete", result: runState.result };
    }

    const cached = engineHandle?.cache.get(currentFen, settings);
    if (cached) {
      return { type: "complete", result: { ...cached, source: "cache" } };
    }

    return { type: "idle" };
  }, [runState, sessionKey, currentFen, settings, engineHandle]);

  const progress = useMemo((): AnalysisProgress | null => {
    if (
      runState?.phase === "analyzing" &&
      runState.sessionKey === sessionKey &&
      runState.fen === currentFen
    ) {
      return runState.progress;
    }
    return null;
  }, [runState, sessionKey, currentFen]);

  const engineStatus = useSyncExternalStore<EngineStatus>(
    (listener) => engineHandle?.engine.subscribe(listener) ?? (() => {}),
    () => engineHandle?.engine.status ?? "idle",
    () => "idle",
  );

  const analyze = useCallback(async () => {
    const handle = handleRef.current;
    if (!handle) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const fen = currentFen;
    const requestId = ++analyzeRequestRef.current;

    setRunState({ sessionKey, phase: "analyzing", fen, progress: null });
    setEngineError(null);

    try {
      const result = await analyzePosition(handle.engine, handle.cache, fen, settings, {
        signal: controller.signal,
        onProgress: (nextProgress) => {
          if (requestId !== analyzeRequestRef.current) {
            return;
          }
          setRunState((current) =>
            current?.phase === "analyzing" && current.fen === fen
              ? { ...current, progress: nextProgress }
              : current,
          );
        },
      });

      if (requestId !== analyzeRequestRef.current) {
        return;
      }

      if (result.fen !== fen) {
        return;
      }

      setRunState({ sessionKey, phase: "complete", fen, result });
    } catch (error) {
      if (error instanceof EngineAbortedError) {
        return;
      }

      if (requestId !== analyzeRequestRef.current) {
        return;
      }

      setRunState({
        sessionKey,
        phase: "error",
        fen,
        message: error instanceof Error ? error.message : "Analysis failed",
      });
    }
  }, [currentFen, settings, sessionKey]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    handleRef.current?.engine.stop();
    analyzeRequestRef.current += 1;
    setRunState(null);
  }, []);

  const setDepth = useCallback((depth: number) => {
    setSettings((current) => ({ ...current, depth }));
  }, []);

  const result: EngineAnalysis | null =
    analysisState.type === "complete" ? analysisState.result : null;

  return {
    engineStatus,
    identity,
    engineError,
    analysisState,
    progress,
    result,
    analyze,
    stop,
    settings,
    setDepth,
  };
}

export type UseChessEngineReturn = ReturnType<typeof useChessEngine>;

export type { EngineAnalysis };
