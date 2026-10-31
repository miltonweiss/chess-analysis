"use client";

import { useCallback, useMemo, useReducer, useState } from "react";
import {
  canGoBack,
  canGoForward,
  createInitialState,
  gameReducer,
  getCurrentFen,
  getCurrentPosition,
  getCurrentTurn,
  getGameStatus,
  getLastMove,
  getTimeline,
  isLegalMove,
  squaresToUci,
} from "@/lib/chess/game";
import { parsePgn } from "@/lib/chess/pgn";
import type {
  GameMetadata,
  LoadedGame,
  PlayerColor,
  PgnParseResult,
} from "@/lib/chess/types";
import { userColorFromMetadata } from "@/lib/chess/orientation";
import { getChessComUsername, getUserSettings } from "@/lib/storage/preferences";

function createInitialStateFromGame(
  metadata: GameMetadata,
  initialGame?: LoadedGame,
): ReturnType<typeof createInitialState> {
  if (!initialGame) {
    return createInitialState(metadata);
  }

  return {
    initialFen: initialGame.initialFen,
    moves: initialGame.moves,
    cursor: initialGame.moves.length,
    metadata: initialGame.metadata,
    mode: "replay",
    pgn: initialGame.pgn,
  };
}

export function useChessGame(
  initialMetadata: GameMetadata = {},
  initialGame?: LoadedGame,
  /** Color the user played; the board is shown from this side when known. */
  userColor?: PlayerColor,
) {
  const [state, dispatch] = useReducer(
    gameReducer,
    { metadata: initialMetadata, initialGame },
    ({ metadata, initialGame: game }) => createInitialStateFromGame(metadata, game),
  );
  const [orientation, setOrientation] = useState<PlayerColor>(
    () =>
      userColor ??
      userColorFromMetadata(initialGame?.metadata ?? initialMetadata, getChessComUsername()) ??
      getUserSettings().defaultBoardOrientation,
  );

  const timeline = useMemo(() => getTimeline(state), [state]);
  const currentPosition = useMemo(() => getCurrentPosition(state), [state]);
  const fen = useMemo(() => getCurrentFen(state), [state]);
  const turn = useMemo(() => getCurrentTurn(state), [state]);
  const status = useMemo(() => getGameStatus(state), [state]);
  const lastMove = useMemo(() => getLastMove(state), [state]);

  const makeMove = useCallback(
    (uci: string) => {
      if (!isLegalMove(state, uci)) {
        return false;
      }
      dispatch({ type: "MAKE_MOVE", uci });
      return true;
    },
    [state],
  );

  const makeMoveFromSquares = useCallback(
    (from: string, to: string, promotion?: "q" | "r" | "b" | "n") => {
      const uci = promotion
        ? squaresToUci(from, to, promotion)
        : squaresToUci(from, to);
      return makeMove(uci);
    },
    [makeMove],
  );

  const first = useCallback(() => dispatch({ type: "FIRST" }), []);
  const previous = useCallback(() => dispatch({ type: "PREVIOUS" }), []);
  const next = useCallback(() => dispatch({ type: "NEXT" }), []);
  const last = useCallback(() => dispatch({ type: "LAST" }), []);
  const goToPly = useCallback((ply: number) => dispatch({ type: "GOTO", ply }), []);
  const newBoard = useCallback(() => dispatch({ type: "NEW_BOARD" }), []);
  const flipBoard = useCallback(
    () => setOrientation((current) => (current === "white" ? "black" : "white")),
    [],
  );

  const loadPgn = useCallback((pgnText: string): PgnParseResult => {
    const result = parsePgn(pgnText);
    if (result.ok) {
      dispatch({ type: "LOAD_GAME", game: result.game });
      const userColor = userColorFromMetadata(result.game.metadata, getChessComUsername());
      if (userColor) {
        setOrientation(userColor);
      }
    }
    return result;
  }, []);

  return {
    state,
    timeline,
    currentPosition,
    fen,
    turn,
    status,
    lastMove,
    orientation,
    mode: state.mode,
    metadata: state.metadata,
    canGoBack: canGoBack(state),
    canGoForward: canGoForward(state),
    makeMove,
    makeMoveFromSquares,
    first,
    previous,
    next,
    last,
    goToPly,
    newBoard,
    flipBoard,
    loadPgn,
  };
}

export type UseChessGameReturn = ReturnType<typeof useChessGame>;
