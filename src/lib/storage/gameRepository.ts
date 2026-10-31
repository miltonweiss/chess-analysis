import { parsePgn } from "@/lib/chess/pgn";
import type { LoadedGame } from "@/lib/chess/types";
import { getFinalPosition } from "@/lib/games/finalPosition";
import { deriveGameIdFromLoadedGame } from "@/lib/games/gameId";
import type {
  GameWithPgn,
  StoredAnalysis,
  StoredGame,
  StoredPgn,
  SyncRecord,
} from "@/lib/games/types";
import {
  idbClear,
  idbCount,
  idbDelete,
  idbGet,
  idbGetAll,
  idbPut,
  idbPutMany,
  isIndexedDbAvailable,
} from "@/lib/storage/indexedDb";

export function assertIndexedDbAvailable(): void {
  if (!isIndexedDbAvailable()) {
    throw new Error("IndexedDB is not available in this environment");
  }
}

export async function saveGames(entries: GameWithPgn[]): Promise<void> {
  assertIndexedDbAvailable();
  if (entries.length === 0) {
    return;
  }

  await idbPutMany(
    "games",
    entries.map((entry) => entry.game),
  );
  await idbPutMany(
    "pgns",
    entries.map((entry) => ({ gameId: entry.game.id, pgn: entry.pgn } satisfies StoredPgn)),
  );
}

export async function listGames(): Promise<StoredGame[]> {
  assertIndexedDbAvailable();
  return idbGetAll<StoredGame>("games");
}

export async function getGame(id: string): Promise<StoredGame | undefined> {
  assertIndexedDbAvailable();
  return idbGet<StoredGame>("games", id);
}

export async function getPgn(gameId: string): Promise<string | undefined> {
  assertIndexedDbAvailable();
  const record = await idbGet<StoredPgn>("pgns", gameId);
  return record?.pgn;
}

export async function hasGame(id: string): Promise<boolean> {
  assertIndexedDbAvailable();
  const game = await idbGet<StoredGame>("games", id);
  return Boolean(game);
}

export async function getAllGameIds(): Promise<Set<string>> {
  const games = await listGames();
  return new Set(games.map((game) => game.id));
}

export async function saveAnalysis(analysis: StoredAnalysis): Promise<void> {
  assertIndexedDbAvailable();
  await idbPut("analyses", analysis);

  const game = await getGame(analysis.gameId);
  if (game) {
    await idbPut("games", {
      ...game,
      analysisSummary: analysis.summary,
    });
  }
}

export async function getAnalysis(gameId: string): Promise<StoredAnalysis | undefined> {
  assertIndexedDbAvailable();
  return idbGet<StoredAnalysis>("analyses", gameId);
}

export async function countGames(): Promise<number> {
  assertIndexedDbAvailable();
  return idbCount("games");
}

export async function deleteGame(gameId: string): Promise<void> {
  assertIndexedDbAvailable();
  await idbDelete("games", gameId);
  await idbDelete("pgns", gameId);
  await idbDelete("analyses", gameId);
}

export async function saveSyncRecord(record: SyncRecord): Promise<void> {
  assertIndexedDbAvailable();
  await idbPut("sync", record);
}

export async function getSyncRecord(key: string): Promise<SyncRecord | undefined> {
  assertIndexedDbAvailable();
  return idbGet<SyncRecord>("sync", key);
}

export async function saveLoadedGame(
  loaded: LoadedGame,
  options: {
    source: StoredGame["source"];
    sourceUrl?: string;
    userColor?: StoredGame["userColor"];
    endTime?: number;
    timeClass?: StoredGame["timeClass"];
    timeControl?: string;
    rated?: boolean;
    rules?: string;
    chesscomAccuracies?: StoredGame["chesscomAccuracies"];
  },
): Promise<StoredGame> {
  const id = await deriveGameIdFromLoadedGame(loaded, options.sourceUrl);
  const existing = await getGame(id);

  const game: StoredGame = {
    id,
    source: options.source,
    sourceGameId: id.includes(":") ? id.split(":").slice(1).join(":") : undefined,
    sourceUrl: options.sourceUrl,
    white: {
      name: loaded.metadata.white ?? "White",
      rating: loaded.metadata.whiteElo ? Number(loaded.metadata.whiteElo) : undefined,
    },
    black: {
      name: loaded.metadata.black ?? "Black",
      rating: loaded.metadata.blackElo ? Number(loaded.metadata.blackElo) : undefined,
    },
    userColor: options.userColor,
    result: deriveUserResult(loaded.metadata.result, options.userColor),
    rawResult: loaded.metadata.result,
    endTime: options.endTime ?? Date.now(),
    timeClass: options.timeClass ?? "unknown",
    timeControl: options.timeControl ?? loaded.metadata.timeControl,
    rated: options.rated,
    rules: options.rules ?? "chess",
    eco: loaded.metadata.eco,
    openingName: loaded.metadata.opening,
    moveCount: loaded.moves.length,
    chesscomAccuracies: options.chesscomAccuracies,
    importedAt: existing?.importedAt ?? Date.now(),
    analysisSummary: existing?.analysisSummary,
    ...getFinalPosition(loaded),
  };

  await saveGames([{ game, pgn: loaded.pgn }]);
  return game;
}

/**
 * Adds `finalFen` and `lastMove` to stored games that were saved before these
 * fields existed, by re-parsing their PGN. Writes only the games that changed
 * and returns the complete, updated list.
 */
export async function backfillFinalPositions(games: StoredGame[]): Promise<StoredGame[]> {
  assertIndexedDbAvailable();

  const updated: StoredGame[] = [];
  const changed: StoredGame[] = [];

  for (const game of games) {
    if (game.finalFen) {
      updated.push(game);
      continue;
    }

    const pgn = await getPgn(game.id);
    const parsed = pgn ? parsePgn(pgn) : null;
    if (!parsed?.ok) {
      updated.push(game);
      continue;
    }

    const next: StoredGame = { ...game, ...getFinalPosition(parsed.game) };
    updated.push(next);
    changed.push(next);
  }

  await idbPutMany("games", changed);
  return updated;
}

function deriveUserResult(
  rawResult: string | undefined,
  userColor: StoredGame["userColor"],
): StoredGame["result"] {
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

export async function clearAllGames(): Promise<void> {
  assertIndexedDbAvailable();
  await idbClear("games");
  await idbClear("pgns");
  await idbClear("analyses");
}
