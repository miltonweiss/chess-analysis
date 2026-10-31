"use client";

import { Button } from "@/components/ui/Button";

type ReviewEmptyStatesProps = {
  variant: "no-game" | "ready" | "error" | "cancelled";
  errorMessage?: string;
  onAnalyze?: () => void;
  onRetry?: () => void;
};

export function ReviewEmptyStates({
  variant,
  errorMessage,
  onAnalyze,
  onRetry,
}: ReviewEmptyStatesProps) {
  switch (variant) {
    case "no-game":
      return (
        <p className="text-sm text-zinc-500">
          Import a PGN to start analyzing.
        </p>
      );
    case "ready":
      return (
        <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <p className="text-sm text-zinc-300">Ready for analysis</p>
          <p className="text-xs text-zinc-500">
            Run a full-game review to compute accuracy, key moments, and the evaluation graph.
          </p>
          {onAnalyze ? (
            <Button variant="primary" size="sm" onClick={onAnalyze}>
              Analyze game
            </Button>
          ) : null}
        </div>
      );
    case "error":
      return (
        <div className="space-y-3 rounded-lg border border-red-900/50 bg-red-950/20 p-4">
          <p className="text-sm text-red-200">Analysis failed</p>
          <p className="text-xs text-red-300/80">{errorMessage ?? "Unknown error"}</p>
          {onRetry ? (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
        </div>
      );
    case "cancelled":
      return (
        <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <p className="text-sm text-zinc-300">Analysis cancelled</p>
          <p className="text-xs text-zinc-500">
            Partial results were discarded. Cached positions are kept — re-run to resume quickly.
          </p>
          {onRetry ? (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              Analyze again
            </Button>
          ) : null}
        </div>
      );
  }
}
