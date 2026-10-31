"use client";

import { Button } from "@/components/ui/Button";
import type { GameAnalysisProgress } from "@/lib/analysis/types";

type AnalysisProgressCardProps = {
  progress: GameAnalysisProgress;
  onCancel: () => void;
};

export function AnalysisProgressCard({
  progress,
  onCancel,
}: AnalysisProgressCardProps) {
  const percent =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-100">Analyzing game</p>
          <p className="mt-1 text-xs text-zinc-500">
            Position {progress.current} / {progress.total}
            {progress.currentMove ? ` · move ${progress.currentMove}` : null}
            {progress.engineDepth ? ` · depth ${progress.engineDepth}` : null}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full bg-zinc-200 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-zinc-500">{percent}% complete</p>
    </div>
  );
}
