import {
  normalizeEvaluation,
  parseBestMove,
  parseInfoLine,
  sideToMoveFromFen,
} from "@/lib/engine/uci";
import type {
  AnalysisProgress,
  ChessEngine,
  EngineIdentity,
  EngineInfo,
  EngineOptions,
  EngineSearchResult,
  EngineStatus,
} from "@/lib/engine/types";
import { EngineAbortedError, EngineError } from "@/lib/engine/types";

export type WorkerFactory = () => Worker;

const DEFAULT_WORKER_URL = "/engine/stockfish-19-lite-single.js";
const INIT_TIMEOUT_MS = 30_000;
const COMMAND_TIMEOUT_MS = 60_000;

type PendingWait = {
  predicate: (line: string) => boolean;
  resolve: (line: string) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

type ActiveSearch = {
  requestId: number;
  fen: string;
  lines: Map<number, EngineInfo>;
  lastReportedDepth: number;
  resolve: (result: EngineSearchResult) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: AnalysisProgress) => void;
  signal?: AbortSignal;
  abortHandler?: () => void;
  cancelled?: boolean;
};

export class StockfishEngine implements ChessEngine {
  private worker: Worker | null = null;
  private _status: EngineStatus = "idle";
  private listeners = new Set<(status: EngineStatus) => void>();
  private initPromise: Promise<EngineIdentity> | null = null;
  private identity: EngineIdentity | null = null;
  private requestCounter = 0;
  private pendingWaits: PendingWait[] = [];
  private activeSearch: ActiveSearch | null = null;
  private drainResolve: (() => void) | null = null;
  private hasSentUciNewGame = false;
  private configuredMultiPv = 1;
  private readonly workerFactory: WorkerFactory;

  constructor(workerFactory: WorkerFactory = () => new Worker(DEFAULT_WORKER_URL)) {
    this.workerFactory = workerFactory;
  }

  get status(): EngineStatus {
    return this._status;
  }

  subscribe(listener: (status: EngineStatus) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async initialize(): Promise<EngineIdentity> {
    if (this._status === "destroyed") {
      throw new EngineError("Engine has been destroyed");
    }

    if (this.identity) {
      return this.identity;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.setStatus("initializing");

    this.initPromise = this.runInitialization().finally(() => {
      this.initPromise = null;
    });

    return this.initPromise;
  }

  async analyze(
    fen: string,
    options: EngineOptions = {},
    onProgress?: (progress: AnalysisProgress) => void,
  ): Promise<EngineSearchResult> {
    await this.initialize();

    if (this._status === "destroyed") {
      throw new EngineError("Engine has been destroyed");
    }

    if (options.signal?.aborted) {
      throw new EngineAbortedError();
    }

    if (this.activeSearch) {
      await this.cancelActiveSearch();
    }

    const requestId = ++this.requestCounter;
    this.setStatus("analyzing");

    return new Promise<EngineSearchResult>((resolve, reject) => {
      const search: ActiveSearch = {
        requestId,
        fen,
        lines: new Map(),
        lastReportedDepth: -1,
        resolve,
        reject,
        onProgress,
        signal: options.signal,
      };

      if (options.signal) {
        search.abortHandler = () => {
          void this.cancelActiveSearch(new EngineAbortedError());
        };
        options.signal.addEventListener("abort", search.abortHandler);
      }

      this.activeSearch = search;

      void this.runSearch(search, options).catch((error) => {
        if (this.activeSearch?.requestId === requestId) {
          this.cleanupSearch(search);
          this.setStatus(this._status === "error" ? "error" : "ready");
          reject(error instanceof Error ? error : new EngineError(String(error)));
        }
      });
    });
  }

  stop(): void {
    if (this._status === "destroyed" || !this.worker) {
      return;
    }
    this.postCommand("stop");
  }

  destroy(): void {
    if (this._status === "destroyed") {
      return;
    }

    this.rejectAllPending(new EngineError("Engine destroyed"));
    if (this.activeSearch) {
      this.activeSearch.reject(new EngineError("Engine destroyed"));
      this.cleanupSearch(this.activeSearch);
    }

    if (this.worker) {
      this.postCommand("quit");
      this.worker.terminate();
      this.worker = null;
    }

    this.identity = null;
    this.initPromise = null;
    this.hasSentUciNewGame = false;
    this.setStatus("destroyed");
    this.listeners.clear();
  }

  private async runInitialization(): Promise<EngineIdentity> {
    this.ensureWorker();

    const identity: EngineIdentity = { name: "Stockfish" };

    await this.waitForLine(
      "uci",
      (line) => {
        if (line.startsWith("id name ")) {
          identity.name = line.slice("id name ".length);
        }
        if (line.startsWith("id author ")) {
          identity.author = line.slice("id author ".length);
        }
        return line === "uciok";
      },
      INIT_TIMEOUT_MS,
    );

    await this.waitForLine("isready", (line) => line === "readyok", INIT_TIMEOUT_MS);

    this.identity = identity;
    this.setStatus("ready");
    return identity;
  }

  private async runSearch(search: ActiveSearch, options: EngineOptions): Promise<void> {
    try {
      const depth = options.depth;
      const movetime = options.movetime;

      if (!this.hasSentUciNewGame) {
        this.postCommand("ucinewgame");
        this.hasSentUciNewGame = true;
      }

      this.postCommand(`position fen ${search.fen}`);
      await this.waitForLine("isready", (line) => line === "readyok", COMMAND_TIMEOUT_MS);

      // The search may have been cancelled/replaced while waiting for readyok.
      // Never start `go` for a stale search, or it would overlap the next one.
      if (search.cancelled || this.activeSearch?.requestId !== search.requestId) {
        return;
      }

      const multipv = Math.max(1, Math.min(5, options.multipv ?? 1));
      if (multipv !== this.configuredMultiPv) {
        this.postCommand(`setoption name MultiPV value ${multipv}`);
        this.configuredMultiPv = multipv;
      }

      const goCommand =
        movetime !== undefined ? `go movetime ${movetime}` : `go depth ${depth ?? 15}`;

      // waitForLine posts the command itself — do not post `go` separately,
      // otherwise the engine receives two overlapping searches and crashes.
      const bestMoveLine = await this.waitForLine(
        goCommand,
        (line) => line.startsWith("bestmove "),
        COMMAND_TIMEOUT_MS,
      );

      if (this.activeSearch?.requestId !== search.requestId) {
        return;
      }

      const topLine = search.lines.get(1) ?? [...search.lines.values()][0];
      const bestMove = parseBestMove(bestMoveLine);
      const sortedLines = [...search.lines.entries()].sort(([a], [b]) => a - b);
      const lines = sortedLines.map(([, info]) => ({
        bestMove: info.pv[0] ?? null,
        principalVariation: info.pv,
        score: info.score ?? null,
        depth: info.depth,
      }));

      const result: EngineSearchResult = {
        fen: search.fen,
        bestMove: bestMove?.bestMove ?? null,
        ponder: bestMove?.ponder,
        depth: topLine?.depth ?? 0,
        score: topLine?.score ?? null,
        principalVariation: topLine?.pv ?? [],
        lines,
        nodes: topLine?.nodes,
        timeMs: topLine?.timeMs,
      };

      this.cleanupSearch(search);
      this.setStatus("ready");
      search.resolve(result);
    } catch (error) {
      if (
        error instanceof EngineAbortedError ||
        this.activeSearch?.requestId !== search.requestId
      ) {
        return;
      }
      throw error;
    }
  }

  private async cancelActiveSearch(reason = new EngineAbortedError()): Promise<void> {
    const search = this.activeSearch;
    if (!search) {
      return;
    }

    search.cancelled = true;

    for (const wait of this.pendingWaits) {
      clearTimeout(wait.timeoutId);
      wait.reject(reason);
    }
    this.pendingWaits = [];

    await new Promise<void>((resolve) => {
      const timeoutId = setTimeout(() => {
        this.drainResolve = null;
        resolve();
      }, COMMAND_TIMEOUT_MS);

      this.drainResolve = () => {
        clearTimeout(timeoutId);
        this.drainResolve = null;
        resolve();
      };

      this.postCommand("stop");
    });

    this.cleanupSearch(search);
    search.reject(reason);
    if (this._status !== "destroyed") {
      this.setStatus("ready");
    }
  }

  private cleanupSearch(search: ActiveSearch | null): void {
    if (!search) {
      return;
    }

    if (search.signal && search.abortHandler) {
      search.signal.removeEventListener("abort", search.abortHandler);
    }

    if (this.activeSearch?.requestId === search.requestId) {
      this.activeSearch = null;
    }
  }

  private ensureWorker(): void {
    if (this.worker) {
      return;
    }

    this.worker = this.workerFactory();
    this.worker.onmessage = (event: MessageEvent<string>) => {
      this.dispatchMessage(typeof event.data === "string" ? event.data : String(event.data));
    };
    this.worker.onerror = (event) => {
      const error = new EngineError(event.message || "Worker error");
      this.handleFatalError(error);
    };
  }

  private dispatchMessage(rawLine: string): void {
    const lines = rawLine.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      if (this.drainResolve && trimmed.startsWith("bestmove ")) {
        this.resolvePendingWaits(trimmed);
        const resolve = this.drainResolve;
        this.drainResolve = null;
        resolve();
        continue;
      }

      const search = this.activeSearch;
      if (search && trimmed.startsWith("info ")) {
        this.handleInfoLine(search, trimmed);
      }

      if (search && trimmed.startsWith("bestmove ")) {
        this.resolvePendingWaits(trimmed);
        continue;
      }

      this.resolvePendingWaits(trimmed);
    }
  }

  private handleInfoLine(search: ActiveSearch, line: string): void {
    const info = parseInfoLine(line);
    if (!info || info.hasBound || !info.score) {
      return;
    }

    search.lines.set(info.multipv, info);

    if (info.depth <= search.lastReportedDepth) {
      return;
    }

    search.lastReportedDepth = info.depth;
    const sideToMove = sideToMoveFromFen(search.fen);

    search.onProgress?.({
      depth: info.depth,
      evaluation: normalizeEvaluation(info.score, sideToMove),
      principalVariation: info.pv,
    });
  }

  private resolvePendingWaits(line: string): void {
    const waitIndex = this.pendingWaits.findIndex((wait) => wait.predicate(line));
    if (waitIndex >= 0) {
      const [wait] = this.pendingWaits.splice(waitIndex, 1);
      clearTimeout(wait.timeoutId);
      wait.resolve(line);
    }
  }

  private waitForLine(
    command: string,
    predicate: (line: string) => boolean,
    timeoutMs: number,
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingWaits = this.pendingWaits.filter((wait) => wait.timeoutId !== timeoutId);
        reject(new EngineError(`Timed out waiting for engine response to: ${command}`));
      }, timeoutMs);

      this.pendingWaits.push({
        predicate,
        resolve,
        reject,
        timeoutId,
      });

      this.postCommand(command);
    });
  }

  private postCommand(command: string): void {
    if (!this.worker) {
      throw new EngineError("Worker is not initialized");
    }
    this.worker.postMessage(command);
  }

  private rejectAllPending(error: Error): void {
    for (const wait of this.pendingWaits) {
      clearTimeout(wait.timeoutId);
      wait.reject(error);
    }
    this.pendingWaits = [];
  }

  private handleFatalError(error: EngineError): void {
    this.rejectAllPending(error);
    if (this.activeSearch) {
      this.activeSearch.reject(error);
      this.cleanupSearch(this.activeSearch);
    }
    this.setStatus("error");
  }

  private setStatus(status: EngineStatus): void {
    this._status = status;
    for (const listener of this.listeners) {
      listener(status);
    }
  }
}

export function createStockfishEngine(workerFactory?: WorkerFactory): ChessEngine {
  return new StockfishEngine(workerFactory);
}
