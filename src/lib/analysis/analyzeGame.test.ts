import { describe, expect, it, vi } from "vitest";
import { analyzeGame } from "@/lib/analysis/analyzeGame";
import { AnalysisCache } from "@/lib/engine/analysisCache";
import { DEFAULT_ANALYSIS_SETTINGS } from "@/lib/engine/settings";
import type { ChessEngine, EngineAnalysis, UciScore } from "@/lib/engine/types";
import { parsePgn } from "@/lib/chess/pgn";

function createAnalysis(fen: string, cp: number, bestMove: string): EngineAnalysis {
  return {
    fen,
    depth: 15,
    evaluation: { type: "cp", value: cp },
    bestMove,
    principalVariation: [bestMove],
    lines: [
      {
        evaluation: { type: "cp", value: cp },
        bestMove,
        principalVariation: [bestMove],
        depth: 15,
      },
    ],
    settings: DEFAULT_ANALYSIS_SETTINGS,
    source: "engine",
  };
}

function createFakeEngine(resultsByFen: Map<string, EngineAnalysis>): ChessEngine {
  return {
    status: "ready",
    initialize: vi.fn().mockResolvedValue({ name: "Fake" }),
    analyze: vi.fn(async (fen: string) => {
      const cached = resultsByFen.get(fen);
      if (!cached) {
        throw new Error(`Missing fake result for ${fen}`);
      }

      let score: UciScore | null = null;
      if (cached.evaluation) {
        score =
          cached.evaluation.type === "cp"
            ? { type: "cp", value: cached.evaluation.value * 100 }
            : { type: "mate", value: cached.evaluation.value };
      }

      return {
        fen,
        bestMove: cached.bestMove,
        depth: cached.depth,
        score,
        principalVariation: cached.principalVariation,
        lines: cached.lines.map((line) => {
          let lineScore: UciScore | null = null;
          if (line.evaluation) {
            lineScore =
              line.evaluation.type === "cp"
                ? { type: "cp", value: line.evaluation.value * 100 }
                : { type: "mate", value: line.evaluation.value };
          }

          return {
            bestMove: line.bestMove,
            principalVariation: line.principalVariation,
            depth: line.depth,
            score: lineScore,
          };
        }),
      };
    }),
    stop: vi.fn(),
    destroy: vi.fn(),
    subscribe: vi.fn(() => () => {}),
  };
}

const SAMPLE_PGN = `[Event "Test"]
[White "A"]
[Black "B"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 1-0`;

describe("analyzeGame", () => {
  it("analyzes every move with correct metadata", async () => {
    const parsed = parsePgn(SAMPLE_PGN);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const { moves } = parsed.game;
    const resultsByFen = new Map<string, EngineAnalysis>();

    resultsByFen.set(parsed.game.initialFen, createAnalysis(parsed.game.initialFen, 0.3, "e2e4"));
    for (const move of moves) {
      resultsByFen.set(move.fenBefore, createAnalysis(move.fenBefore, 0.2, move.uci));
      resultsByFen.set(move.fenAfter, createAnalysis(move.fenAfter, 0.1, "e2e4"));
    }

    const engine = createFakeEngine(resultsByFen);
    const cache = new AnalysisCache();
    const onProgress = vi.fn();

    const result = await analyzeGame(engine, cache, moves, DEFAULT_ANALYSIS_SETTINGS, {
      onProgress,
    });

    expect(result.moves).toHaveLength(4);
    expect(result.moves.map((move) => move.ply)).toEqual([1, 2, 3, 4]);
    expect(result.moves[0].color).toBe("white");
    expect(result.moves[0].moveNumber).toBe(1);
    expect(result.moves[0].playedMove).toBe("e4");
    expect(result.moves.every((move) => move.classification)).toBe(true);
    expect(onProgress.mock.calls.length).toBeGreaterThan(0);
    expect(engine.analyze).toHaveBeenCalledTimes(5);
    expect(result.moves).toHaveLength(4);

    const reportedProgress = onProgress.mock.calls.map(([progress]) => progress);
    expect(reportedProgress.every((progress) => progress.current <= progress.total)).toBe(true);
    expect(reportedProgress.at(-1)).toMatchObject({ current: 8, total: 8 });
  });

  it("reuses cache so fenBefore of move N hits fenAfter of move N-1", async () => {
    const parsed = parsePgn(SAMPLE_PGN);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const { moves } = parsed.game;
    const resultsByFen = new Map<string, EngineAnalysis>();
    resultsByFen.set(parsed.game.initialFen, createAnalysis(parsed.game.initialFen, 0.3, "e2e4"));
    for (const move of moves) {
      resultsByFen.set(move.fenBefore, createAnalysis(move.fenBefore, 0.2, move.uci));
      resultsByFen.set(move.fenAfter, createAnalysis(move.fenAfter, 0.1, "e2e4"));
    }

    const engine = createFakeEngine(resultsByFen);
    const cache = new AnalysisCache();

    await analyzeGame(engine, cache, moves, DEFAULT_ANALYSIS_SETTINGS);

    expect(engine.analyze).toHaveBeenCalledTimes(5);
  });
});
