"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { ClassificationIcon } from "@/components/review/ClassificationIcon";
import { classificationLabel } from "@/lib/analysis/classification";
import { classificationColorClass } from "@/lib/analysis/classificationDisplay";
import type { MoveAnalysis } from "@/lib/analysis/types";
import { formatEvaluation } from "@/lib/engine/uci";
import type { PreviewState } from "@/hooks/useMovePreview";

type ExplanationView =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; summary: string; lesson: string }
  | { status: "error"; message: string };

type MoveCoachProps = {
  analysis: MoveAnalysis | null;
  moveLabel?: string | null;
  preview: {
    state: PreviewState;
    startBestLine: () => void;
    stepBestLine: (direction: number) => void;
    startRetry: () => void;
    startExplore: () => void;
    stepExplore: (direction: number) => void;
    jumpExplore: (index: number) => void;
    resetExplore: () => void;
    cancel: () => void;
  };
  hasBestLine: boolean;
  canGoNext: boolean;
  canGoPreviousMistake: boolean;
  canGoNextMistake: boolean;
  onPreviousMistake: () => void;
  onNextMistake: () => void;
  onNextMove: () => void;
  explanation: ExplanationView;
  onExplain: () => void;
  onRegenerate: () => void;
  onCancelExplain: () => void;
};

function coachSentence(analysis: MoveAnalysis): string {
  const move = analysis.playedMove;
  const best = analysis.bestMoveSan ?? analysis.bestMove;
  const sameAsBest = !best || best === analysis.playedMove;

  switch (analysis.classification) {
    case "brilliant":
      return `${move} is a brilliant move! A crushing tactical sacrifice.`;
    case "great":
      return `${move} is a great find! The only move that held the position.`;
    case "best":
      return `${move} is the best move.`;
    case "excellent":
      return `${move} is an excellent move.`;
    case "good":
      return `${move} is a solid move.`;
    case "book":
      return `${move} is opening book theory.`;
    case "forced":
      return `${move} was forced.`;
    case "inaccuracy":
      return `${move} is an inaccuracy.${!sameAsBest && best ? ` Best was ${best}.` : ""}`;
    case "mistake":
      return `${move} is a mistake.${!sameAsBest && best ? ` Best was ${best}.` : ""}`;
    case "miss":
      return `${move} misses a tactical opportunity!${!sameAsBest && best ? ` Best was ${best}.` : ""}`;
    case "blunder":
      return `${move} is a blunder!${!sameAsBest && best ? ` Best was ${best}.` : ""}`;
    default:
      return `${move} was played.`;
  }
}

const BEST_LINE_WINDOW = 8;

function StatusDot({ className }: { className: string }) {
  return <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${className}`} />;
}

function CloseButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="shrink-0 rounded px-1.5 py-0.5 text-sm leading-none text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
    >
      ×
    </button>
  );
}

function IconAction({
  label,
  onClick,
  tone = "secondary",
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  tone?: "secondary" | "primary";
  disabled?: boolean;
  children: ReactNode;
}) {
  const stateClass = disabled
    ? "cursor-default border-zinc-800 bg-zinc-900/60 text-zinc-700"
    : tone === "primary"
      ? "border-zinc-200 bg-zinc-100 text-zinc-950 hover:bg-white"
      : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800 hover:text-zinc-100";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${stateClass}`}
    >
      {children}
    </button>
  );
}

const iconProps = {
  width: 14,
  height: 14,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function TargetIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

function RetryIcon() {
  return (
    <svg {...iconProps}>
      <path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9" />
      <path d="M2.5 2.5v3h3" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg {...iconProps}>
      <path d="M6 3l5 5-5 5" />
    </svg>
  );
}

export function MoveCoach({
  analysis,
  moveLabel,
  preview,
  hasBestLine,
  canGoNext,
  canGoPreviousMistake,
  canGoNextMistake,
  onPreviousMistake,
  onNextMistake,
  onNextMove,
  explanation,
  onExplain,
  onRegenerate,
  onCancelExplain,
}: MoveCoachProps) {
  const exploreState = preview.state.type === "explore" ? preview.state : null;
  const retryState = preview.state.type === "retry" ? preview.state : null;
  const bestLineState = preview.state.type === "best_line" ? preview.state : null;

  // The best line can keep growing, so only show a window of moves around the current step.
  const bestLineStart = bestLineState
    ? Math.max(0, Math.min(bestLineState.stepIndex - 3, bestLineState.sans.length - BEST_LINE_WINDOW))
    : 0;
  const bestLineChips = bestLineState
    ? bestLineState.sans.slice(bestLineStart, bestLineStart + BEST_LINE_WINDOW)
    : [];

  const isMistakeOrWorse = Boolean(
    analysis &&
      ["inaccuracy", "mistake", "miss", "blunder"].includes(analysis.classification),
  );

  const bestSan = analysis?.bestMoveSan ?? analysis?.bestMove;

  // Action buttons are always rendered; they are disabled when they don't apply.
  const canShowBest = Boolean(hasBestLine && !bestLineState && !exploreState);
  const canRetry = Boolean(isMistakeOrWorse && !retryState && !exploreState);
  const canNextMove = Boolean(canGoNext && !exploreState);
  return (
    <section className="space-y-3 px-4 py-3">
      {!analysis && !exploreState ? (
        <p className="text-[13px] text-zinc-400">{moveLabel ?? "Starting position"}</p>
      ) : null}

      {analysis && !exploreState ? (
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <ClassificationIcon classification={analysis.classification} size="md" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${classificationColorClass(analysis.classification)}`}>
                  {classificationLabel(analysis.classification)}
                </span>
                <span className="text-xs tabular-nums text-zinc-500">
                  {analysis.color === "white" ? `${analysis.moveNumber}.` : `${analysis.moveNumber}...`} {analysis.playedMove}
                </span>
              </div>
              <p className="text-[13px] leading-snug text-zinc-300">{coachSentence(analysis)}</p>
            </div>
          </div>

          {analysis.evaluationAfter ? (
            <span className="shrink-0 text-xs font-medium tabular-nums text-zinc-400">
              {formatEvaluation(analysis.evaluationAfter)}
            </span>
          ) : null}
        </div>
      ) : null}

      {exploreState ? (
        <div className="flex items-center gap-2">
          <StatusDot className="bg-cyan-400" />
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 font-mono text-xs">
            {exploreState.sans.map((san, idx) => (
              <button
                key={`${san}-${idx}`}
                type="button"
                onClick={() => preview.jumpExplore(idx + 1)}
                className={`rounded px-1.5 py-0.5 transition-colors ${
                  exploreState.stepIndex === idx + 1
                    ? "bg-cyan-500/20 font-semibold text-cyan-200"
                    : "text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                {san}
              </button>
            ))}
          </div>
          <CloseButton label="Back to game (Esc)" onClick={preview.cancel} />
        </div>
      ) : null}

      {retryState ? (
        <div className="flex items-center gap-2 text-xs">
          <StatusDot className="bg-amber-400" />
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {retryState.result === "correct" ? (
              <span className="font-medium text-emerald-400">Correct: {retryState.lastAttemptSan}</span>
            ) : retryState.result === "incorrect" ? (
              <>
                <span className="font-medium text-red-400">Not quite: {retryState.lastAttemptSan}</span>
                {hasBestLine ? (
                  <button
                    type="button"
                    onClick={preview.startBestLine}
                    className="text-zinc-300 underline underline-offset-2 hover:text-white"
                  >
                    Solution
                  </button>
                ) : null}
              </>
            ) : (
              <span className="text-zinc-400">Your move</span>
            )}
          </div>
          <CloseButton label="Exit retry" onClick={preview.cancel} />
        </div>
      ) : null}

      {bestLineState ? (
        <div className="flex items-center gap-2">
          <StatusDot className={`bg-emerald-400 ${bestLineState.loading ? "animate-pulse" : ""}`} />
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 font-mono text-xs">
            {bestLineStart > 0 ? <span className="px-0.5 text-zinc-600">…</span> : null}
            {bestLineChips.map((san, offset) => {
              const idx = bestLineStart + offset;
              return (
                <button
                  key={`${san}-${idx}`}
                  type="button"
                  onClick={() => preview.stepBestLine(idx + 1 - bestLineState.stepIndex)}
                  className={`rounded px-1.5 py-0.5 transition-colors ${
                    bestLineState.stepIndex === idx + 1
                      ? "bg-emerald-500/20 font-semibold text-emerald-200"
                      : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  {san}
                </button>
              );
            })}
            {!bestLineState.ended ? <span className="px-0.5 text-zinc-600">…</span> : null}
          </div>
          <CloseButton label="Exit best line" onClick={preview.cancel} />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5">
        <IconAction
          label={bestSan ? `Show best (${bestSan})` : "Show best"}
          disabled={!canShowBest}
          onClick={preview.startBestLine}
        >
          <TargetIcon />
        </IconAction>

        <IconAction label="Retry move" disabled={!canRetry} onClick={preview.startRetry}>
          <RetryIcon />
        </IconAction>

        <IconAction label="Next move" tone="primary" disabled={!canNextMove} onClick={onNextMove}>
          <NextIcon />
        </IconAction>

      </div>

      {!exploreState ? (
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <button
            type="button"
            disabled={!canGoPreviousMistake}
            onClick={onPreviousMistake}
            className="transition-colors hover:text-zinc-300 disabled:pointer-events-none disabled:opacity-30"
          >
            Previous mistake
          </button>
          <button
            type="button"
            disabled={!canGoNextMistake}
            onClick={onNextMistake}
            className="transition-colors hover:text-zinc-300 disabled:pointer-events-none disabled:opacity-30"
          >
            Next mistake
          </button>
        </div>
      ) : null}

      {explanation.status === "loading" ? (
        <div className="flex items-center gap-2">
          <span aria-hidden className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-zinc-400" />
          <div className="ml-auto">
            <Button variant="ghost" size="sm" onClick={onCancelExplain}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {explanation.status === "error" ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-red-300">{explanation.message}</p>
          <Button variant="secondary" size="sm" onClick={onExplain}>
            Retry
          </Button>
        </div>
      ) : null}

      {explanation.status === "success" ? (
        <div className="space-y-1">
          <p className="text-[13px] leading-snug text-zinc-200">{explanation.summary}</p>
          <p className="text-xs leading-snug text-zinc-400">{explanation.lesson}</p>
          <Button variant="ghost" size="sm" onClick={onRegenerate}>
            Regenerate
          </Button>
        </div>
      ) : null}
    </section>
  );
}
