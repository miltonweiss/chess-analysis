import { ChessComClient, parsePlayerProfile, validateChessComUsername } from "@/lib/chesscom/client";
import { normalizeChessComGame } from "@/lib/chesscom/normalize";
import {
  ChessComError,
  chessComGameSchema,
  type ImportProgress,
  type ImportResult,
} from "@/lib/chesscom/types";
import type { ArchiveSyncMeta, GameWithPgn, SyncRecord } from "@/lib/games/types";
import {
  getAllGameIds,
  getSyncRecord,
  saveGames,
  saveSyncRecord,
} from "@/lib/storage/gameRepository";

export type ImportGamesOptions = {
  username: string;
  client?: ChessComClient;
  signal?: AbortSignal;
  onProgress?: (progress: ImportProgress) => void;
};

function syncKey(username: string): string {
  return `chess.com:${username}`;
}

function monthLabelFromUrl(url: string): string {
  const match = url.match(/\/(\d{4})\/(\d{2})$/);
  if (!match) {
    return url;
  }
  return `${match[1]}-${match[2]}`;
}

export type YearMonth = { year: number; month: number };

export function parseArchiveYearMonth(url: string): YearMonth | null {
  const match = url.match(/\/(\d{4})\/(\d{2})$/);
  if (!match) {
    return null;
  }
  return { year: Number(match[1]), month: Number(match[2]) };
}

function compareYearMonth(a: YearMonth, b: YearMonth): number {
  return a.year - b.year || a.month - b.month;
}

/**
 * Incremental archive window: fetch the month of lastSyncedAt through the
 * current month, plus any archive month that has no successful sync metadata.
 * A fetch last week only hits this month unless an older month is missing;
 * one from 3 months ago hits those three plus the current month. First sync
 * (no timestamp) fetches every archive.
 */
export function selectArchiveUrls(
  archiveUrlsNewestFirst: string[],
  lastSyncedAt: string | undefined,
  archiveMeta?: Record<string, ArchiveSyncMeta>,
): string[] {
  if (archiveUrlsNewestFirst.length === 0) {
    return [];
  }

  if (!lastSyncedAt) {
    return archiveUrlsNewestFirst;
  }

  const synced = new Date(lastSyncedAt);
  if (Number.isNaN(synced.getTime())) {
    return archiveUrlsNewestFirst;
  }

  const cutoff: YearMonth = {
    year: synced.getUTCFullYear(),
    month: synced.getUTCMonth() + 1,
  };

  const requiredUrls = new Set(
    archiveUrlsNewestFirst.filter((url) => {
      const ym = parseArchiveYearMonth(url);
      if (!ym) {
        return true;
      }
      return compareYearMonth(ym, cutoff) >= 0 || Boolean(archiveMeta && !archiveMeta[url]);
    }),
  );

  const archiveUrls = archiveUrlsNewestFirst.filter((url) => requiredUrls.has(url));
  const newest = archiveUrlsNewestFirst[0];
  if (newest && !requiredUrls.has(newest)) {
    return [newest, ...archiveUrls];
  }

  return archiveUrls;
}

export async function importChessComGames(
  options: ImportGamesOptions,
): Promise<ImportResult> {
  const username = validateChessComUsername(options.username);
  if (!username) {
    throw new ChessComError("bad_response", "Enter a valid Chess.com username");
  }

  const client = options.client ?? new ChessComClient();
  const signal = options.signal;
  const onProgress = options.onProgress;

  let gamesAdded = 0;
  let duplicates = 0;
  let skippedVariants = 0;
  let skippedInvalid = 0;
  let monthErrors = 0;

  onProgress?.({
    phase: "profile",
    currentMonth: 0,
    totalMonths: 0,
    gamesAdded,
    duplicates,
    skippedVariants,
    skippedInvalid,
  });

  const profileResult = await client.getPlayer(username, signal);
  if (!profileResult.ok) {
    throw profileResult.error;
  }

  if (profileResult.notModified) {
    throw new ChessComError("bad_response", "Unexpected not-modified profile response");
  }

  const profile = parsePlayerProfile(profileResult.data);
  if (!profile.success) {
    throw new ChessComError("bad_response", "Invalid profile response from Chess.com");
  }

  onProgress?.({
    phase: "archives",
    currentMonth: 0,
    totalMonths: 0,
    gamesAdded,
    duplicates,
    skippedVariants,
    skippedInvalid,
  });

  const archivesResult = await client.getArchives(username, signal);
  if (!archivesResult.ok) {
    throw archivesResult.error;
  }

  const existingIds = await getAllGameIds();
  const batchIds = new Set<string>();

  const priorSync = await getSyncRecord(syncKey(username));
  const archiveMeta: Record<string, ArchiveSyncMeta> = {
    ...(priorSync?.archives ?? {}),
  };

  const allArchiveUrls = archivesResult.notModified
    ? Object.keys(archiveMeta).sort()
    : [...archivesResult.data.archives];
  const archiveUrlsNewestFirst = [...allArchiveUrls].reverse();
  const archiveUrls = selectArchiveUrls(
    archiveUrlsNewestFirst,
    priorSync?.lastSyncedAt,
    archiveMeta,
  );

  for (let index = 0; index < archiveUrls.length; index += 1) {
    if (signal?.aborted) {
      throw new ChessComError("aborted", "Import cancelled");
    }

    const archiveUrl = archiveUrls[index];
    const monthLabel = monthLabelFromUrl(archiveUrl);

    onProgress?.({
      phase: "month",
      currentMonth: index + 1,
      totalMonths: archiveUrls.length,
      monthLabel,
      gamesAdded,
      duplicates,
      skippedVariants,
      skippedInvalid,
    });

    // Always refetch the newest (current) month without ETag so new games
    // are not missed if Chess.com's archive ETag lags behind.
    const isCurrentMonth = index === 0;
    const conditional = isCurrentMonth ? {} : (archiveMeta[archiveUrl] ?? {});

    try {
      const monthResult = await client.getMonthlyGames(archiveUrl, conditional, signal);
      if (!monthResult.ok) {
        monthErrors += 1;
        continue;
      }

      if (monthResult.notModified) {
        archiveMeta[archiveUrl] = {
          ...conditional,
          etag: monthResult.etag ?? conditional.etag,
          lastModified: monthResult.lastModified ?? conditional.lastModified,
        };
        continue;
      }

      const toSave: GameWithPgn[] = [];

      for (const rawGame of monthResult.data.games) {
        const parsedGame = chessComGameSchema.safeParse(rawGame);
        if (!parsedGame.success) {
          skippedInvalid += 1;
          continue;
        }

        const normalized = normalizeChessComGame(parsedGame.data, username);
        if (!normalized.ok) {
          if (normalized.reason === "variant") {
            skippedVariants += 1;
          } else {
            skippedInvalid += 1;
          }
          continue;
        }

        const { id } = normalized.entry.game;
        if (existingIds.has(id) || batchIds.has(id)) {
          duplicates += 1;
          continue;
        }

        batchIds.add(id);
        existingIds.add(id);
        toSave.push(normalized.entry);
      }

      if (toSave.length > 0) {
        await saveGames(toSave);
        gamesAdded += toSave.length;
      }

      archiveMeta[archiveUrl] = {
        etag: monthResult.etag,
        lastModified: monthResult.lastModified,
        gameCount: monthResult.data.games.length,
      };
    } catch (error) {
      if (error instanceof ChessComError && error.code === "aborted") {
        throw error;
      }
      monthErrors += 1;
    }
  }

  const syncRecord: SyncRecord = {
    key: syncKey(username),
    username,
    lastSyncedAt: new Date().toISOString(),
    archives: archiveMeta,
  };

  await saveSyncRecord(syncRecord);

  return {
    username,
    gamesAdded,
    duplicates,
    skippedVariants,
    skippedInvalid,
    monthsProcessed: archiveUrls.length,
    monthErrors,
    lastSyncedAt: syncRecord.lastSyncedAt,
  };
}
