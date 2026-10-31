"use client";

import type { MoveClassification } from "@/lib/analysis/types";
import { CLASSIFICATION_STYLES } from "@/lib/analysis/classificationDisplay";

type ClassificationIconProps = {
  classification: MoveClassification;
  size?: "sm" | "md" | "lg" | "board";
  className?: string;
};

export function ClassificationIcon({
  classification,
  size = "md",
  className = "",
}: ClassificationIconProps) {
  const style = CLASSIFICATION_STYLES[classification];
  if (!style) {
    return null;
  }

  const sizeClasses = {
    sm: "h-3.5 w-3.5 text-[9px]",
    md: "h-5 w-5 text-xs",
    lg: "h-7 w-7 text-sm",
    board: "h-full w-full text-[45cqmin] shadow-md ring-2 ring-black/40",
  }[size];

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white shadow-sm transition-transform select-none ${style.badgeBgClass} ${sizeClasses} ${className}`}
      title={style.label}
      aria-label={style.label}
    >
      <span className="leading-none">{style.glyph}</span>
    </span>
  );
}
