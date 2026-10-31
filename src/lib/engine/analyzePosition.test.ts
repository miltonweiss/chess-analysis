import { describe, expect, it, vi } from "vitest";
import { analyzePosition } from "@/lib/engine/analyzePosition";
import { AnalysisCache } from "@/lib/engine/analysisCache";
import { DEFAULT_ANALYSIS_SETTINGS } from "@/lib/engine/settings";
import type { ChessEngine, EngineSearchResult } from "@/lib/engine/types";
import { EngineAbortedError } from "@/lib/engine/types";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const FOOLS_MATE_FEN = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3";
const STALEMATE_FEN = "7k/5Q2/6K1/8/8/8/8/8 b - - 0 1";

function searchResult(
  partial: Omit<EngineSearchResult, "lines"> & { lines?: EngineSearchResult["lines"] },
): EngineSearchResult {
  const { lines, ...rest } = partial;
  return {
    ...rest,
    lines:
      lines ??
      (rest.bestMove
        ? [
            {
              bestMove: rest.bestMove,
              principalVariation: rest.principalVariation,
              score: rest.score,
              depth: rest.depth,
            },
          ]
        : []),
  };
}

function createFakeEngine(result: EngineSearchResult): ChessEngine {
  return {
    status: "ready",
    initialize: vi.fn().mockResolvedValue({ name: "Fake" }),
    analyze: vi.fn().mockResolvedValue(result),
    stop: vi.fn(),
    destroy: vi.fn(),
    subscribe: vi.fn(() => () => {}),
  };
}

describe("analyzePosition", () => {
  it("returns cached result without calling engine", async () => {
    const cache = new AnalysisCache();
    const engine = createFakeEngine(
      searchResult({
        fen: START_FEN,
        bestMove: "e2e4",
        depth: 15,
        score: { type: "cp", value: 30 },
        principalVariation: ["e2e4"],
      }),
    );

    const first = await analyzePosition(engine, cache, START_FEN, DEFAULT_ANALYSIS_SETTINGS);
    const second = await analyzePosition(engine, cache, START_FEN, DEFAULT_ANALYSIS_SETTINGS);

    expect(first.source).toBe("engine");
    expect(second.source).toBe("cache");
    expect(engine.analyze).toHaveBeenCalledTimes(1);
  });

  it("analyzes different positions separately", async () => {
    const cache = new AnalysisCache();
    const engine = createFakeEngine(
      searchResult({
        fen: START_FEN,
        bestMove: "e2e4",
        depth: 15,
        score: { type: "cp", value: 30 },
        principalVariation: ["e2e4"],
      }),
    );

    await analyzePosition(engine, cache, START_FEN, DEFAULT_ANALYSIS_SETTINGS);
    await analyzePosition(engine, cache, "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2", DEFAULT_ANALYSIS_SETTINGS);
    await analyzePosition(engine, cache, START_FEN, DEFAULT_ANALYSIS_SETTINGS);

    expect(engine.analyze).toHaveBeenCalledTimes(2);
  });

  it("uses different cache entries for different depths", async () => {
    const cache = new AnalysisCache();
    const engine = createFakeEngine(
      searchResult({
        fen: START_FEN,
        bestMove: "e2e4",
        depth: 15,
        score: { type: "cp", value: 30 },
        principalVariation: ["e2e4"],
      }),
    );

    await analyzePosition(engine, cache, START_FEN, { depth: 10 });
    await analyzePosition(engine, cache, START_FEN, { depth: 20 });

    expect(engine.analyze).toHaveBeenCalledTimes(2);
  });

  it("handles terminal checkmate without engine", async () => {
    const cache = new AnalysisCache();
    const engine = createFakeEngine(
      searchResult({
        fen: FOOLS_MATE_FEN,
        bestMove: null,
        depth: 0,
        score: null,
        principalVariation: [],
      }),
    );

    const result = await analyzePosition(engine, cache, FOOLS_MATE_FEN, DEFAULT_ANALYSIS_SETTINGS);

    expect(result.source).toBe("terminal");
    expect(result.terminal).toBe("checkmate");
    expect(result.winner).toBe("black");
    expect(result.bestMove).toBeNull();
    expect(engine.analyze).not.toHaveBeenCalled();
  });

  it("handles terminal stalemate without engine", async () => {
    const cache = new AnalysisCache();
    const engine = createFakeEngine(
      searchResult({
        fen: STALEMATE_FEN,
        bestMove: null,
        depth: 0,
        score: null,
        principalVariation: [],
      }),
    );

    const result = await analyzePosition(engine, cache, STALEMATE_FEN, DEFAULT_ANALYSIS_SETTINGS);

    expect(result.source).toBe("terminal");
    expect(result.terminal).toBe("stalemate");
    expect(engine.analyze).not.toHaveBeenCalled();
  });

  it("rejects invalid fen", async () => {
    const cache = new AnalysisCache();
    const engine = createFakeEngine(
      searchResult({
        fen: "invalid",
        bestMove: null,
        depth: 0,
        score: null,
        principalVariation: [],
      }),
    );

    await expect(analyzePosition(engine, cache, "not-a-fen", DEFAULT_ANALYSIS_SETTINGS)).rejects.toThrow();
  });

  it("does not cache aborted analyses", async () => {
    const cache = new AnalysisCache();
    const engine = createFakeEngine(
      searchResult({
        fen: START_FEN,
        bestMove: "e2e4",
        depth: 15,
        score: { type: "cp", value: 30 },
        principalVariation: ["e2e4"],
      }),
    );

    engine.analyze = vi.fn().mockRejectedValue(new EngineAbortedError());

    await expect(
      analyzePosition(engine, cache, START_FEN, DEFAULT_ANALYSIS_SETTINGS),
    ).rejects.toBeInstanceOf(EngineAbortedError);

    expect(cache.has(START_FEN, DEFAULT_ANALYSIS_SETTINGS)).toBe(false);
  });
});
