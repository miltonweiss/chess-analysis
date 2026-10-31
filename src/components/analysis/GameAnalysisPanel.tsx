"use client";

import { Button } from "@/components/ui/Button";
import { classificationLabel } from "@/lib/analysis/classification";
import type { MoveAnalysis } from "@/lib/analysis/types";
import type { GameAnalysisProgress, GameAnalysisState } from "@/lib/analysis/types";
import { DEPTH_OPTIONS } from "@/lib/engine/settings";
import { formatEvaluation } from "@/lib/engine/uci";
import type { EngineStatus } from "@/lib/engine/types";

type GameAnalysisPanelProps = {
  engineStatus: EngineStatus;
  hasMoves: boolean;
  gameAnalysisState: GameAnalysisState;
  progress: GameAnalysisProgress | null;
  selectedMoveAnalysis: MoveAnalysis | null;
  depth: number;
  error: string | null;
  onDepthChange: (depth: number) => void;
  onAnalyzeGame: () => void;
  onStopGame: () => void;
};

export function GameAnalysisPanel({
  engineStatus,
  hasMoves,
  gameAnalysisState,
  progress,
  selectedMoveAnalysis,
  depth,
  error,
  onDepthChange,
  onAnalyzeGame,
  onStopGame,
}: GameAnalysisPanelProps) {
  const isAnalyzing = gameAnalysisState.type === "analyzing";
  const canAnalyze =
    hasMoves && (engineStatus === "ready" || engineStatus === "analyzing") && !isAnalyzing;

  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <section className="w-full space-y-4 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Game Review</p>
          <p className="mt-1 text-sm text-zinc-400">
            Classify every move with Stockfish (sequential, cached positions).
          </p>
          {error ? (
            <p className="mt-1 text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-zinc-500" htmlFor="game-analysis-depth">
            Depth
          </label>
          <select
            id="game-analysis-depth"
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
            <Button onClick={onStopGame} variant="secondary">
              Cancel analysis
            </Button>
          ) : (
            <Button onClick={onAnalyzeGame} disabled={!canAnalyze} variant="primary">
              Analyze game
            </Button>
          )}
        </div>
      </div>

      {isAnalyzing && progress ? (
        <div className="space-y-2" aria-live="polite">
          <p className="text-sm text-zinc-300">
            Analyzing game… move {progress.current} / {progress.total}
          </p>
          <p className="text-xs text-zinc-500">
            Current player: {progress.currentColor === "white" ? "White" : "Black"}
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-zinc-200 transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500">{progressPercent}%</p>
        </div>
      ) : null}

      {gameAnalysisState.type === "error" ? (
        <p className="text-sm text-red-400" role="alert">
          {gameAnalysisState.message}
        </p>
      ) : null}

      {selectedMoveAnalysis ? (
        <MoveAnalysisDetail analysis={selectedMoveAnalysis} />
      ) : gameAnalysisState.type === "complete" ? (
        <p className="text-sm text-zinc-500">
          Click a classified move in the list to inspect its analysis.
        </p>
      ) : null}
    </section>
  );
}

function MoveAnalysisDetail({ analysis }: { analysis: MoveAnalysis }) {
  return (
    <dl className="grid gap-2 border-t border-zinc-800 pt-4 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-zinc-500">Played</dt>
        <dd className="font-mono text-zinc-100">{analysis.playedMove}</dd>
      </div>
      <div>
        <dt className="text-zinc-500">Best</dt>
        <dd className="font-mono text-zinc-100">
          {analysis.bestMoveSan ?? analysis.bestMove ?? "—"}
        </dd>
      </div>
      <div>
        <dt className="text-zinc-500">Evaluation before</dt>
        <dd className="font-mono text-zinc-100">
          {formatEvaluation(analysis.evaluationBefore)}
        </dd>
      </div>
      <div>
        <dt className="text-zinc-500">Evaluation after</dt>
        <dd className="font-mono text-zinc-100">
          {formatEvaluation(analysis.evaluationAfter)}
        </dd>
      </div>
      <div>
        <dt className="text-zinc-500">Loss</dt>
        <dd className="font-mono text-zinc-100">{analysis.evaluationLoss.toFixed(2)}</dd>
      </div>
      <div>
        <dt className="text-zinc-500">Classification</dt>
        <dd className="font-mono text-zinc-100">
          {classificationLabel(analysis.classification)}
        </dd>
      </div>
    </dl>
  );
}
