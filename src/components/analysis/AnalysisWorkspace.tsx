"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import type { ExplanationPerspective } from "@/lib/ai/types";
import type { MoveAnalysis } from "@/lib/analysis/types";
import { createAnalysisVersion } from "@/lib/analysis/version";
import { AnalysisPanel } from "@/components/analysis/AnalysisPanel";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { GameMetadata } from "@/components/chess/GameMetadata";
import { PgnImporter } from "@/components/chess/PgnImporter";
import { ReplayControls } from "@/components/chess/ReplayControls";
import { EvaluationGraph } from "@/components/review/EvaluationGraph";
import { GameReviewPanel } from "@/components/review/GameReviewPanel";
import { Button } from "@/components/ui/Button";
import { useChessEngine } from "@/hooks/useChessEngine";
import { useChessGame } from "@/hooks/useChessGame";
import { useGameAnalysis } from "@/hooks/useGameAnalysis";
import { useGameReview } from "@/hooks/useGameReview";
import { useReplayKeyboard } from "@/hooks/useReplayKeyboard";
import { buildAnalysisSummary } from "@/lib/games/analysisSummary";
import { gameStateToLoadedGame } from "@/lib/chess/pgn";
import type { GameAnalysis } from "@/lib/analysis/types";
import type { GameStatus, LoadedGame, PlayerColor } from "@/lib/chess/types";
import { saveAnalysis, saveLoadedGame } from "@/lib/storage/gameRepository";

export type AnalysisWorkspaceProps = {
  initialGame?: LoadedGame;
  initialAnalysis?: GameAnalysis;
  gameId?: string;
  userColor?: PlayerColor;
  initialPerspective?: ExplanationPerspective;
  showSaveToLibrary?: boolean;
  showPgnImporter?: boolean;
};

function formatGameStatus(status: GameStatus): string {
  switch (status.type) {
    case "playing":
      return `${status.turn === "white" ? "White" : "Black"} to move`;
    case "checkmate":
      return `Checkmate · ${status.winner === "white" ? "White" : "Black"} wins`;
    case "stalemate":
      return "Stalemate";
    case "draw":
      return `Draw · ${status.reason}`;
    default:
      return "In progress";
  }
}

export function AnalysisWorkspace({
  initialGame,
  initialAnalysis,
  gameId,
  userColor,
  initialPerspective = "neutral",
  showSaveToLibrary = true,
  showPgnImporter = true,
}: AnalysisWorkspaceProps) {
  const game = useChessGame(initialGame?.metadata ?? {}, initialGame, userColor);
  const engine = useChessEngine(game.fen);

  const handleAnalysisComplete = useCallback(
    async (analysis: GameAnalysis) => {
      if (!gameId) {
        return;
      }

      const version = createAnalysisVersion({
        depth: analysis.settings.depth,
        engineVersion: engine.identity?.name,
      });
      const analyzedAt = Date.now();
      const summary = buildAnalysisSummary(
        analysis,
        game.metadata,
        version,
        analyzedAt,
      );

      await saveAnalysis({
        gameId,
        version,
        analysis,
        summary,
        analyzedAt,
      });
    },
    [game.metadata, gameId, engine.identity?.name],
  );

  const gameAnalysisHook = useGameAnalysis(game.state.moves, {
    initialAnalysis,
    onComplete: handleAnalysisComplete,
    initialFen: game.state.initialFen,
    metadata: game.metadata,
  });
  const review = useGameReview(game.metadata, gameAnalysisHook.gameAnalysis);

  const metadataForDisplay = useMemo(() => {
    if (!review?.opening) {
      return game.metadata;
    }

    return {
      ...game.metadata,
      eco: game.metadata.eco ?? review.opening.eco,
      opening: game.metadata.opening ?? review.opening.name,
    };
  }, [game.metadata, review?.opening]);
  const [engineOpen, setEngineOpen] = useState(false);
  const [perspective, setPerspective] = useState<ExplanationPerspective>(initialPerspective);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useReplayKeyboard({
    onFirst: game.first,
    onPrevious: game.previous,
    onNext: game.next,
    onLast: game.last,
  });

  const moveAnalyses = useMemo(() => {
    const map = new Map<number, MoveAnalysis>();
    for (const analysis of gameAnalysisHook.gameAnalysis?.moves ?? []) {
      map.set(analysis.ply, analysis);
    }
    return map;
  }, [gameAnalysisHook.gameAnalysis]);

  const selectedMoveAnalysis =
    game.state.cursor > 0 ? moveAnalyses.get(game.state.cursor) ?? null : null;

  const selectedMove = game.state.cursor > 0 ? game.state.moves[game.state.cursor - 1] : null;
  const fenBefore = selectedMove?.fenBefore;

  const handleSaveToLibrary = useCallback(async () => {
    if (game.state.moves.length === 0) {
      return;
    }

    setSaveState("saving");
    setSaveMessage(null);

    try {
      const loaded = gameStateToLoadedGame(game.state);
      const saved = await saveLoadedGame(loaded, {
        source: "pgn",
        userColor,
      });
      setSaveState("saved");
      setSaveMessage(`Saved to library (${saved.id.slice(0, 12)}…)`);
    } catch (error) {
      setSaveState("error");
      setSaveMessage(error instanceof Error ? error.message : "Failed to save game");
    }
  }, [game.state, userColor]);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-10">
      {showSaveToLibrary && game.state.moves.length > 0 && !gameId ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/40 px-4 py-3">
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={saveState === "saving"}
            onClick={() => void handleSaveToLibrary()}
          >
            Save to library
          </Button>
          {saveState === "saved" ? (
            <Link href="/games" className="text-sm text-zinc-400 hover:text-zinc-200">
              Open library
            </Link>
          ) : null}
          {saveMessage ? <p className="text-sm text-zinc-400">{saveMessage}</p> : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-8 xl:flex-row xl:items-start">
        <section className="flex w-full flex-1 flex-col gap-4 xl:max-w-2xl">
          <ChessBoard
            fen={game.fen}
            orientation={game.orientation}
            lastMove={game.lastMove}
            moveClassification={selectedMoveAnalysis?.classification}
            bestMoveUci={
              selectedMoveAnalysis && !selectedMoveAnalysis.playedBestMove
                ? selectedMoveAnalysis.bestMove
                : null
            }
            interactive={game.mode === "play"}
            onMove={game.makeMoveFromSquares}
          />

          <ReplayControls
            canGoBack={game.canGoBack}
            canGoForward={game.canGoForward}
            currentPly={game.state.cursor}
            totalPlies={game.state.moves.length}
            onFirst={game.first}
            onPrevious={game.previous}
            onNext={game.next}
            onLast={game.last}
            onFlip={game.flipBoard}
            onNewBoard={game.newBoard}
          />

          <section className="space-y-2">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Position</p>
            <p className="text-lg font-medium text-zinc-100">{formatGameStatus(game.status)}</p>
            <p className="break-all font-mono text-xs text-zinc-500">{game.fen}</p>
          </section>

          {review ? (
            <EvaluationGraph
              timeline={review.evaluationTimeline}
              selectedPly={game.state.cursor}
              onSelectPly={game.goToPly}
              moveAnalyses={moveAnalyses}
            />
          ) : (
            <EvaluationGraph timeline={[]} selectedPly={0} onSelectPly={game.goToPly} />
          )}
        </section>

        <aside className="flex w-full flex-col gap-6 xl:max-w-xl xl:flex-1">
          <GameMetadata metadata={metadataForDisplay} mode={game.mode} />
          {showPgnImporter ? <PgnImporter onLoad={game.loadPgn} /> : null}

          <GameReviewPanel
            hasMoves={game.state.moves.length > 0}
            moves={game.state.moves}
            cursor={game.state.cursor}
            result={game.metadata.result}
            review={review}
            moveAnalyses={moveAnalyses}
            selectedMoveAnalysis={selectedMoveAnalysis}
            fenBefore={fenBefore}
            gameAnalysis={gameAnalysisHook}
            perspective={perspective}
            onPerspectiveChange={setPerspective}
            onSelectPly={game.goToPly}
          />
        </aside>
      </div>

      <details
        className="rounded-lg border border-zinc-800 bg-zinc-950/40"
        open={engineOpen}
        onToggle={(event) => setEngineOpen((event.target as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-zinc-300">
          Engine (single position)
        </summary>
        <div className="border-t border-zinc-800 p-4">
          <AnalysisPanel
            engineStatus={engine.engineStatus}
            identity={engine.identity}
            engineError={engine.engineError}
            analysisState={engine.analysisState}
            progress={engine.progress}
            result={engine.result}
            currentPosition={game.currentPosition}
            depth={engine.settings.depth}
            onDepthChange={engine.setDepth}
            onAnalyze={engine.analyze}
            onStop={engine.stop}
          />
        </div>
      </details>
    </div>
  );
}
