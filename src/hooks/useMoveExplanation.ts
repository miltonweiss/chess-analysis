"use client";

import { useCallback, useRef, useState } from "react";
import { requestMoveExplanation } from "@/lib/ai/client/aiClient";
import type {
  MoveExplanation,
  MoveExplanationContextInput,
} from "@/lib/ai/types";

type ExplanationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: MoveExplanation; cached: boolean }
  | { status: "error"; message: string };

export function useMoveExplanation() {
  const [states, setStates] = useState<Map<number, ExplanationState>>(new Map());
  const abortRefs = useRef<Map<number, AbortController>>(new Map());

  const getState = useCallback(
    (ply: number): ExplanationState => states.get(ply) ?? { status: "idle" },
    [states],
  );

  const explain = useCallback(
    async (ply: number, context: MoveExplanationContextInput, regenerate = false) => {
      abortRefs.current.get(ply)?.abort();
      const controller = new AbortController();
      abortRefs.current.set(ply, controller);

      setStates((prev) => {
        const next = new Map(prev);
        next.set(ply, { status: "loading" });
        return next;
      });

      try {
        const result = await requestMoveExplanation(context, {
          regenerate,
          signal: controller.signal,
        });

        if (controller.signal.aborted) {
          return;
        }

        setStates((prev) => {
          const next = new Map(prev);
          if (result.ok) {
            next.set(ply, {
              status: "success",
              data: result.data,
              cached: result.meta.cached,
            });
          } else {
            next.set(ply, { status: "error", message: result.error.message });
          }
          return next;
        });
      } catch {
        if (!controller.signal.aborted) {
          setStates((prev) => {
            const next = new Map(prev);
            next.set(ply, {
              status: "error",
              message: "Unable to generate the explanation. Your engine analysis is still available.",
            });
            return next;
          });
        }
      }
    },
    [],
  );

  const cancel = useCallback((ply: number) => {
    abortRefs.current.get(ply)?.abort();
    setStates((prev) => {
      const next = new Map(prev);
      const current = next.get(ply);
      if (current?.status === "loading") {
        next.set(ply, { status: "idle" });
      }
      return next;
    });
  }, []);

  return { getState, explain, cancel };
}
