"use client";

import { Button } from "@/components/ui/Button";
import { DEPTH_OPTIONS } from "@/lib/engine/settings";
import { formatEvaluation } from "@/lib/engine/uci";
import type {
  AnalysisProgress,
  AnalysisState,
  EngineAnalysis,
  EngineIdentity,
  EngineStatus,
} from "@/lib/engine/types";
import type { GamePosition } from "@/lib/chess/types";

type AnalysisPanelProps = {
  engineStatus: EngineStatus;
  identity: EngineIdentity | null;
  engineError: string | null;
  analysisState: AnalysisState;
  progress: AnalysisProgress | null;
  result: EngineAnalysis | null;
  currentPosition: GamePosition;
  depth: number;
  onDepthChange: (depth: number) => void;
  onAnalyze: () => void;
  onStop: () => void;
};

function engineStatusLabel(status: EngineStatus): string {
  switch (status) {
    case "idle":
      return "Idle";
    case "initializing":
      return "Initializing";
    case "ready":
      return "Ready";
    case "analyzing":
      return "Analyzing";
    case "error":
      return "Error";
    case "destroyed":
      return "Destroyed";
    default:
      return status;
  }
}

function formatPositionLabel(position: GamePosition): string {
  if (position.ply === 0) {
    return "Starting position";
  }

  const move = position.move;
  if (!move) {
    return `Position ${position.ply}`;
  }

  const prefix = move.color === "white" ? `${move.moveNumber}.` : `${move.moveNumber}...`;
  return `Position ${position.ply} · after ${prefix} ${move.san}`;
}

function truncatePv(moves: string[], limit = 10): string {
  if (moves.length === 0) {
    return "—";
  }

  const visible = moves.slice(0, limit);
  const suffix = moves.length > limit ? " ..." : "";
  return `${visible.join(" ")}${suffix}`;
}

export function AnalysisPanel({
  engineStatus,
  identity,
  engineError,
  analysisState,
  progress,
  result,
  currentPosition,
  depth,
  onDepthChange,
  onAnalyze,
  onStop,
}: AnalysisPanelProps) {
  const isAnalyzing = analysisState.type === "analyzing";
  const canAnalyze = engineStatus === "ready" || engineStatus === "analyzing";
  const displayEvaluation = progress?.evaluation ?? result?.evaluation ?? null;
  const displayDepth = progress?.depth ?? result?.depth ?? depth;

  return (
    <section className="w-full space-y-4 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Engine</p>
          <p className="mt-1 text-sm text-zinc-200">
            {engineStatusLabel(engineStatus)}
            {identity ? ` · ${identity.name}` : ""}
          </p>
          <p className="mt-1 text-sm text-zinc-400">{formatPositionLabel(currentPosition)}</p>
          {engineError ? (
            <p className="mt-1 text-sm text-red-400" role="alert">
              {engineError}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-zinc-500" htmlFor="analysis-depth">
            Depth
          </label>
          <select
            id="analysis-depth"
            value={depth}
            disabled={isAnalyzing}
            onChange={(event) => onDepthChange(Number(event.target.value))}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
          >
            {DEPTH_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          {isAnalyzing ? (
            <Button onClick={onStop} variant="secondary">
              Stop
            </Button>
          ) : (
            <Button onClick={onAnalyze} disabled={!canAnalyze} variant="primary">
              Analyze position
            </Button>
          )}
        </div>
      </div>

      {isAnalyzing ? (
        <p className="text-sm text-zinc-300" aria-live="polite">
          Analyzing... depth {displayDepth}
          {displayEvaluation ? ` · ${formatEvaluation(displayEvaluation)}` : ""}
        </p>
      ) : null}

      {analysisState.type === "error" ? (
        <p className="text-sm text-red-400" role="alert">
          {analysisState.message}
        </p>
      ) : null}

      {result ? (
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-zinc-500">Evaluation</dt>
            <dd className="font-mono text-zinc-100">{formatEvaluation(result.evaluation)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Depth</dt>
            <dd className="font-mono text-zinc-100">{result.depth}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-zinc-500">Best move</dt>
            <dd className="font-mono text-zinc-100">{result.bestMove ?? "(none)"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-zinc-500">Principal variation</dt>
            <dd className="font-mono text-xs text-zinc-300">
              {truncatePv(result.principalVariation)}
            </dd>
          </div>
          {result.source === "cache" ? (
            <div className="sm:col-span-2">
              <dd className="text-xs text-zinc-500">Served from cache</dd>
            </div>
          ) : null}
          {result.terminal ? (
            <div className="sm:col-span-2">
              <dd className="text-xs text-zinc-500">Terminal position: {result.terminal}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </section>
  );
}
