import type { EngineInfo, Evaluation, UciScore } from "@/lib/engine/types";

export type BestMoveResult = {
  bestMove: string | null;
  ponder?: string;
};

export function parseScore(tokens: string[], startIndex: number): { score: UciScore; nextIndex: number } | null {
  const scoreType = tokens[startIndex + 1];
  const rawValue = Number(tokens[startIndex + 2]);

  if (Number.isNaN(rawValue)) {
    return null;
  }

  if (scoreType === "cp") {
    return {
      score: { type: "cp", value: rawValue },
      nextIndex: startIndex + 3,
    };
  }

  if (scoreType === "mate") {
    return {
      score: { type: "mate", value: rawValue },
      nextIndex: startIndex + 3,
    };
  }

  return null;
}

export function parseInfoLine(line: string): EngineInfo | null {
  if (!line.startsWith("info ")) {
    return null;
  }

  const tokens = line.trim().split(/\s+/);
  if (tokens.includes("string") || tokens.includes("currmove") || tokens.includes("currmovenumber")) {
    return null;
  }

  let depth = -1;
  let seldepth: number | undefined;
  let multipv = 1;
  let score: UciScore | undefined;
  let hasBound = false;
  let nodes: number | undefined;
  let nps: number | undefined;
  let timeMs: number | undefined;
  const pv: string[] = [];

  for (let i = 1; i < tokens.length; i += 1) {
    const token = tokens[i];

    switch (token) {
      case "depth":
        depth = Number(tokens[i + 1]);
        i += 1;
        break;
      case "seldepth":
        seldepth = Number(tokens[i + 1]);
        i += 1;
        break;
      case "multipv":
        multipv = Number(tokens[i + 1]);
        i += 1;
        break;
      case "lowerbound":
      case "upperbound":
        hasBound = true;
        break;
      case "score": {
        const parsed = parseScore(tokens, i);
        if (parsed) {
          score = parsed.score;
          i = parsed.nextIndex - 1;
        }
        break;
      }
      case "nodes":
        nodes = Number(tokens[i + 1]);
        i += 1;
        break;
      case "nps":
        nps = Number(tokens[i + 1]);
        i += 1;
        break;
      case "time":
        timeMs = Number(tokens[i + 1]);
        i += 1;
        break;
      case "pv":
        pv.push(...tokens.slice(i + 1));
        i = tokens.length;
        break;
      default:
        break;
    }
  }

  if (depth < 0) {
    return null;
  }

  return {
    depth,
    seldepth,
    multipv,
    score,
    hasBound,
    nodes,
    nps,
    timeMs,
    pv,
  };
}

export function parseBestMove(line: string): BestMoveResult | null {
  if (!line.startsWith("bestmove ")) {
    return null;
  }

  const tokens = line.trim().split(/\s+/);
  const moveToken = tokens[1];

  if (!moveToken || moveToken === "(none)") {
    return { bestMove: null };
  }

  const ponderIndex = tokens.indexOf("ponder");
  const ponder = ponderIndex >= 0 ? tokens[ponderIndex + 1] : undefined;

  return {
    bestMove: moveToken,
    ponder,
  };
}

export function sideToMoveFromFen(fen: string): "w" | "b" {
  const parts = fen.trim().split(/\s+/);
  return parts[1] === "b" ? "b" : "w";
}

export function normalizeEvaluation(score: UciScore, sideToMove: "w" | "b"): Evaluation {
  if (sideToMove === "w") {
    if (score.type === "cp") {
      return { type: "cp", value: score.value / 100 };
    }
    return { type: "mate", value: score.value };
  }

  if (score.type === "cp") {
    return { type: "cp", value: -score.value / 100 };
  }

  return { type: "mate", value: -score.value };
}

export function formatEvaluation(evaluation: Evaluation | null): string {
  if (!evaluation) {
    return "—";
  }

  if (evaluation.type === "mate") {
    if (evaluation.value === 0) {
      return "#";
    }
    const sign = evaluation.value > 0 ? "+" : "-";
    return `${sign}M${Math.abs(evaluation.value)}`;
  }

  const sign = evaluation.value > 0 ? "+" : evaluation.value < 0 ? "" : "";
  return `${sign}${evaluation.value.toFixed(2)}`;
}

/** @deprecated Use normalizeEvaluation */
export function scoreToWhitePov(score: UciScore, sideToMove: "w" | "b"): UciScore {
  if (sideToMove === "w") {
    return score;
  }

  if (score.type === "cp") {
    return { type: "cp", value: -score.value };
  }

  return { type: "mate", value: -score.value };
}

/** @deprecated Use formatEvaluation after normalizeEvaluation */
export function formatScore(score: UciScore): string {
  return formatEvaluation(normalizeEvaluation(score, "w"));
}
