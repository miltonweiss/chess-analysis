import type { ChessMove, GamePosition } from "@/lib/chess/types";

export function buildTimeline(initialFen: string, moves: ChessMove[]): GamePosition[] {
  const positions: GamePosition[] = [{ ply: 0, fen: initialFen, move: null }];

  for (const move of moves) {
    positions.push({
      ply: move.ply,
      fen: move.fenAfter,
      move,
    });
  }

  return positions;
}

export function getPositionKey(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

export function playedMoveMatches(
  move: ChessMove,
  from: string,
  to: string,
  promotion?: string,
): boolean {
  return (
    move.from.toLowerCase() === from.toLowerCase() &&
    move.to.toLowerCase() === to.toLowerCase() &&
    (move.promotion ?? "").toLowerCase() === (promotion ?? "").toLowerCase()
  );
}

/** Ply to jump to when the first variation move is the next move of the real game. */
export function continueGamePly(
  timeline: GamePosition[],
  moves: ChessMove[],
  currentFen: string,
  preferredPly: number,
  from: string,
  to: string,
  promotion?: string,
): number | null {
  const fenKey = getPositionKey(currentFen);
  let ply: number | null = null;

  if (timeline[preferredPly] && getPositionKey(timeline[preferredPly].fen) === fenKey) {
    ply = preferredPly;
  } else {
    const idx = timeline.findIndex((position) => getPositionKey(position.fen) === fenKey);
    ply = idx === -1 ? null : idx;
  }

  if (ply === null) {
    return null;
  }

  const nextMove = moves[ply];
  if (!nextMove || !playedMoveMatches(nextMove, from, to, promotion)) {
    return null;
  }

  return ply + 1;
}

export function countRepetitions(timeline: GamePosition[], upToPly: number): number {
  if (upToPly <= 0) {
    return 1;
  }

  const currentKey = getPositionKey(timeline[upToPly]?.fen ?? "");
  let count = 0;

  for (let ply = 0; ply <= upToPly; ply += 1) {
    if (getPositionKey(timeline[ply]?.fen ?? "") === currentKey) {
      count += 1;
    }
  }

  return count;
}
