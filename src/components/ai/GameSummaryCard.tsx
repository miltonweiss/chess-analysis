"use client";

import { Button } from "@/components/ui/Button";
import type { GameSummary } from "@/lib/ai/types";

type GameSummaryCardProps = {
  summary: GameSummary;
  cached?: boolean;
  onRegenerate?: () => void;
};

export function GameSummaryCard({
  summary,
  cached,
  onRegenerate,
}: GameSummaryCardProps) {
  return (
    <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-zinc-100">{summary.headline}</h4>
        {cached ? (
          <span className="shrink-0 text-xs text-zinc-500">cached</span>
        ) : null}
      </div>

      <section>
        <p className="text-xs uppercase tracking-wide text-zinc-500">Overview</p>
        <p className="mt-1 text-sm text-zinc-300">{summary.overview}</p>
      </section>

      {summary.turningPoint ? (
        <section>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Turning point</p>
          <p className="mt-1 text-sm text-zinc-300">{summary.turningPoint}</p>
        </section>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <section>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Main strength</p>
          <p className="mt-1 text-sm text-zinc-300">{summary.mainStrength}</p>
        </section>
        <section>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Main weakness</p>
          <p className="mt-1 text-sm text-zinc-300">{summary.mainWeakness}</p>
        </section>
      </div>

      <section>
        <p className="text-xs uppercase tracking-wide text-zinc-500">Key lesson</p>
        <p className="mt-1 text-sm text-zinc-300">{summary.keyLesson}</p>
      </section>

      {onRegenerate ? (
        <Button variant="ghost" size="sm" onClick={onRegenerate}>
          Regenerate
        </Button>
      ) : null}
    </div>
  );
}
