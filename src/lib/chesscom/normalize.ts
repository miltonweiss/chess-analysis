import type { PlayerColor } from "@/lib/chess/types";
import { parsePgn } from "@/lib/chess/pgn";
import { deriveChessComGameId } from "@/lib/games/gameId";
import { getFinalPosition } from "@/lib/games/finalPosition";
import type { GameWithPgn, StoredGame, TimeClass, UserResult } from "@/lib/games/types";
import type { ChessComGame } from "@/lib/chesscom/types";

export type NormalizeResult =
  | { ok: true; entry: GameWithPgn }
  | { ok: false; reason: "variant" | "invalid_pgn"; message: string };

export function inferTimeClass(
  timeControl: string | undefined,
  timeClass: string | undefined,
  pgnHeaders?: Record<string, string>,
): TimeClass {
  const fromApi = timeClass?.toLowerCase();
  if (
    fromApi === "daily" ||
    fromApi === "rapid" ||
    fromApi === "blitz" ||
    fromApi === "bullet"
  ) {
    return fromApi;
  }

  const fromPgn = pgnHeaders?.TimeClass?.toLowerCase();
  if (
    fromPgn === "daily" ||
    fromPgn === "rapid" ||
    fromPgn === "blitz" ||
    fromPgn === "bullet"
  ) {
    return fromPgn;
  }

  if (!timeControl) {
    return "unknown";
  }

  const baseSeconds = Number.parseInt(timeControl.split("+")[0] ?? "", 10);
  if (Number.isNaN(baseSeconds)) {
    return "unknown";
  }

  if (baseSeconds < 180) {
    return "bullet";
  }
  if (baseSeconds <= 600) {
    return "blitz";
  }
  if (baseSeconds <= 3600) {
    return "rapid";
  }

  return "daily";
}

function deriveUserColor(
  username: string,
  whiteName: string,
  blackName: string,
): PlayerColor | undefined {
  const target = username.toLowerCase();
  if (whiteName.toLowerCase() === target) {
    return "white";
  }
  if (blackName.toLowerCase() === target) {
    return "black";
  }
  return undefined;
}

function deriveUserResult(rawResult: string | undefined, userColor?: PlayerColor): UserResult | null {
  if (!rawResult || !userColor) {
    return null;
  }

  if (rawResult === "1/2-1/2" || rawResult === "1/2-1/2*") {
    return "draw";
  }

  const whiteWins = rawResult === "1-0";
  const blackWins = rawResult === "0-1";
  if (!whiteWins && !blackWins) {
    return null;
  }

  if (userColor === "white") {
    return whiteWins ? "win" : "loss";
  }

  return blackWins ? "win" : "loss";
}

export function normalizeChessComGame(
  raw: ChessComGame,
  username: string,
): NormalizeResult {
  const rules = raw.rules ?? "chess";
  if (rules !== "chess") {
    return { ok: false, reason: "variant", message: `Skipped variant: ${rules}` };
  }

  const parsed = parsePgn(raw.pgn);
  if (!parsed.ok) {
    return {
      ok: false,
      reason: "invalid_pgn",
      message: parsed.error.message,
    };
  }

  const id = deriveChessComGameId(raw.url);
  if (!id) {
    return {
      ok: false,
      reason: "invalid_pgn",
      message: "Unable to derive Chess.com game id from URL",
    };
  }

  const userColor = deriveUserColor(
    username,
    raw.white.username,
    raw.black.username,
  );

  const finalPosition = getFinalPosition(parsed.game, raw.fen);

  const game: StoredGame = {
    id,
    source: "chess.com",
    sourceGameId: id.split(":").slice(1).join(":"),
    sourceUrl: raw.url,
    white: {
      name: raw.white.username,
      rating: raw.white.rating,
    },
    black: {
      name: raw.black.username,
      rating: raw.black.rating,
    },
    userColor,
    result: deriveUserResult(parsed.game.metadata.result, userColor),
    rawResult: parsed.game.metadata.result,
    endTime: raw.end_time * 1000,
    timeClass: inferTimeClass(raw.time_control, raw.time_class, parsed.game.metadata.headers),
    timeControl: raw.time_control,
    rated: raw.rated,
    rules,
    eco: parsed.game.metadata.eco,
    openingName: parsed.game.metadata.opening,
    moveCount: parsed.game.moves.length,
    chesscomAccuracies: raw.accuracies,
    importedAt: Date.now(),
    finalFen: finalPosition.finalFen,
    lastMove: finalPosition.lastMove,
  };

  return {
    ok: true,
    entry: {
      game,
      pgn: raw.pgn,
    },
  };
}
