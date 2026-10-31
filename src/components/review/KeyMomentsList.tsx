"use client";

import { classificationLabel } from "@/lib/analysis/classification";
import { formatEvaluation } from "@/lib/engine/uci";
import type { KeyMoment } from "@/lib/review/types";

type KeyMomentsListProps = {
  moments: KeyMoment[];
  selectedPly: number;
  onSelectPly: (ply: number) => void;
  onExplain?: (ply: number) => void;
};

function momentLabel(moment: KeyMoment): string {
  switch (moment.type) {
    case "mate":
      return moment.mateKind === "missed" ? "Missed mate" : "Allowed mate";
    case "missed-win":
      return "Missed win";
    case "turning-point":
      return "Turning point";
    case "blunder":
      return "Game-changing error";
    default:
      return moment.type;
  }
}

export function KeyMomentsList({
  moments,
  selectedPly,
  onSelectPly,
  onExplain,
}: KeyMomentsListProps) {
  if (moments.length === 0) {
    return <p className="text-sm text-zinc-500">No major key moments detected.</p>;
  }

  return (
    <ul className="space-y-2">
      {moments.map((moment) => (
        <li key={moment.ply}>
          <button
            type="button"
            onClick={() => onSelectPly(moment.ply)}
            className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
              selectedPly === moment.ply
                ? "border-zinc-200 bg-zinc-100 text-zinc-950"
                : "border-zinc-800 bg-zinc-900/40 text-zinc-200 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                {moment.color === "white" ? `${moment.moveNumber}.` : `${moment.moveNumber}...`}{" "}
                {moment.playedMove}
              </span>
              <span className="text-xs uppercase tracking-wide text-zinc-500">
                {momentLabel(moment)}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {formatEvaluation(moment.evaluationBefore)} →{" "}
              {formatEvaluation(moment.evaluationAfter)} ·{" "}
              {classificationLabel(moment.classification)}
            </p>
            {onExplain ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onExplain(moment.ply);
                }}
                className="mt-2 text-xs text-zinc-400 underline hover:text-zinc-200"
              >
                Explain
              </button>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
