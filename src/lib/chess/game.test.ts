import { describe, expect, it } from "vitest";
import {
  canGoBack,
  canGoForward,
  createInitialState,
  gameReducer,
  getCurrentFen,
  getGameStatus,
  getTimeline,
  isLegalMove,
  isPromotionMove,
  loadedGameToState,
} from "@/lib/chess/game";
import { parsePgn } from "@/lib/chess/pgn";
import type { LoadedGame } from "@/lib/chess/types";

const SAMPLE_GAME: LoadedGame = {
  initialFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  pgn: "1. e4 e5 2. Nf3",
  metadata: {},
  moves: [
    {
      ply: 1,
      moveNumber: 1,
      color: "white",
      san: "e4",
      uci: "e2e4",
      from: "e2",
      to: "e4",
      fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      fenAfter: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
    },
    {
      ply: 2,
      moveNumber: 1,
      color: "black",
      san: "e5",
      uci: "e7e5",
      from: "e7",
      to: "e5",
      fenBefore: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
      fenAfter: "rnbqkbnr/pppp1ppp/8/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    },
    {
      ply: 3,
      moveNumber: 2,
      color: "white",
      san: "Nf3",
      uci: "g1f3",
      from: "g1",
      to: "f3",
      fenBefore: "rnbqkbnr/pppp1ppp/8/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
      fenAfter: "rnbqkbnr/pppp1ppp/8/4p3/8/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
    },
  ],
};

describe("game reducer", () => {
  it("rejects illegal moves", () => {
    const state = createInitialState();
    expect(isLegalMove(state, "e2e5")).toBe(false);

    const next = gameReducer(state, { type: "MAKE_MOVE", uci: "e2e5" });
    expect(next.moves).toHaveLength(0);
  });

  it("applies legal moves and updates fen", () => {
    const state = createInitialState();
    const next = gameReducer(state, { type: "MAKE_MOVE", uci: "e2e4" });

    expect(next.moves).toHaveLength(1);
    expect(next.cursor).toBe(1);
    expect(getCurrentFen(next)).toContain(" b ");
  });

  it("supports previous and next via cursor", () => {
    let state = createInitialState();
    state = gameReducer(state, { type: "MAKE_MOVE", uci: "e2e4" });
    state = gameReducer(state, { type: "MAKE_MOVE", uci: "e7e5" });

    expect(canGoBack(state)).toBe(true);
    expect(canGoForward(state)).toBe(false);

    state = gameReducer(state, { type: "PREVIOUS" });
    expect(state.cursor).toBe(1);
    expect(canGoForward(state)).toBe(true);

    state = gameReducer(state, { type: "NEXT" });
    expect(state.cursor).toBe(2);
  });

  it("supports first and last navigation with boundaries", () => {
    let state = loadedGameToState(SAMPLE_GAME);

    state = gameReducer(state, { type: "FIRST" });
    expect(state.cursor).toBe(0);
    state = gameReducer(state, { type: "PREVIOUS" });
    expect(state.cursor).toBe(0);

    state = gameReducer(state, { type: "LAST" });
    expect(state.cursor).toBe(3);
    state = gameReducer(state, { type: "NEXT" });
    expect(state.cursor).toBe(3);
  });

  it("clamps goto ply", () => {
    let state = loadedGameToState(SAMPLE_GAME);
    state = gameReducer(state, { type: "GOTO", ply: 99 });
    expect(state.cursor).toBe(3);
    state = gameReducer(state, { type: "GOTO", ply: -4 });
    expect(state.cursor).toBe(0);
  });

  it("truncates future moves when making a new move after undo", () => {
    let state = createInitialState();
    state = gameReducer(state, { type: "MAKE_MOVE", uci: "e2e4" });
    state = gameReducer(state, { type: "MAKE_MOVE", uci: "e7e5" });
    state = gameReducer(state, { type: "PREVIOUS" });
    state = gameReducer(state, { type: "MAKE_MOVE", uci: "c7c5" });

    expect(state.moves).toHaveLength(2);
    expect(state.moves[1]?.uci).toBe("c7c5");
    expect(state.cursor).toBe(2);
  });

  it("ignores make move in replay mode", () => {
    let state = loadedGameToState(SAMPLE_GAME);
    state = gameReducer(state, { type: "GOTO", ply: 1 });
    const next = gameReducer(state, { type: "MAKE_MOVE", uci: "d2d4" });

    expect(next.moves).toHaveLength(3);
    expect(next.cursor).toBe(1);
  });

  it("detects fool's mate", () => {
    let state = createInitialState();
    const sequence = ["f2f3", "e7e5", "g2g4", "d8h4"];

    for (const uci of sequence) {
      state = gameReducer(state, { type: "MAKE_MOVE", uci });
    }

    const status = getGameStatus(state);
    expect(status.type).toBe("checkmate");
    if (status.type === "checkmate") {
      expect(status.winner).toBe("black");
    }
  });

  it("derives timeline positions from loaded game", () => {
    const state = loadedGameToState(SAMPLE_GAME);
    const timeline = getTimeline(state);

    expect(timeline).toHaveLength(4);
    expect(timeline[2]?.fen).toContain("4p3");
    expect(timeline[3]?.move?.san).toBe("Nf3");
  });

  it("detects promotion moves and rejects non-promotion pawn pushes", () => {
    const start = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    expect(isPromotionMove(start, "e2", "e4")).toBe(false);
    expect(isPromotionMove(start, "g1", "f3")).toBe(false);

    const whitePromotes = "7k/4P3/8/8/8/8/4K3/8 w - - 0 1";
    expect(isPromotionMove(whitePromotes, "e7", "e8")).toBe(true);
    expect(isPromotionMove(whitePromotes, "e7", "e6")).toBe(false);

    const blackPromotes = "4K3/8/8/8/8/8/4p3/7k b - - 0 1";
    expect(isPromotionMove(blackPromotes, "e2", "e1")).toBe(true);
  });

  it("applies underpromotion via uci", () => {
    let state = createInitialState({}, "7k/4P3/8/8/8/8/4K3/8 w - - 0 1");
    state = gameReducer(state, { type: "MAKE_MOVE", uci: "e7e8n" });

    expect(state.moves).toHaveLength(1);
    expect(state.moves[0]?.promotion).toBe("n");
    expect(state.moves[0]?.san).toMatch(/N/);
  });

  it("loads parsed pgn into replay mode", () => {
    const parsed = parsePgn("1. e4 e5 *");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const state = loadedGameToState(parsed.game);
    expect(state.mode).toBe("replay");
    expect(state.moves).toHaveLength(2);
    expect(state.cursor).toBe(2);
  });
});
