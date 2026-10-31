import { Chess } from "chess.js";

export function isForcedPosition(fen: string): boolean {
  try {
    const chess = new Chess(fen);
    return chess.moves().length === 1;
  } catch {
    return false;
  }
}
