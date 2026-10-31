import { Chess } from "chess.js";

export function normalizeUci(uci: string): string {
  return uci.trim().toLowerCase();
}

export function uciToSan(fen: string, uci: string): string | null {
  const normalized = normalizeUci(uci);
  if (normalized.length < 4) {
    return null;
  }

  try {
    const chess = new Chess(fen);
    const move = chess.move({
      from: normalized.slice(0, 2),
      to: normalized.slice(2, 4),
      promotion: normalized[4] as "q" | "r" | "b" | "n" | undefined,
    });

    return move?.san ?? null;
  } catch {
    return null;
  }
}

export function uciMovesMatch(played: string, best: string): boolean {
  return normalizeUci(played) === normalizeUci(best);
}
