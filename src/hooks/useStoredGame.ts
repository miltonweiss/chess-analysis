"use client";

import { useEffect, useState } from "react";
import type { GameAnalysis } from "@/lib/analysis/types";
import { CLASSIFIER_VERSION } from "@/lib/analysis/version";
import type { LoadedGame } from "@/lib/chess/types";
import { parsePgn } from "@/lib/chess/pgn";
import type { StoredGame } from "@/lib/games/types";
import { getAnalysis, getGame, getPgn } from "@/lib/storage/gameRepository";

export type StoredGameLoadState =
  | { type: "loading" }
  | {
      type: "ready";
      storedGame: StoredGame;
      loadedGame: LoadedGame;
      analysis: GameAnalysis | null;
    }
  | { type: "error"; message: string };

export function useStoredGame(gameId: string | undefined) {
  const [state, setState] = useState<StoredGameLoadState>({ type: "loading" });
  const [loadedId, setLoadedId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!gameId) {
      return;
    }

    const id = gameId;
    let cancelled = false;

    async function load() {
      try {
        const storedGame = await getGame(id);
        if (cancelled) {
          return;
        }
        if (!storedGame) {
          setLoadedId(id);
          setState({ type: "error", message: "Game not found in your library" });
          return;
        }

        const pgn = await getPgn(id);
        if (cancelled) {
          return;
        }
        if (!pgn) {
          setLoadedId(id);
          setState({ type: "error", message: "PGN not found for this game" });
          return;
        }

        const parsed = parsePgn(pgn);
        if (cancelled) {
          return;
        }
        if (!parsed.ok) {
          setLoadedId(id);
          setState({ type: "error", message: parsed.error.message });
          return;
        }

        const storedAnalysis = await getAnalysis(id);
        if (cancelled) {
          return;
        }

        const validAnalysis =
          storedAnalysis &&
          storedAnalysis.version.classifierVersion === CLASSIFIER_VERSION
            ? storedAnalysis.analysis
            : null;

        setLoadedId(id);
        setState({
          type: "ready",
          storedGame,
          loadedGame: parsed.game,
          analysis: validAnalysis,
        });
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Failed to load game";
          setLoadedId(id);
          setState({ type: "error", message });
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  if (!gameId) {
    return { state: { type: "error", message: "Missing game id" } as StoredGameLoadState };
  }

  if (loadedId !== gameId) {
    return { state: { type: "loading" } as StoredGameLoadState };
  }

  return { state };
}
