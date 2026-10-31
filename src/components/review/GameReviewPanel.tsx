"use client";

import { useCallback, useEffect, useState } from "react";
import { AiContextDebug } from "@/components/ai/AiContextDebug";
import { AiPrivacyNote } from "@/components/ai/AiPrivacyNote";
import { GameSummaryCard } from "@/components/ai/GameSummaryCard";
import { MoveExplanationCard } from "@/components/ai/MoveExplanationCard";
import { PerspectiveSelector } from "@/components/ai/PerspectiveSelector";
import { Button } from "@/components/ui/Button";
import { AnalysisProgressCard } from "@/components/review/AnalysisProgressCard";
import { KeyMomentsList } from "@/components/review/KeyMomentsList";
import { MoveList } from "@/components/chess/MoveList";
import { ReviewEmptyStates } from "@/components/review/ReviewEmptyStates";
import { ReviewSummary } from "@/components/review/ReviewSummary";
import { SelectedMovePanel } from "@/components/review/SelectedMovePanel";
import { useGameSummary } from "@/hooks/useGameSummary";
import { useMoveExplanation } from "@/hooks/useMoveExplanation";
import type { MoveAnalysis } from "@/lib/analysis/types";
import { fetchAiStatus } from "@/lib/ai/client/aiClient";
import {
  buildGameSummaryContext,
  buildGameSummaryMoveLookup,
} from "@/lib/ai/context/buildGameSummaryContext";
import { buildMoveExplanationContext } from "@/lib/ai/context/buildMoveExplanationContext";
import type { AiStatus, ExplanationPerspective } from "@/lib/ai/types";
import type { ChessMove } from "@/lib/chess/types";
import { DEPTH_OPTIONS } from "@/lib/engine/settings";
import type { GameReview } from "@/lib/review/types";
import type { UseGameAnalysisReturn } from "@/hooks/useGameAnalysis";

type ReviewTab = "summary" | "moments" | "moves";

type GameReviewPanelProps = {
  hasMoves: boolean;
  moves: ChessMove[];
  cursor: number;
  result?: string;
  review: GameReview | null;
  moveAnalyses: Map<number, MoveAnalysis>;
  selectedMoveAnalysis: MoveAnalysis | null;
  fenBefore?: string;
  gameAnalysis: UseGameAnalysisReturn;
  perspective: ExplanationPerspective;
  onPerspectiveChange: (value: ExplanationPerspective) => void;
  onSelectPly: (ply: number) => void;
};

export function GameReviewPanel({
  hasMoves,
  moves,
  cursor,
  result,
  review,
  moveAnalyses,
  selectedMoveAnalysis,
  fenBefore,
  gameAnalysis,
  perspective,
  onPerspectiveChange,
  onSelectPly,
}: GameReviewPanelProps) {
  const [tab, setTab] = useState<ReviewTab>("summary");
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [lastContext, setLastContext] = useState<unknown>(null);

  const moveExplanation = useMoveExplanation();
  const gameSummary = useGameSummary();

  const {
    gameAnalysisState,
    progress,
    error,
    isAnalyzing,
    settings,
    setDepth,
    setEquivalentMoveDetection,
    analyzeFullGame,
    stopGameAnalysis,
    retry,
  } = gameAnalysis;

  useEffect(() => {
    void fetchAiStatus().then(setAiStatus);
  }, []);

  const handleExplainMove = useCallback(
    (ply: number, regenerate = false) => {
      if (!review) return;
      const analysis = moveAnalyses.get(ply);
      if (!analysis) return;

      const context = buildMoveExplanationContext(review, analysis, moves, perspective);
      if (!context) return;

      setLastContext(context);
      void moveExplanation.explain(ply, context, regenerate);
    },
    [review, moveAnalyses, moves, perspective, moveExplanation],
  );

  const handleExplainKeyMoment = useCallback(
    (ply: number) => {
      onSelectPly(ply);
      handleExplainMove(ply);
    },
    [onSelectPly, handleExplainMove],
  );

  const handleGenerateSummary = useCallback(
    (regenerate = false) => {
      if (!review) return;
      const context = buildGameSummaryContext(review, moves, perspective);
      const moveLookup = buildGameSummaryMoveLookup(moves);
      setLastContext(context);
      void gameSummary.generate(context, moveLookup, regenerate);
    },
    [review, moves, perspective, gameSummary],
  );

  const explanationState = selectedMoveAnalysis
    ? moveExplanation.getState(selectedMoveAnalysis.ply)
    : { status: "idle" as const };

  const canExplain =
    selectedMoveAnalysis &&
    !["forced", "book"].includes(selectedMoveAnalysis.classification);

  return (
    <div className="flex flex-col gap-4">
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Game review</p>
            {review ? (
              <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                <AccuracyBadge
                  label={review.metadata.white ?? "White"}
                  score={review.white.accuracy}
                />
                <AccuracyBadge
                  label={review.metadata.black ?? "Black"}
                  score={review.black.accuracy}
                />
              </div>
            ) : (
              <p className="mt-1 text-sm text-zinc-400">Run analysis to compute accuracy and key moments.</p>
            )}
          </div>

          {hasMoves && !isAnalyzing ? (
            <div className="flex flex-col items-end gap-2">
              <label className="flex items-center gap-2 text-xs text-zinc-500">
                Depth
                <select
                  value={settings.depth}
                  onChange={(event) => setDepth(Number(event.target.value))}
                  className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100"
                >
                  {DEPTH_OPTIONS.map((depth) => (
                    <option key={depth} value={depth}>
                      {depth}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex max-w-[14rem] cursor-pointer items-start gap-2 text-xs text-zinc-500">
                <input
                  type="checkbox"
                  checked={(settings.multipv ?? 1) > 1}
                  onChange={(event) => setEquivalentMoveDetection(event.target.checked)}
                  className="mt-0.5"
                />
                <span>Equivalent-move detection (MultiPV 2, slower)</span>
              </label>
              <Button variant="primary" size="sm" onClick={() => void analyzeFullGame()}>
                {review ? "Re-analyze" : "Analyze game"}
              </Button>
            </div>
          ) : null}
        </div>

        {review ? (
          <PerspectiveSelector value={perspective} onChange={onPerspectiveChange} />
        ) : null}
      </header>

      {isAnalyzing && progress ? (
        <AnalysisProgressCard progress={progress} onCancel={stopGameAnalysis} />
      ) : null}

      {!hasMoves ? (
        <ReviewEmptyStates variant="no-game" />
      ) : gameAnalysisState.type === "error" ? (
        <ReviewEmptyStates variant="error" errorMessage={error ?? undefined} onRetry={retry} />
      ) : gameAnalysisState.type === "cancelled" ? (
        <ReviewEmptyStates variant="cancelled" onRetry={retry} />
      ) : gameAnalysisState.type === "idle" && !review ? (
        <ReviewEmptyStates variant="ready" onAnalyze={() => void analyzeFullGame()} />
      ) : review ? (
        <>
          <nav className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-950/60 p-1">
            {(
              [
                ["summary", "Summary"],
                ["moments", "Key moments"],
                ["moves", "Moves"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                  tab === id
                    ? "bg-zinc-100 text-zinc-950"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="min-h-[12rem]">
            {tab === "summary" ? (
              <div className="space-y-4">
                <ReviewSummary review={review} />
                {aiStatus?.configured ? (
                  <div className="space-y-3 border-t border-zinc-800 pt-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">AI Summary</p>
                    {gameSummary.state.status === "idle" ? (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleGenerateSummary()}
                        >
                          Generate AI summary
                        </Button>
                        <AiPrivacyNote
                          provider={aiStatus.provider}
                          model={aiStatus.model}
                        />
                      </>
                    ) : null}
                    {gameSummary.state.status === "loading" ? (
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-zinc-400">Generating summary...</p>
                        <Button variant="ghost" size="sm" onClick={gameSummary.cancel}>
                          Cancel
                        </Button>
                      </div>
                    ) : null}
                    {gameSummary.state.status === "error" ? (
                      <div className="space-y-2">
                        <p className="text-sm text-red-300">{gameSummary.state.message}</p>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleGenerateSummary()}
                        >
                          Retry
                        </Button>
                      </div>
                    ) : null}
                    {gameSummary.state.status === "success" ? (
                      <GameSummaryCard
                        summary={gameSummary.state.data}
                        cached={gameSummary.state.cached}
                        onRegenerate={() => handleGenerateSummary(true)}
                      />
                    ) : null}
                  </div>
                ) : aiStatus ? (
                  <p className="text-xs text-zinc-500">
                    AI summaries are not configured. Set OPENAI_API_KEY on the server.
                  </p>
                ) : null}
              </div>
            ) : null}
            {tab === "moments" ? (
              <KeyMomentsList
                moments={review.keyMoments}
                selectedPly={cursor}
                onSelectPly={onSelectPly}
                onExplain={aiStatus?.configured ? handleExplainKeyMoment : undefined}
              />
            ) : null}
            {tab === "moves" ? (
              <MoveList
                moves={moves}
                cursor={cursor}
                result={result}
                moveAnalyses={moveAnalyses}
                onSelectPly={onSelectPly}
              />
            ) : null}
          </div>
        </>
      ) : null}

      <section className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Selected move</p>
        <SelectedMovePanel analysis={selectedMoveAnalysis} fenBefore={fenBefore} />

        {canExplain && aiStatus?.configured ? (
          <div className="space-y-3 border-t border-zinc-800 pt-3">
            {explanationState.status === "idle" ? (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleExplainMove(selectedMoveAnalysis!.ply)}
                >
                  Explain this move
                </Button>
                <AiPrivacyNote provider={aiStatus.provider} model={aiStatus.model} />
              </>
            ) : null}
            {explanationState.status === "loading" ? (
              <div className="flex items-center gap-2">
                <p className="text-sm text-zinc-400">Generating explanation...</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => moveExplanation.cancel(selectedMoveAnalysis!.ply)}
                >
                  Cancel
                </Button>
              </div>
            ) : null}
            {explanationState.status === "error" ? (
              <div className="space-y-2">
                <p className="text-sm text-red-300">{explanationState.message}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleExplainMove(selectedMoveAnalysis!.ply)}
                >
                  Retry
                </Button>
              </div>
            ) : null}
            {explanationState.status === "success" ? (
              <MoveExplanationCard
                explanation={explanationState.data}
                cached={explanationState.cached}
                onRegenerate={() =>
                  handleExplainMove(selectedMoveAnalysis!.ply, true)
                }
              />
            ) : null}
            <AiContextDebug context={lastContext} />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function AccuracyBadge({
  label,
  score,
}: {
  label: string;
  score: GameReview["white"]["accuracy"];
}) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/40 px-3 py-2">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="font-mono text-lg text-zinc-100">
        {score.isEmpty ? "n/a" : `${score.score.toFixed(1)}%`}
      </p>
    </div>
  );
}
