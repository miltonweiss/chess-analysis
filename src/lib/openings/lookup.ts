import type { ChessMove } from "@/lib/chess/types";
import type { GameMetadata } from "@/lib/chess/types";

export type OpeningInfo = {
  eco: string;
  name: string;
};

type OpeningRecord = {
  eco: string;
  name: string;
  epd: string;
};

let indexPromise: Promise<Map<string, OpeningInfo>> | null = null;

export function positionKey(fen: string): string {
  return fen.trim().split(/\s+/).slice(0, 4).join(" ");
}

async function loadIndex(): Promise<Map<string, OpeningInfo>> {
  const openingsModule = await import("@/lib/openings/openings.json");
  const records = openingsModule.default as OpeningRecord[];
  const map = new Map<string, OpeningInfo>();

  for (const record of records) {
    const key = positionKey(record.epd);
    map.set(key, { eco: record.eco, name: record.name });
  }

  return map;
}

export async function getOpeningIndex(): Promise<Map<string, OpeningInfo>> {
  if (!indexPromise) {
    indexPromise = loadIndex();
  }
  return indexPromise;
}

export function findOpeningInIndex(
  index: Map<string, OpeningInfo>,
  fen: string,
): OpeningInfo | null {
  return index.get(positionKey(fen)) ?? null;
}

/** Leading plies while each pre-move position is a known opening EPD. */
export function computeBookPlies(
  index: Map<string, OpeningInfo>,
  initialFen: string,
  moves: ChessMove[],
): Set<number> {
  const book = new Set<number>();
  let stillBook = true;

  if (!findOpeningInIndex(index, initialFen)) {
    return book;
  }

  for (const move of moves) {
    if (!stillBook) {
      break;
    }

    if (!findOpeningInIndex(index, move.fenBefore)) {
      stillBook = false;
      break;
    }

    book.add(move.ply);

    if (!findOpeningInIndex(index, move.fenAfter)) {
      stillBook = false;
    }
  }

  return book;
}

export function openingAfterBookLine(
  index: Map<string, OpeningInfo>,
  initialFen: string,
  moves: ChessMove[],
): OpeningInfo | null {
  const bookPlies = computeBookPlies(index, initialFen, moves);
  if (bookPlies.size === 0) {
    return findOpeningInIndex(index, initialFen);
  }

  const lastPly = Math.max(...bookPlies);
  const lastMove = moves.find((move) => move.ply === lastPly);
  if (!lastMove) {
    return null;
  }

  return (
    findOpeningInIndex(index, lastMove.fenAfter) ??
    findOpeningInIndex(index, lastMove.fenBefore)
  );
}

export function resolveOpeningDisplay(
  detected: OpeningInfo | null,
  metadata: GameMetadata,
): OpeningInfo | null {
  if (detected) {
    return detected;
  }

  if (metadata.opening || metadata.eco) {
    return {
      eco: metadata.eco ?? "",
      name: metadata.opening ?? metadata.eco ?? "Opening",
    };
  }

  return null;
}

/** Test helper: build an index from inline records. */
export function indexFromRecords(records: OpeningRecord[]): Map<string, OpeningInfo> {
  const map = new Map<string, OpeningInfo>();
  for (const record of records) {
    map.set(positionKey(record.epd), { eco: record.eco, name: record.name });
  }
  return map;
}
