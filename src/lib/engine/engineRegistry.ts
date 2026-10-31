import { AnalysisCache } from "@/lib/engine/analysisCache";
import { createStockfishEngine, type WorkerFactory } from "@/lib/engine/stockfish/StockfishEngine";
import type { ChessEngine } from "@/lib/engine/types";

const RELEASE_DELAY_MS = 250;

type EngineRegistryState = {
  engine: ChessEngine | null;
  cache: AnalysisCache;
  refCount: number;
  releaseTimer: ReturnType<typeof setTimeout> | null;
  workerFactory?: WorkerFactory;
};

const state: EngineRegistryState = {
  engine: null,
  cache: new AnalysisCache(),
  refCount: 0,
  releaseTimer: null,
};

export type EngineHandle = {
  engine: ChessEngine;
  cache: AnalysisCache;
};

export function acquireEngine(workerFactory?: WorkerFactory): EngineHandle {
  if (state.releaseTimer) {
    clearTimeout(state.releaseTimer);
    state.releaseTimer = null;
  }

  if (!state.engine) {
    state.workerFactory = workerFactory;
    state.engine = createStockfishEngine(workerFactory);
  }

  state.refCount += 1;

  return {
    engine: state.engine,
    cache: state.cache,
  };
}

export function releaseEngine(): void {
  state.refCount = Math.max(0, state.refCount - 1);

  if (state.refCount > 0) {
    return;
  }

  state.releaseTimer = setTimeout(() => {
    state.engine?.destroy();
    state.engine = null;
    state.releaseTimer = null;
  }, RELEASE_DELAY_MS);
}

export function resetEngineRegistryForTests(): void {
  if (state.releaseTimer) {
    clearTimeout(state.releaseTimer);
    state.releaseTimer = null;
  }
  state.engine?.destroy();
  state.engine = null;
  state.cache.clear();
  state.refCount = 0;
  state.workerFactory = undefined;
}
