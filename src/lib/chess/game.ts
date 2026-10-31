import { Chess, DEFAULT_POSITION } from "chess.js";
import { buildTimeline, countRepetitions } from "@/lib/chess/timeline";
import type {
  ChessMove,
  GameAction,
  GameMetadata,
  GamePosition,
  GameState,
  GameStatus,
  LoadedGame,
  PlayerColor,
} from "@/lib/chess/types";

export function createInitialState(
  metadata: GameMetadata = {},
  initialFen: string = DEFAULT_POSITION,
): GameState {
  return {
    initialFen,
    moves: [],
    cursor: 0,
    metadata,
    mode: "play",
  };
}

function colorFromChess(color: "w" | "b"): PlayerColor {
  return color === "w" ? "white" : "black";
}

export function getTimeline(state: GameState): GamePosition[] {
  return buildTimeline(state.initialFen, state.moves);
}

export function getCurrentPosition(state: GameState): GamePosition {
  const timeline = getTimeline(state);
  return timeline[state.cursor] ?? timeline[0];
}

export function getCurrentFen(state: GameState): string {
  return getCurrentPosition(state).fen;
}

export function getCurrentTurn(state: GameState): PlayerColor {
  const chess = new Chess(getCurrentFen(state));
  return colorFromChess(chess.turn());
}

export function getGameStatus(state: GameState): GameStatus {
  const fen = getCurrentFen(state);
  const chess = new Chess(fen);
  const timeline = getTimeline(state);

  if (chess.isCheckmate()) {
    const winner = colorFromChess(chess.turn() === "w" ? "b" : "w");
    return { type: "checkmate", winner };
  }

  if (chess.isStalemate()) {
    return { type: "stalemate" };
  }

  if (countRepetitions(timeline, state.cursor) >= 3) {
    return { type: "draw", reason: "threefold repetition" };
  }

  if (chess.isDraw()) {
    if (chess.isDrawByFiftyMoves()) {
      return { type: "draw", reason: "fifty-move rule" };
    }
    if (chess.isInsufficientMaterial()) {
      return { type: "draw", reason: "insufficient material" };
    }
    return { type: "draw", reason: "draw" };
  }

  return { type: "playing", turn: colorFromChess(chess.turn()) };
}

export function isLegalMove(state: GameState, uci: string): boolean {
  if (state.mode !== "play") {
    return false;
  }

  const chess = new Chess(getCurrentFen(state));
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci.length > 4 ? uci[4] : undefined;

  try {
    const move = chess.move({ from, to, promotion: promotion ?? "q" });
    return move !== null;
  } catch {
    return false;
  }
}

function moveFromUci(state: GameState, uci: string): ChessMove | null {
  const chess = new Chess(getCurrentFen(state));
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci.length > 4 ? uci[4] : undefined;

  let result;
  try {
    result = chess.move({ from, to, promotion: promotion ?? "q" });
  } catch {
    return null;
  }

  if (!result) {
    return null;
  }

  const ply = state.cursor + 1;
  const moveNumber = Math.ceil(ply / 2);

  return {
    ply,
    moveNumber,
    color: colorFromChess(result.color),
    san: result.san,
    uci: result.lan,
    from: result.from,
    to: result.to,
    promotion: result.promotion,
    fenBefore: result.before,
    fenAfter: result.after,
  };
}

export function squaresToUci(
  from: string,
  to: string,
  promotion?: "q" | "r" | "b" | "n",
): string {
  if (promotion) {
    return `${from}${to}${promotion}`;
  }
  return `${from}${to}`;
}

/** True when the piece on `from` can legally advance to `to` with pawn promotion. */
export function isPromotionMove(fen: string, from: string, to: string): boolean {
  const chess = new Chess(fen);
  const piece = chess.get(from as Parameters<Chess["get"]>[0]);
  if (!piece || piece.type !== "p") {
    return false;
  }

  const targetRank = to[1];
  if (piece.color === "w" && targetRank !== "8") {
    return false;
  }
  if (piece.color === "b" && targetRank !== "1") {
    return false;
  }

  try {
    const move = chess.move({ from, to, promotion: "q" });
    return move !== null;
  } catch {
    return false;
  }
}

function clampPly(state: GameState, ply: number): number {
  return Math.max(0, Math.min(state.moves.length, ply));
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "MAKE_MOVE": {
      if (state.mode !== "play") {
        return state;
      }

      const move = moveFromUci(state, action.uci);
      if (!move) {
        return state;
      }

      const truncatedMoves = state.moves.slice(0, state.cursor);
      return {
        ...state,
        moves: [...truncatedMoves, move],
        cursor: truncatedMoves.length + 1,
      };
    }

    case "PREVIOUS":
      return {
        ...state,
        cursor: Math.max(0, state.cursor - 1),
      };

    case "NEXT":
      return {
        ...state,
        cursor: Math.min(state.moves.length, state.cursor + 1),
      };

    case "FIRST":
      return {
        ...state,
        cursor: 0,
      };

    case "LAST":
      return {
        ...state,
        cursor: state.moves.length,
      };

    case "GOTO":
      return {
        ...state,
        cursor: clampPly(state, action.ply),
      };

    case "NEW_BOARD":
      return createInitialState();

    case "LOAD_GAME":
      return loadedGameToState(action.game);

    default:
      return state;
  }
}

export function loadedGameToState(game: LoadedGame): GameState {
  return {
    initialFen: game.initialFen,
    moves: game.moves,
    cursor: game.moves.length,
    metadata: game.metadata,
    mode: "replay",
    pgn: game.pgn,
  };
}

export function canGoBack(state: GameState): boolean {
  return state.cursor > 0;
}

export function canGoForward(state: GameState): boolean {
  return state.cursor < state.moves.length;
}

export function getLastMove(state: GameState): ChessMove | null {
  if (state.cursor === 0) {
    return null;
  }
  return state.moves[state.cursor - 1] ?? null;
}
