"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { Chess, type Square } from "chess.js";
import type { MoveAnalysis } from "@/lib/analysis/types";
import { normalizeUci, uciToSan } from "@/lib/analysis/uciToSan";
import type { ChessMove, PlayerColor } from "@/lib/chess/types";

export type PreviewState =
  | { type: "idle" }
  | {
      type: "best_line";
      moves: string[];
      fens: string[];
      sans: string[];
      stepIndex: number; // 0 is initial before best move, 1 is after first best move, etc.
      /** The engine is currently computing the continuation of this line. */
      loading?: boolean;
      /** The line cannot be continued (game over, no engine move). */
      ended?: boolean;
    }
  | {
      type: "retry";
      fen: string;
      result: "waiting" | "correct" | "incorrect";
      lastAttemptSan?: string;
    }
  | {
      type: "explore";
      startPly: number;
      startMoveLabel?: string;
      startFen: string;
      fens: string[];
      sans: string[];
      moves: string[];
      stepIndex: number; // 0 is at startFen, 1 is after move 1, etc.
    };

type BestLineState = Extract<PreviewState, { type: "best_line" }>;

/** Plays UCI moves from a position; stops at the first illegal move. */
function playUciLine(startFen: string, ucis: string[]) {
  const fens: string[] = [];
  const sans: string[] = [];
  const moves: string[] = [];
  let current = startFen;

  for (const uci of ucis) {
    const norm = normalizeUci(uci);
    if (norm.length < 4) break;
    try {
      const chess = new Chess(current);
      const res = chess.move({
        from: norm.slice(0, 2) as Square,
        to: norm.slice(2, 4) as Square,
        promotion: norm[4] as "q" | "r" | "b" | "n" | undefined,
      });
      if (!res) break;
      current = chess.fen();
      fens.push(current);
      sans.push(res.san);
      moves.push(norm);
    } catch {
      break;
    }
  }

  return { fens, sans, moves };
}

export function useMovePreview(
  currentPly: number,
  analysis: MoveAnalysis | null,
  fenBefore: string | undefined,
  currentBoardFen: string,
  moveLabel?: string | null,
  /** Asks the engine for the best continuation (UCI moves) of a position. */
  fetchContinuation?: (fen: string) => Promise<string[]>,
) {
  const [internalState, setInternalState] = useState<{
    ply: number;
    preview: PreviewState;
  }>({
    ply: currentPly,
    preview: { type: "idle" },
  });

  const state = useMemo(
    () => (internalState.ply === currentPly ? internalState.preview : ({ type: "idle" } as const)),
    [internalState, currentPly],
  );

  const setState = useCallback(
    (updater: PreviewState | ((prev: PreviewState) => PreviewState)) => {
      setInternalState((curr) => {
        const active = curr.ply === currentPly ? curr.preview : { type: "idle" as const };
        const next = typeof updater === "function" ? updater(active) : updater;
        return { ply: currentPly, preview: next };
      });
    },
    [currentPly],
  );

  const extendingKeyRef = useRef<string | null>(null);
  const advanceWhenReadyRef = useRef(false);

  // Appends the engine's best continuation to the end of the best line.
  const extendBestLine = useCallback(
    async (baseFen: string) => {
      const key = `${currentPly}|${baseFen}`;
      if (extendingKeyRef.current === key) {
        return;
      }
      extendingKeyRef.current = key;
      const requestPly = currentPly;

      // Only touches the preview if it is still the same best line on the same ply.
      const patch = (update: (line: BestLineState) => BestLineState) => {
        setInternalState((curr) => {
          if (curr.ply !== requestPly || curr.preview.type !== "best_line") return curr;
          const line = curr.preview;
          if (line.fens[line.fens.length - 1] !== baseFen) return curr;
          return { ply: curr.ply, preview: update(line) };
        });
      };

      if (!fetchContinuation) {
        patch((line) => ({ ...line, ended: true }));
        extendingKeyRef.current = null;
        return;
      }

      patch((line) => ({ ...line, loading: true }));

      try {
        const ucis = await fetchContinuation(baseFen);
        const next = playUciLine(baseFen, ucis);
        const advance = advanceWhenReadyRef.current;
        advanceWhenReadyRef.current = false;

        patch((line) =>
          next.moves.length === 0
            ? { ...line, loading: false, ended: true }
            : {
                ...line,
                loading: false,
                moves: [...line.moves, ...next.moves],
                fens: [...line.fens, ...next.fens],
                sans: [...line.sans, ...next.sans],
                stepIndex:
                  advance && line.stepIndex === line.fens.length - 1
                    ? line.stepIndex + 1
                    : line.stepIndex,
              },
        );
      } catch {
        advanceWhenReadyRef.current = false;
        patch((line) => ({ ...line, loading: false }));
      } finally {
        if (extendingKeyRef.current === key) {
          extendingKeyRef.current = null;
        }
      }
    },
    [currentPly, fetchContinuation],
  );

  const startBestLine = useCallback(() => {
    if (!analysis || !fenBefore) return;

    advanceWhenReadyRef.current = false;

    const pvMoves =
      analysis.principalVariation && analysis.principalVariation.length > 0
        ? analysis.principalVariation
        : analysis.bestMove
          ? [analysis.bestMove]
          : [];

    if (pvMoves.length === 0) return;

    const fens: string[] = [fenBefore];
    const sans: string[] = [];
    const validMoves: string[] = [];

    let current = fenBefore;
    for (const uci of pvMoves) {
      const norm = normalizeUci(uci);
      const san = uciToSan(current, norm);
      if (!san) break;
      try {
        const chess = new Chess(current);
        const res = chess.move({
          from: norm.slice(0, 2) as Square,
          to: norm.slice(2, 4) as Square,
          promotion: norm[4] as "q" | "r" | "b" | "n" | undefined,
        });
        if (!res) break;
        current = chess.fen();
        fens.push(current);
        sans.push(san);
        validMoves.push(norm);
      } catch {
        break;
      }
    }

    if (sans.length === 0) return;

    setState({
      type: "best_line",
      moves: validMoves,
      fens,
      sans,
      stepIndex: 1,
    });

    // Short stored line: continue it right away so stepping never dead-ends.
    if (fens.length <= 3) {
      void extendBestLine(fens[fens.length - 1]);
    }
  }, [analysis, fenBefore, setState, extendBestLine]);

  const stepBestLine = useCallback(
    (direction: number) => {
      if (state.type !== "best_line") return;

      const lastIndex = state.fens.length - 1;
      const nextIdx = Math.max(0, Math.min(lastIndex, state.stepIndex + direction));

      setState((prev) => {
        if (prev.type !== "best_line") return prev;
        const idx = Math.max(0, Math.min(prev.fens.length - 1, prev.stepIndex + direction));
        return { ...prev, stepIndex: idx };
      });

      if (state.ended) return;

      // Stepping forward at the end: step as soon as the engine line arrives.
      if (direction > 0 && state.stepIndex >= lastIndex) {
        advanceWhenReadyRef.current = true;
      }

      // Close to the end: prefetch the next best moves from the engine.
      if (nextIdx >= lastIndex - 1) {
        void extendBestLine(state.fens[lastIndex]);
      }
    },
    [state, setState, extendBestLine],
  );

  const startRetry = useCallback(() => {
    if (!fenBefore) return;
    setState({
      type: "retry",
      fen: fenBefore,
      result: "waiting",
    });
  }, [fenBefore, setState]);

  const startExplore = useCallback(() => {
    setState({
      type: "explore",
      startPly: currentPly,
      startMoveLabel: moveLabel ?? undefined,
      startFen: currentBoardFen,
      fens: [currentBoardFen],
      sans: [],
      moves: [],
      stepIndex: 0,
    });
  }, [currentPly, currentBoardFen, moveLabel, setState]);

  const cancel = useCallback(() => {
    setState({ type: "idle" });
  }, [setState]);

  const handleRetryMove = useCallback(
    (from: string, to: string, promotion?: string): boolean => {
      if (state.type !== "retry" || !fenBefore || !analysis) {
        return false;
      }

      try {
        const chess = new Chess(state.fen);
        const moveRes = chess.move({
          from: from as Square,
          to: to as Square,
          promotion: promotion as "q" | "r" | "b" | "n" | undefined,
        });

        if (!moveRes) return false;

        const playedUci = `${from}${to}${promotion ?? ""}`.toLowerCase();
        const bestUci = (analysis.bestMove ?? "").toLowerCase();

        const isBest =
          playedUci === bestUci ||
          (analysis.engineBefore?.lines ?? []).some(
            (line) => line.bestMove && line.bestMove.toLowerCase() === playedUci,
          );

        setState({
          type: "retry",
          fen: chess.fen(),
          result: isBest ? "correct" : "incorrect",
          lastAttemptSan: moveRes.san,
        });

        return true;
      } catch {
        return false;
      }
    },
    [state, fenBefore, analysis, setState],
  );

  const handleExploreMove = useCallback(
    (from: string, to: string, promotion?: string): boolean => {
      const activeBaseFen =
        state.type === "explore"
          ? state.fens[state.stepIndex]
          : state.type === "retry"
            ? state.fen
            : state.type === "best_line"
              ? state.fens[state.stepIndex]
              : currentBoardFen;

      try {
        const chess = new Chess(activeBaseFen);
        const moveRes = chess.move({
          from: from as Square,
          to: to as Square,
          promotion: promotion as "q" | "r" | "b" | "n" | undefined,
        });

        if (!moveRes) return false;

        const uci = `${from}${to}${promotion ?? ""}`.toLowerCase();
        const nextFen = chess.fen();
        const san = moveRes.san;

        setState((prev) => {
          if (prev.type === "explore") {
            const nextFens = prev.fens.slice(0, prev.stepIndex + 1).concat(nextFen);
            const nextSans = prev.sans.slice(0, prev.stepIndex).concat(san);
            const nextMoves = prev.moves.slice(0, prev.stepIndex).concat(uci);
            return {
              ...prev,
              fens: nextFens,
              sans: nextSans,
              moves: nextMoves,
              stepIndex: nextFens.length - 1,
            };
          }

          // Starting explore from idle, best_line, or retry
          return {
            type: "explore",
            startPly: currentPly,
            startMoveLabel: moveLabel ?? undefined,
            startFen: activeBaseFen,
            fens: [activeBaseFen, nextFen],
            sans: [san],
            moves: [uci],
            stepIndex: 1,
          };
        });

        return true;
      } catch {
        return false;
      }
    },
    [state, currentBoardFen, currentPly, moveLabel, setState],
  );

  const stepExplore = useCallback(
    (direction: number) => {
      setState((prev) => {
        if (prev.type !== "explore") return prev;
        const nextIdx = Math.max(0, Math.min(prev.fens.length - 1, prev.stepIndex + direction));
        return { ...prev, stepIndex: nextIdx };
      });
    },
    [setState],
  );

  const jumpExplore = useCallback(
    (index: number) => {
      setState((prev) => {
        if (prev.type !== "explore") return prev;
        const nextIdx = Math.max(0, Math.min(prev.fens.length - 1, index));
        return { ...prev, stepIndex: nextIdx };
      });
    },
    [setState],
  );

  const resetExplore = useCallback(() => {
    setState((prev) => {
      if (prev.type !== "explore") return prev;
      return { ...prev, stepIndex: 0 };
    });
  }, [setState]);

  const previewLastMove = useMemo<ChessMove | null>(() => {
    if (state.type === "best_line" && state.stepIndex > 0) {
      const uci = state.moves[state.stepIndex - 1];
      const san = state.sans[state.stepIndex - 1];
      if (uci) {
        return {
          ply: currentPly,
          moveNumber: Math.floor((currentPly + 1) / 2),
          color:
            state.stepIndex % 2 === 1
              ? currentPly % 2 === 1
                ? "white"
                : "black"
              : currentPly % 2 === 1
                ? "black"
                : "white",
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          san: san ?? "",
          uci,
          fenBefore: state.fens[state.stepIndex - 1] ?? "",
          fenAfter: state.fens[state.stepIndex] ?? "",
        };
      }
    }

    if (state.type === "explore" && state.stepIndex > 0) {
      const uci = state.moves[state.stepIndex - 1];
      const san = state.sans[state.stepIndex - 1];
      if (uci) {
        const fenBeforeMove = state.fens[state.stepIndex - 1];
        let color: PlayerColor = "white";
        try {
          const chess = new Chess(fenBeforeMove);
          color = chess.turn() === "w" ? "white" : "black";
        } catch {
          // ignore
        }
        return {
          ply: state.startPly + state.stepIndex,
          moveNumber: Math.floor((state.startPly + state.stepIndex + 1) / 2),
          color,
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          san: san ?? "",
          uci,
          fenBefore: fenBeforeMove ?? "",
          fenAfter: state.fens[state.stepIndex] ?? "",
        };
      }
    }

    return null;
  }, [state, currentPly]);

  const activeFen = useMemo(() => {
    if (state.type === "best_line") {
      return state.fens[state.stepIndex];
    }
    if (state.type === "retry") {
      return state.fen;
    }
    if (state.type === "explore") {
      return state.fens[state.stepIndex];
    }
    return undefined;
  }, [state]);

  return {
    state,
    activeFen,
    previewLastMove,
    startBestLine,
    stepBestLine,
    startRetry,
    startExplore,
    handleExploreMove,
    stepExplore,
    jumpExplore,
    resetExplore,
    cancel,
    handleRetryMove,
  };
}
