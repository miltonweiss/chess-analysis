"use client";

import { useCallback, useRef, useState } from "react";
import { requestGameSummary } from "@/lib/ai/client/aiClient";
import type {
  GameSummary,
  GameSummaryContextInput,
  GameSummaryMoveLookup,
} from "@/lib/ai/types";

type SummaryState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: GameSummary; cached: boolean }
  | { status: "error"; message: string };

export function useGameSummary() {
  const [state, setState] = useState<SummaryState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(
    async (
      context: GameSummaryContextInput,
      moveLookup: GameSummaryMoveLookup[],
      regenerate = false,
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({ status: "loading" });

      try {
        const result = await requestGameSummary(context, moveLookup, {
          regenerate,
          signal: controller.signal,
        });

        if (controller.signal.aborted) {
          return;
        }

        if (result.ok) {
          setState({
            status: "success",
            data: result.data,
            cached: result.meta.cached,
          });
        } else {
          setState({ status: "error", message: result.error.message });
        }
      } catch {
        if (!controller.signal.aborted) {
          setState({
            status: "error",
            message: "Unable to generate the summary. Your engine analysis is still available.",
          });
        }
      }
    },
    [],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState((current) =>
      current.status === "loading" ? { status: "idle" } : current,
    );
  }, []);

  return { state, generate, cancel };
}
