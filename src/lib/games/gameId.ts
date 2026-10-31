import type { LoadedGame } from "@/lib/chess/types";

const CHESS_COM_LIVE = /chess\.com\/game\/live\/(\d+)/i;
const CHESS_COM_DAILY = /chess\.com\/game\/(?:daily\/)?(\d+)/i;

export function deriveChessComGameId(url: string): string | null {
  const liveMatch = url.match(CHESS_COM_LIVE);
  if (liveMatch) {
    return `chess.com:live:${liveMatch[1]}`;
  }

  const dailyMatch = url.match(CHESS_COM_DAILY);
  if (dailyMatch) {
    return `chess.com:daily:${dailyMatch[1]}`;
  }

  return null;
}

function normalizeHeader(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Deterministic fallback id for PGN/manual imports without a provider URL. */
export async function derivePgnGameId(game: LoadedGame): Promise<string> {
  const meta = game.metadata;
  const headerPart = [
    normalizeHeader(meta.date),
    normalizeHeader(meta.white),
    normalizeHeader(meta.black),
    normalizeHeader(meta.result),
  ].join("|");

  const movePart = game.moves.map((move) => move.uci).join(",");
  const hash = await sha256Hex(`${headerPart}::${movePart}`);
  return `pgn:${hash.slice(0, 32)}`;
}

export async function deriveGameIdFromLoadedGame(
  game: LoadedGame,
  sourceUrl?: string,
): Promise<string> {
  if (sourceUrl) {
    const chessComId = deriveChessComGameId(sourceUrl);
    if (chessComId) {
      return chessComId;
    }
  }

  const link = game.metadata.headers?.Link ?? game.metadata.site;
  if (link) {
    const chessComId = deriveChessComGameId(link);
    if (chessComId) {
      return chessComId;
    }
  }

  return derivePgnGameId(game);
}
