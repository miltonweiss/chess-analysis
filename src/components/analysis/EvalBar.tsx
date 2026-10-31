"use client";

import type { PlayerColor } from "@/lib/chess/types";

type EvalBarProps = {
  /** Win chance for White, 0–100. 50 is equal. */
  winPercent: number;
  orientation: PlayerColor;
  label?: string;
};

export function EvalBar({ winPercent, orientation, label }: EvalBarProps) {
  const whiteShare = Math.max(0, Math.min(100, winPercent));
  const whiteFromBottom = orientation === "white";
  const topIsLight = whiteFromBottom ? whiteShare > 92 : whiteShare > 8;

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-sm bg-zinc-800"
      role="img"
      aria-label={label ? `Evaluation ${label}` : "Evaluation even"}
    >
      <div
        className="absolute inset-x-0 bg-zinc-100 transition-[height] duration-200"
        style={{
          height: `${whiteShare}%`,
          bottom: whiteFromBottom ? 0 : undefined,
          top: whiteFromBottom ? undefined : 0,
        }}
      />
      {label ? (
        <span
          className={`absolute inset-x-0 top-1 text-center font-mono text-[10px] font-semibold leading-none ${
            topIsLight ? "text-zinc-900" : "text-zinc-100"
          }`}
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}
