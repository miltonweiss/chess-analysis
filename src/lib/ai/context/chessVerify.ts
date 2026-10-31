import { Chess } from "chess.js";

export function isValidFen(fen: string): boolean {
  try {
    new Chess(fen);
    return true;
  } catch {
    return false;
  }
}

export function uciToSanFromFen(fen: string, uci: string): string | null {
  try {
    const chess = new Chess(fen);
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4] as "q" | "r" | "b" | "n" | undefined,
    });
    return move?.san ?? null;
  } catch {
    return null;
  }
}

export function verifyMoveFromFen(
  fenBefore: string,
  uci: string,
  expectedFenAfter?: string,
): { ok: true; san: string; fenAfter: string } | { ok: false; reason: string } {
  if (!isValidFen(fenBefore)) {
    return { ok: false, reason: "Invalid FEN before move" };
  }

  try {
    const chess = new Chess(fenBefore);
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4] as "q" | "r" | "b" | "n" | undefined,
    });

    if (!move) {
      return { ok: false, reason: `Illegal move ${uci} from position` };
    }

    const fenAfter = chess.fen();
    if (expectedFenAfter) {
      const beforeKey = fenBefore.split(" ").slice(0, 4).join(" ");
      const afterKey = expectedFenAfter.split(" ").slice(0, 4).join(" ");
      const computedKey = fenAfter.split(" ").slice(0, 4).join(" ");
      if (computedKey !== afterKey) {
        return { ok: false, reason: "FEN after move does not match expected" };
      }
      void beforeKey;
    }

    return { ok: true, san: move.san, fenAfter };
  } catch {
    return { ok: false, reason: `Failed to verify move ${uci}` };
  }
}

export function verifyPvLine(fen: string, pv: string[]): string[] | null {
  if (pv.length === 0) {
    return [];
  }

  const sanMoves: string[] = [];
  let currentFen = fen;

  for (const uci of pv) {
    const result = verifyMoveFromFen(currentFen, uci);
    if (!result.ok) {
      return null;
    }
    sanMoves.push(result.san);
    currentFen = result.fenAfter;
  }

  return sanMoves;
}

export function sanitizeUntrustedText(text: string, maxLength = 200): string {
  return text
    .replace(/[\x00-\x1f\x7f]/g, "")
    .replace(/</g, "\\u003c")
    .slice(0, maxLength);
}
