import { describe, expect, it } from "vitest";
import { AnalysisCache } from "@/lib/engine/analysisCache";
import { DEFAULT_ANALYSIS_SETTINGS } from "@/lib/engine/settings";
import type { EngineAnalysis } from "@/lib/engine/types";

function sampleResult(fen: string, depth = 15): EngineAnalysis {
  return {
    fen,
    depth,
    evaluation: { type: "cp", value: 0.2 },
    bestMove: "e2e4",
    principalVariation: ["e2e4"],
    lines: [],
    settings: { depth },
    source: "engine",
  };
}

describe("analysis cache", () => {
  it("stores and retrieves by fen and settings", () => {
    const cache = new AnalysisCache();
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const result = sampleResult(fen);

    cache.set(fen, DEFAULT_ANALYSIS_SETTINGS, result);
    expect(cache.get(fen, DEFAULT_ANALYSIS_SETTINGS)).toEqual(result);
  });

  it("uses different keys for different depths", () => {
    const cache = new AnalysisCache();
    const fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    cache.set(fen, { depth: 10 }, sampleResult(fen, 10));
    cache.set(fen, { depth: 20 }, sampleResult(fen, 20));

    expect(cache.get(fen, { depth: 10 })?.depth).toBe(10);
    expect(cache.get(fen, { depth: 20 })?.depth).toBe(20);
  });

  it("evicts oldest entries when over capacity", () => {
    const cache = new AnalysisCache(2);
    cache.set("fen-a", DEFAULT_ANALYSIS_SETTINGS, sampleResult("fen-a"));
    cache.set("fen-b", DEFAULT_ANALYSIS_SETTINGS, sampleResult("fen-b"));
    cache.set("fen-c", DEFAULT_ANALYSIS_SETTINGS, sampleResult("fen-c"));

    expect(cache.has("fen-a", DEFAULT_ANALYSIS_SETTINGS)).toBe(false);
    expect(cache.has("fen-b", DEFAULT_ANALYSIS_SETTINGS)).toBe(true);
    expect(cache.has("fen-c", DEFAULT_ANALYSIS_SETTINGS)).toBe(true);
  });
});
