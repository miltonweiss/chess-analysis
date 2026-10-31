import { Chess, validateFen } from "chess.js";
import type { AnalysisCache } from "@/lib/engine/analysisCache";
import type { AnalysisSettings } from "@/lib/engine/settings";
import type {
  AnalysisProgress,
  ChessEngine,
  EngineAnalysis,
  EngineSearchResult,
} from "@/lib/engine/types";
import { EngineAbortedError } from "@/lib/engine/types";
import { normalizeEvaluation, sideToMoveFromFen } from "@/lib/engine/uci";

type AnalyzePositionOptions = {
  signal?: AbortSignal;
  onProgress?: (progress: AnalysisProgress) => void;
};

function searchResultToAnalysis(
  fen: string,
  settings: AnalysisSettings,
  result: EngineSearchResult,
  source: EngineAnalysis["source"],
  terminal?: EngineAnalysis["terminal"],
): EngineAnalysis {
  const sideToMove = sideToMoveFromFen(fen);
  const lines = result.lines.map((line) => ({
    bestMove: line.bestMove,
    principalVariation: line.principalVariation,
    depth: line.depth,
    evaluation: line.score ? normalizeEvaluation(line.score, sideToMove) : null,
  }));

  return {
    fen,
    depth: result.depth,
    evaluation: result.score ? normalizeEvaluation(result.score, sideToMove) : null,
    bestMove: result.bestMove,
    principalVariation: result.principalVariation,
    lines,
    nodes: result.nodes,
    timeMs: result.timeMs,
    settings,
    source,
    terminal,
  };
}

function analyzeTerminalPosition(fen: string, settings: AnalysisSettings): EngineAnalysis | null {
  const chess = new Chess(fen);

  if (chess.isCheckmate()) {
    const sideToMove = sideToMoveFromFen(fen);
    const winner = sideToMove === "w" ? "black" : "white";

    return {
      fen,
      depth: 0,
      evaluation: { type: "mate", value: 0 },
      bestMove: null,
      principalVariation: [],
      lines: [],
      settings,
      source: "terminal",
      terminal: "checkmate",
      winner,
    };
  }

  if (chess.isStalemate()) {
    return {
      fen,
      depth: 0,
      evaluation: { type: "cp", value: 0 },
      bestMove: null,
      principalVariation: [],
      lines: [],
      settings,
      source: "terminal",
      terminal: "stalemate",
    };
  }

  return null;
}

export async function analyzePosition(
  engine: ChessEngine,
  cache: AnalysisCache,
  fen: string,
  settings: AnalysisSettings,
  options: AnalyzePositionOptions = {},
): Promise<EngineAnalysis> {
  const validation = validateFen(fen);
  if (!validation.ok) {
    throw new Error(validation.error ?? "Invalid FEN");
  }

  const cached = cache.get(fen, settings);
  if (cached) {
    return { ...cached, source: "cache" };
  }

  const terminal = analyzeTerminalPosition(fen, settings);
  if (terminal) {
    cache.set(fen, settings, terminal);
    return terminal;
  }

  try {
    const searchResult = await engine.analyze(
      fen,
      {
        depth: settings.depth,
        movetime: settings.movetime,
        multipv: settings.multipv,
        signal: options.signal,
      },
      options.onProgress,
    );

    const analysis = searchResultToAnalysis(fen, settings, searchResult, "engine");
    cache.set(fen, settings, analysis);
    return analysis;
  } catch (error) {
    if (error instanceof EngineAbortedError) {
      throw error;
    }
    throw error;
  }
}
