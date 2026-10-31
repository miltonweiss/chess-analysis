import type { LoadedGame } from "@/lib/chess/types";
import type { StoredGame } from "@/lib/games/types";

export type FinalPosition = {
  finalFen: string;
  lastMove?: NonNullable<StoredGame["lastMove"]>;
};

/**
 * Final position of a game and the squares of its last move.
 * Without moves, falls back to `fallbackFen` (or the initial position).
 */
export function getFinalPosition(
  game: Pick<LoadedGame, "initialFen" | "moves">,
  fallbackFen?: string,
): FinalPosition {
  const last = game.moves[game.moves.length - 1];
  if (!last) {
    return { finalFen: fallbackFen ?? game.initialFen };
  }

  return {
    finalFen: last.fenAfter,
    lastMove: { from: last.from, to: last.to },
  };
}
