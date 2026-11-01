"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SimpleAnalysis } from "@/components/analysis/SimpleAnalysis";
import { useAutomaticChessComSync } from "@/hooks/useAutomaticChessComSync";
import { useStoredGame } from "@/hooks/useStoredGame";
import type { StoredGame } from "@/lib/games/types";
import { listGames } from "@/lib/storage/gameRepository";

type LatestState =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "empty" }
  | { type: "ready"; id: string }
  | { type: "error"; message: string };

function useLatestGameId(enabled: boolean): LatestState {
  const [state, setState] = useState<LatestState>({ type: "loading" });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    listGames()
      .then((games: StoredGame[]) => {
        if (cancelled) {
          return;
        }
        if (games.length === 0) {
          setState({ type: "empty" });
          return;
        }
        const latest = games.reduce((current, game) =>
          game.endTime > current.endTime ? game : current,
        );
        setState({ type: "ready", id: latest.id });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Could not load your games";
          setState({ type: "error", message });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!enabled) {
    return { type: "idle" };
  }

  return state;
}

function Loading() {
  return <p className="px-6 py-10 text-sm text-zinc-400">Loading game…</p>;
}

export function AnalyzePageClient() {
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("game");
  const sync = useAutomaticChessComSync();
  const latest = useLatestGameId(!requestedId && sync.isReady);
  const gameId = requestedId ?? (latest.type === "ready" ? latest.id : undefined);
  const stored = useStoredGame(gameId);

  if (!requestedId && (!sync.isReady || latest.type === "loading" || latest.type === "idle")) {
    return <Loading />;
  }

  if (!requestedId && latest.type === "error") {
    return <p className="px-6 py-10 text-sm text-red-300">{latest.message}</p>;
  }

  if (!requestedId && latest.type === "empty") {
    return <SimpleAnalysis key="empty" autoAnalyze />;
  }

  if (!gameId || stored.state.type === "loading") {
    return <Loading />;
  }

  if (stored.state.type === "error") {
    if (stored.state.message === "Missing game id") {
      return <Loading />;
    }
    return <p className="px-6 py-10 text-sm text-red-300">{stored.state.message}</p>;
  }

  if (stored.state.storedGame.id !== gameId) {
    return <Loading />;
  }

  return (
    <SimpleAnalysis
      key={stored.state.storedGame.id}
      initialGame={stored.state.loadedGame}
      initialAnalysis={stored.state.analysis ?? undefined}
      gameId={stored.state.storedGame.id}
      userColor={stored.state.storedGame.userColor}
      autoAnalyze
    />
  );
}
