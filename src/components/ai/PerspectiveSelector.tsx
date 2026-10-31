"use client";

import type { ExplanationPerspective } from "@/lib/ai/types";

type PerspectiveSelectorProps = {
  value: ExplanationPerspective;
  onChange: (value: ExplanationPerspective) => void;
};

const OPTIONS: { value: ExplanationPerspective; label: string }[] = [
  { value: "neutral", label: "Neither" },
  { value: "white", label: "White" },
  { value: "black", label: "Black" },
];

export function PerspectiveSelector({ value, onChange }: PerspectiveSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-500">I played as:</span>
      <div className="flex gap-1">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded px-2 py-1 text-xs transition-colors ${
              value === option.value
                ? "bg-zinc-100 text-zinc-950"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
