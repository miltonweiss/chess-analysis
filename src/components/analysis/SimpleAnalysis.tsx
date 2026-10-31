"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { EvalBar } from "@/components/analysis/EvalBar";
import { MoveCoach } from "@/components/analysis/MoveCoach";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { MoveList } from "@/components/chess/MoveList";
import { EvaluationGraph } from "@/components/review/EvaluationGraph";
import { ClassificationIcon } from "@/components/review/ClassificationIcon";
import { useChessGame } from "@/hooks/useChessGame";
import { useGameAnalysis } from "@/hooks/useGameAnalysis";
import { useGameReview } from "@/hooks/useGameReview";
import { useMoveExplanation } from "@/hooks/useMoveExplanation";
import { useMovePreview } from "@/hooks/useMovePreview";
import { useReplayKeyboard } from "@/hooks/useReplayKeyboard";
import { buildMoveExplanationContext } from "@/lib/ai/context/buildMoveExplanationContext";
import type { ExplanationPerspective } from "@/lib/ai/types";
import type { GameAnalysis, MoveAnalysis, MoveClassification } from "@/lib/analysis/types";
import { createAnalysisVersion } from "@/lib/analysis/version";
import { continueGamePly } from "@/lib/chess/timeline";
import type { LoadedGame, PlayerColor } from "@/lib/chess/types";
import { buildAnalysisSummary } from "@/lib/games/analysisSummary";
import { formatEvaluation } from "@/lib/engine/uci";
import { saveAnalysis } from "@/lib/storage/gameRepository";

export type SimpleAnalysisProps = {
  initialGame?: LoadedGame;
  initialAnalysis?: GameAnalysis;
  gameId?: string;
  userColor?: PlayerColor;
  /** Start Stockfish when the loaded moves have no matching analysis. */
  autoAnalyze?: boolean;
};

const SUMMARY_ROWS: { key: MoveClassification; label: string }[] = [
  { key: "brilliant", label: "Brilliant" },
  { key: "great", label: "Great" },
  { key: "best", label: "Best" },
  { key: "excellent", label: "Excellent" },
  { key: "good", label: "Good" },
  { key: "book", label: "Book" },
  { key: "inaccuracy", label: "Inaccuracy" },
  { key: "mistake", label: "Mistake" },
  { key: "miss", label: "Miss" },
  { key: "blunder", label: "Blunder" },
];

function perspectiveFromUserColor(userColor: PlayerColor | undefined): ExplanationPerspective {
  if (userColor === "white" || userColor === "black") {
    return userColor;
  }
  return "neutral";
}

function formatAccuracy(score: { score: number; isEmpty: boolean }): string {
  return score.isEmpty ? "—" : `${score.score.toFixed(1)}%`;
}

function BoardPlayerStrip({
  name,
  elo,
  align,
}: {
  name: string;
  elo?: string;
  align: "start" | "end";
}) {
  return (
    <div
      className={`flex h-5 min-w-0 items-center gap-1.5 px-0.5 text-[11px] leading-none ${
        align === "end" ? "justify-end" : "justify-start"
      }`}
    >
      <span className="truncate font-medium text-zinc-200">{name}</span>
      {elo ? <span className="shrink-0 tabular-nums text-zinc-500">{elo}</span> : null}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function PanelTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`-mb-px border-b-2 py-2 text-xs font-medium transition-colors ${
        active ? "border-zinc-100 text-zinc-100" : "border-transparent text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

export function SimpleAnalysis({
  initialGame,
  initialAnalysis,
  gameId,
  userColor,
  autoAnalyze = false,
}: SimpleAnalysisProps) {
  const game = useChessGame(initialGame?.metadata ?? {}, initialGame, userColor);
  const [panelTab, setPanelTab] = useState<"moves" | "accuracy">("moves");
  const attemptedSignature = useRef<string | null>(null);
  const stopRequested = useRef(false);
  const analyzeFullGameRef = useRef<() => Promise<void>>(async () => {});
  const perspective = perspectiveFromUserColor(userColor);

  const handleAnalysisComplete = useCallback(
    async (analysis: GameAnalysis) => {
      if (!gameId) {
        return;
      }

      const version = createAnalysisVersion({ depth: analysis.settings.depth });
      const analyzedAt = Date.now();
      const summary = buildAnalysisSummary(analysis, game.metadata, version, analyzedAt);
      await saveAnalysis({
        gameId,
        version,
        analysis,
        summary,
        analyzedAt,
      });
    },
    [game.metadata, gameId],
  );

  const gameAnalysisHook = useGameAnalysis(game.state.moves, {
    initialAnalysis,
    onComplete: handleAnalysisComplete,
    initialFen: game.state.initialFen,
    metadata: game.metadata,
  });
  const {
    hasMatchingInitialAnalysis,
    gameAnalysis,
    gameAnalysisState,
    progress,
    error,
    isAnalyzing,
    analyzeFullGame,
    stopGameAnalysis,
    fetchBestContinuation,
  } = gameAnalysisHook;
  const review = useGameReview(game.metadata, gameAnalysis);
  const moveExplanation = useMoveExplanation();

  const movesKey = game.state.moves.map((move) => move.uci).join(",");

  useEffect(() => {
    analyzeFullGameRef.current = analyzeFullGame;
  }, [analyzeFullGame]);

  useEffect(() => {
    if (!autoAnalyze || stopRequested.current || hasMatchingInitialAnalysis) {
      return;
    }
    if (movesKey.length === 0 || gameAnalysis || isAnalyzing) {
      return;
    }
    if (gameAnalysisState.type !== "idle") {
      return;
    }
    if (attemptedSignature.current === movesKey) {
      return;
    }

    const signature = movesKey;
    const timer = window.setTimeout(() => {
      attemptedSignature.current = signature;
      void analyzeFullGameRef.current();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    autoAnalyze,
    gameAnalysis,
    gameAnalysisState.type,
    hasMatchingInitialAnalysis,
    isAnalyzing,
    movesKey,
  ]);

  const moveAnalyses = useMemo(() => {
    const map = new Map<number, MoveAnalysis>();
    for (const analysis of gameAnalysis?.moves ?? []) {
      map.set(analysis.ply, analysis);
    }
    return map;
  }, [gameAnalysis]);

  const selectedMove = game.state.cursor > 0 ? game.state.moves[game.state.cursor - 1] : null;
  const selectedMoveAnalysis =
    selectedMove ? moveAnalyses.get(selectedMove.ply) ?? null : null;
  const selectedMoveLabel = selectedMove
    ? `${selectedMove.color === "white" ? `${selectedMove.moveNumber}.` : `${selectedMove.moveNumber}...`} ${selectedMove.san}`
    : null;

  const fenBefore = selectedMove?.fenBefore ?? game.state.initialFen;

  // Preview interactive state (best line or retry move)
  const preview = useMovePreview(
    game.state.cursor,
    selectedMoveAnalysis,
    fenBefore,
    game.fen,
    selectedMoveLabel,
    fetchBestContinuation,
  );

  const evalPoint =
    review?.evaluationTimeline.find((point) => point.ply === game.state.cursor) ??
    review?.evaluationTimeline[0];

  const metadata = game.metadata;

  const explanationState = selectedMoveAnalysis
    ? moveExplanation.getState(selectedMoveAnalysis.ply)
    : { status: "idle" as const };

  const handleExplain = useCallback(
    (regenerate = false) => {
      if (!review || !selectedMoveAnalysis) {
        return;
      }
      const context = buildMoveExplanationContext(
        review,
        selectedMoveAnalysis,
        game.state.moves,
        perspective,
      );
      if (!context) {
        return;
      }
      void moveExplanation.explain(selectedMoveAnalysis.ply, context, regenerate);
    },
    [review, selectedMoveAnalysis, game.state.moves, perspective, moveExplanation],
  );

  const hasMoves = game.state.moves.length > 0;
  const progressPercent =
    progress && progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  const showRetry =
    hasMoves &&
    !isAnalyzing &&
    !review &&
    (gameAnalysisState.type === "cancelled" || gameAnalysisState.type === "error");
  const showManualStart =
    hasMoves && !isAnalyzing && !review && !autoAnalyze && gameAnalysisState.type === "idle";
  const whiteName = metadata.white?.trim() || "White";
  const blackName = metadata.black?.trim() || "Black";

  const handleStopAnalysis = useCallback(() => {
    stopRequested.current = true;
    stopGameAnalysis();
  }, [stopGameAnalysis]);

  // Jump to next or previous mistake
  const mistakePlies = useMemo(() => {
    const list: number[] = [];
    for (const m of gameAnalysis?.moves ?? []) {
      if (
        m.classification === "inaccuracy" ||
        m.classification === "mistake" ||
        m.classification === "miss" ||
        m.classification === "blunder"
      ) {
        // Filter by user perspective if applicable
        if (!userColor || m.color === userColor) {
          list.push(m.ply);
        }
      }
    }
    return list;
  }, [gameAnalysis, userColor]);

  const currentMistakeIdx = mistakePlies.indexOf(game.state.cursor);
  const canGoPreviousMistake =
    mistakePlies.length > 0 &&
    (currentMistakeIdx > 0 || (currentMistakeIdx === -1 && game.state.cursor > mistakePlies[0]));
  const canGoNextMistake =
    mistakePlies.length > 0 &&
    (currentMistakeIdx !== -1
      ? currentMistakeIdx < mistakePlies.length - 1
      : game.state.cursor < mistakePlies[mistakePlies.length - 1]);

  const handlePreviousMistake = useCallback(() => {
    const prev = mistakePlies.filter((p) => p < game.state.cursor).pop();
    if (prev !== undefined) {
      game.goToPly(prev);
    }
  }, [mistakePlies, game]);

  const handleNextMistake = useCallback(() => {
    const next = mistakePlies.find((p) => p > game.state.cursor);
    if (next !== undefined) {
      game.goToPly(next);
    }
  }, [mistakePlies, game]);

  // Navigation handlers respecting preview & exploration state
  const isExploring = preview.state.type === "explore";
  const isBestLine = preview.state.type === "best_line";

  const handleNavFirst = useCallback(() => {
    if (isExploring) {
      preview.resetExplore();
    } else if (isBestLine) {
      preview.stepBestLine(-999);
    } else {
      game.first();
    }
  }, [isExploring, isBestLine, preview, game]);

  const handleNavPrevious = useCallback(() => {
    if (isExploring) {
      preview.stepExplore(-1);
    } else if (isBestLine) {
      preview.stepBestLine(-1);
    } else {
      game.previous();
    }
  }, [isExploring, isBestLine, preview, game]);

  const handleNavNext = useCallback(() => {
    if (isExploring) {
      preview.stepExplore(1);
    } else if (isBestLine) {
      preview.stepBestLine(1);
    } else {
      game.next();
    }
  }, [isExploring, isBestLine, preview, game]);

  const handleNavLast = useCallback(() => {
    if (isExploring && preview.state.type === "explore") {
      preview.jumpExplore(preview.state.sans.length);
    } else if (isBestLine && preview.state.type === "best_line") {
      preview.stepBestLine(999);
    } else {
      game.last();
    }
  }, [isExploring, isBestLine, preview, game]);

  useReplayKeyboard({
    onFirst: handleNavFirst,
    onPrevious: handleNavPrevious,
    onNext: handleNavNext,
    onLast: handleNavLast,
  });

  const isPrevDisabled = isExploring
    ? preview.state.type === "explore" && preview.state.stepIndex <= 0
    : isBestLine
      ? preview.state.type === "best_line" && preview.state.stepIndex <= 0
      : !game.canGoBack;

  const isNextDisabled = isExploring
    ? preview.state.type === "explore" && preview.state.stepIndex >= preview.state.sans.length
    : isBestLine
      ? preview.state.type === "best_line" &&
        preview.state.stepIndex >= preview.state.fens.length - 1 &&
        Boolean(preview.state.ended)
      : !game.canGoForward;

  // Escape exits preview
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && preview.state.type !== "idle") {
        preview.cancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);

  const boardFen = preview.activeFen ?? game.fen;
  const boardLastMove = preview.previewLastMove ?? (isExploring ? null : game.lastMove);

  const boardClassification =
    preview.state.type === "idle" && selectedMoveAnalysis
      ? selectedMoveAnalysis.classification
      : null;

  const hasBestLine = Boolean(
    selectedMoveAnalysis &&
      !selectedMoveAnalysis.playedBestMove &&
      (selectedMoveAnalysis.bestMove ||
        (selectedMoveAnalysis.principalVariation &&
          selectedMoveAnalysis.principalVariation.length > 0)),
  );

  const handleBoardMove = useCallback(
    (from: string, to: string, promotion?: "q" | "r" | "b" | "n"): boolean => {
      if (preview.state.type === "retry") {
        return preview.handleRetryMove(from, to, promotion);
      }

      const isFirstVariationMove =
        preview.state.type === "idle" ||
        preview.state.type === "best_line" ||
        (preview.state.type === "explore" && preview.state.stepIndex === 0);

      if (isFirstVariationMove) {
        const currentFen = preview.activeFen ?? game.fen;
        const nextPly = continueGamePly(
          game.timeline,
          game.state.moves,
          currentFen,
          game.state.cursor,
          from,
          to,
          promotion,
        );
        if (nextPly !== null) {
          preview.cancel();
          game.goToPly(nextPly);
          return true;
        }
      }

      return preview.handleExploreMove(from, to, promotion);
    },
    [preview, game],
  );

  const topPlayer =
    game.orientation === "white"
      ? { name: blackName, elo: metadata.blackElo }
      : { name: whiteName, elo: metadata.whiteElo };
  const bottomPlayer =
    game.orientation === "white"
      ? { name: whiteName, elo: metadata.whiteElo }
      : { name: blackName, elo: metadata.blackElo };

  return (
    <div className="@container mx-auto flex h-full min-h-0 w-full max-w-[1520px] flex-col overflow-hidden px-4 py-3 lg:px-6">
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <div className="relative w-fit max-h-full pr-[calc(24rem+1.25rem)]">
          <section className="flex flex-col">
            <div className="flex h-[min(80cqh,calc((100cqw_-_28rem)_*_0.8))] aspect-square items-stretch gap-2">
              <div className="w-7 shrink-0 py-5">
                <EvalBar
                  winPercent={evalPoint?.winPercent ?? 50}
                  orientation={game.orientation}
                  label={evalPoint ? formatEvaluation(evalPoint.evaluation) : undefined}
                />
              </div>
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <BoardPlayerStrip name={topPlayer.name} elo={topPlayer.elo} align="start" />
                <div className="relative min-h-0 flex-1">
                  <ChessBoard
                    fen={boardFen}
                    orientation={game.orientation}
                    lastMove={boardLastMove}
                    moveClassification={boardClassification}
                    bestMoveUci={
                      preview.state.type === "idle" && hasBestLine
                        ? selectedMoveAnalysis?.bestMove
                        : null
                    }
                    interactive={true}
                    fill
                    onMove={handleBoardMove}
                  />
                  {isExploring ? (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute right-2 top-2 z-30 h-2 w-2 rounded-full bg-cyan-400 ring-2 ring-black/40"
                    />
                  ) : null}
                </div>
                <BoardPlayerStrip name={bottomPlayer.name} elo={bottomPlayer.elo} align="start" />
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-center gap-2 pt-2">
              <IconButton label="First position" onClick={handleNavFirst} disabled={isPrevDisabled}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M3 2v12h2V2H3zm3.5 6 7-4.5v9L6.5 8z" />
                </svg>
              </IconButton>
              <IconButton label="Previous move" onClick={handleNavPrevious} disabled={isPrevDisabled}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M10 3 5 8l5 5V3z" />
                </svg>
              </IconButton>
              <IconButton label="Next move" onClick={handleNavNext} disabled={isNextDisabled}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M6 3l5 5-5 5V3z" />
                </svg>
              </IconButton>
              <IconButton label="Last position" onClick={handleNavLast} disabled={isNextDisabled}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <g transform="translate(16 0) scale(-1 1)">
                    <path d="M3 2v12h2V2H3zm3.5 6 7-4.5v9L6.5 8z" />
                  </g>
                </svg>
              </IconButton>
              <IconButton label="Flip board" onClick={game.flipBoard}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 13V3M5 3 2.5 5.5M5 3l2.5 2.5M11 3v10M11 13l-2.5-2.5M11 13l2.5-2.5" />
                </svg>
              </IconButton>
            </div>
          </section>

          <aside className="absolute bottom-16 right-0 top-5 flex w-96 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/70">
        {!hasMoves ? (
          <p className="shrink-0 px-4 py-3 text-[13px] text-zinc-400">
            Import your games in the{" "}
            <Link href="/games" className="text-zinc-100 underline underline-offset-2">
              Library
            </Link>
            .
          </p>
        ) : null}

        {isAnalyzing && progress ? (
          <div className="shrink-0 space-y-1.5 px-4 pt-3">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>Analysing… {progressPercent}%</span>
              <button
                type="button"
                className="text-xs text-zinc-400 hover:text-zinc-200"
                onClick={handleStopAnalysis}
              >
                Cancel
              </button>
            </div>
            <div className="h-0.5 overflow-hidden rounded-full bg-zinc-800" aria-hidden="true">
              <div
                className="h-full bg-zinc-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        ) : null}

        {gameAnalysisState.type === "error" ? (
          <p className="shrink-0 px-4 pt-3 text-xs text-red-300">{error}</p>
        ) : null}

        {showRetry || showManualStart ? (
          <button
            type="button"
            className="shrink-0 self-start px-4 pt-3 text-xs font-medium text-zinc-300 hover:text-zinc-100"
            onClick={() => void analyzeFullGame()}
          >
            {gameAnalysisState.type === "error"
              ? "Retry"
              : gameAnalysisState.type === "cancelled"
                ? "Analyse again"
                : "Analyse game"}
          </button>
        ) : null}

        {hasMoves ? (
          <div className="shrink-0 border-b border-zinc-800">
            <MoveCoach
              analysis={selectedMoveAnalysis}
              moveLabel={selectedMoveLabel}
              preview={preview}
              hasBestLine={hasBestLine}
              canGoNext={game.canGoForward}
              canGoPreviousMistake={canGoPreviousMistake}
              canGoNextMistake={canGoNextMistake}
              onPreviousMistake={handlePreviousMistake}
              onNextMistake={handleNextMistake}
              onNextMove={game.next}
              explanation={
                explanationState.status === "success"
                  ? {
                      status: "success",
                      summary: explanationState.data.summary,
                      lesson: explanationState.data.lesson,
                    }
                  : explanationState.status === "error"
                    ? { status: "error", message: explanationState.message }
                    : explanationState.status === "loading"
                      ? { status: "loading" }
                      : { status: "idle" }
              }
              onExplain={() => handleExplain(false)}
              onRegenerate={() => handleExplain(true)}
              onCancelExplain={() => {
                if (selectedMoveAnalysis) {
                  moveExplanation.cancel(selectedMoveAnalysis.ply);
                }
              }}
            />
          </div>
        ) : null}

        {review ? (
          <div className="shrink-0 border-b border-zinc-800 px-4 py-3">
            <EvaluationGraph
              compact
              timeline={review.evaluationTimeline}
              selectedPly={game.state.cursor}
              onSelectPly={game.goToPly}
              moveAnalyses={moveAnalyses}
            />
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {hasMoves && review ? (
            <div className="flex shrink-0 items-center gap-5 border-b border-zinc-800 px-4">
              <PanelTab active={panelTab === "moves"} onClick={() => setPanelTab("moves")}>
                Moves
              </PanelTab>
              <PanelTab active={panelTab === "accuracy"} onClick={() => setPanelTab("accuracy")}>
                Accuracy
              </PanelTab>
            </div>
          ) : null}

          {hasMoves && panelTab === "moves" ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 text-[13px]">
              <MoveList
                moves={game.state.moves}
                cursor={game.state.cursor}
                result={metadata.result}
                moveAnalyses={moveAnalyses}
                onSelectPly={game.goToPly}
              />
            </div>
          ) : null}

          {review && (panelTab === "accuracy" || !hasMoves) ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-[13px]">
              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3 pb-3">
                <div className="min-w-0 text-left">
                  <p className="truncate text-sm text-zinc-500">{whiteName}</p>
                  <p className="text-lg font-semibold tabular-nums text-zinc-100">
                    {formatAccuracy(review.white.accuracy)}
                  </p>
                </div>
                <div className="pb-1 text-sm text-zinc-500">Accuracy</div>
                <div className="min-w-0 text-right">
                  <p className="truncate text-sm text-zinc-500">{blackName}</p>
                  <p className="text-lg font-semibold tabular-nums text-zinc-100">
                    {formatAccuracy(review.black.accuracy)}
                  </p>
                </div>
              </div>

              <div>
                {SUMMARY_ROWS.map((row) => {
                  const whiteCount = review.white.counts[row.key] ?? 0;
                  const blackCount = review.black.counts[row.key] ?? 0;
                  if (whiteCount === 0 && blackCount === 0) {
                    return null;
                  }
                  return (
                    <div
                      key={row.key}
                      className="grid grid-cols-[2.5rem_1fr_1.25rem_1fr_2.5rem] items-center gap-2 rounded px-1 py-1 text-sm text-zinc-200"
                    >
                      <span className="text-left text-base font-semibold tabular-nums">{whiteCount}</span>
                      <span className="truncate text-right text-zinc-400">{row.label}</span>
                      <ClassificationIcon classification={row.key} size="md" />
                      <span aria-hidden="true" />
                      <span className="text-right text-base font-semibold tabular-nums">{blackCount}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {!hasMoves && !review ? <div className="min-h-0 flex-1" /> : null}
        </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
