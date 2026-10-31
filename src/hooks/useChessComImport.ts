"use client";

import { useCallback, useRef, useState } from "react";
import { importChessComGames } from "@/lib/chesscom/importGames";
import type { ImportProgress, ImportResult } from "@/lib/chesscom/types";
import { setChessComUsername } from "@/lib/storage/preferences";

export type ImportState =
  | { type: "idle" }
  | { type: "importing"; progress: ImportProgress }
  | { type: "complete"; result: ImportResult }
  | { type: "error"; message: string }
  | { type: "cancelled" };

export function useChessComImport(onComplete?: () => void) {
  const abortRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<ImportState>({ type: "idle" });

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState({ type: "cancelled" });
  }, []);

  const importGames = useCallback(
    async (username: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({
        type: "importing",
        progress: {
          phase: "profile",
          currentMonth: 0,
          totalMonths: 0,
          gamesAdded: 0,
          duplicates: 0,
          skippedVariants: 0,
          skippedInvalid: 0,
        },
      });

      try {
        const result = await importChessComGames({
          username,
          signal: controller.signal,
          onProgress: (progress) => {
            setState({ type: "importing", progress });
          },
        });

        setChessComUsername(result.username);
        setState({ type: "complete", result });
        onComplete?.();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Import failed";
        if (message.toLowerCase().includes("cancel")) {
          setState({ type: "cancelled" });
          return;
        }
        setState({ type: "error", message });
      } finally {
        abortRef.current = null;
      }
    },
    [onComplete],
  );

  const reset = useCallback(() => {
    setState({ type: "idle" });
  }, []);

  return {
    state,
    importGames,
    cancel,
    reset,
    isImporting: state.type === "importing",
  };
}
