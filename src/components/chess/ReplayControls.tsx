"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type ReplayControlsProps = {
  canGoBack: boolean;
  canGoForward: boolean;
  currentPly: number;
  totalPlies: number;
  onFirst: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onLast: () => void;
  onFlip: () => void;
  onNewBoard: () => void;
};

function IconButton({
  label,
  title,
  onClick,
  disabled,
  children,
}: {
  label: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function ReplayControls({
  canGoBack,
  canGoForward,
  currentPly,
  totalPlies,
  onFirst,
  onPrevious,
  onNext,
  onLast,
  onFlip,
  onNewBoard,
}: ReplayControlsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <IconButton label="First position" title="First position (Home)" onClick={onFirst} disabled={!canGoBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M3 3v10H1V3h2zm11 0v10h-2V3h2zM5 8l6-4v8L5 8z" />
          </svg>
        </IconButton>
        <IconButton label="Previous move" title="Previous move (←)" onClick={onPrevious} disabled={!canGoBack}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M10 3L5 8l5 5V3z" />
          </svg>
        </IconButton>
        <IconButton label="Next move" title="Next move (→)" onClick={onNext} disabled={!canGoForward}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M6 3l5 5-5 5V3z" />
          </svg>
        </IconButton>
        <IconButton label="Last position" title="Last position (End)" onClick={onLast} disabled={!canGoForward}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M2 3v10H0V3h2zm11 0v10h-2V3h2zM5 8l6-4v8L5 8z" />
          </svg>
        </IconButton>

        <p className="ml-2 text-sm text-zinc-400" aria-live="polite">
          Move {currentPly} / {totalPlies}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={onFlip} variant="ghost">
          Flip board
        </Button>
        <Button onClick={onNewBoard} variant="secondary">
          New board
        </Button>
      </div>
    </div>
  );
}
