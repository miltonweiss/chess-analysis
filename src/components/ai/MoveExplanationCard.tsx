"use client";

import { Button } from "@/components/ui/Button";
import type { MoveExplanation } from "@/lib/ai/types";

type MoveExplanationCardProps = {
  explanation: MoveExplanation;
  cached?: boolean;
  onRegenerate?: () => void;
};

export function MoveExplanationCard({
  explanation,
  cached,
  onRegenerate,
}: MoveExplanationCardProps) {
  return (
    <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-zinc-100">{explanation.headline}</h4>
        {cached ? (
          <span className="shrink-0 text-xs text-zinc-500">cached</span>
        ) : null}
      </div>

      <section>
        <p className="text-xs uppercase tracking-wide text-zinc-500">What happened</p>
        <p className="mt-1 text-sm text-zinc-300">{explanation.summary}</p>
      </section>

      <section>
        <p className="text-xs uppercase tracking-wide text-zinc-500">Why it matters</p>
        <p className="mt-1 text-sm text-zinc-300">{explanation.whyItMatters}</p>
      </section>

      {explanation.betterIdea ? (
        <section>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Better idea</p>
          <p className="mt-1 text-sm text-zinc-300">{explanation.betterIdea}</p>
        </section>
      ) : null}

      <section>
        <p className="text-xs uppercase tracking-wide text-zinc-500">Lesson</p>
        <p className="mt-1 text-sm text-zinc-300">{explanation.lesson}</p>
      </section>

      {explanation.reasonClarity !== "supported" ? (
        <p className="text-xs text-yellow-500/80">
          {explanation.reasonClarity === "unclear"
            ? "The engine data does not make the reason fully clear."
            : "The explanation is only partly supported by the engine data."}
        </p>
      ) : null}

      {onRegenerate ? (
        <Button variant="ghost" size="sm" onClick={onRegenerate}>
          Regenerate
        </Button>
      ) : null}
    </div>
  );
}
