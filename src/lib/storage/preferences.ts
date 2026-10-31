import type { PlayerColor } from "@/lib/chess/types";
import type { LibraryFilters } from "@/lib/games/filters";
import { DEFAULT_LIBRARY_FILTERS } from "@/lib/games/filters";
import {
  DEFAULT_ANALYSIS_SETTINGS,
  type AnalysisSettings,
} from "@/lib/engine/settings";
import {
  idbClear,
  resetDatabaseConnection,
  type StoreName,
} from "@/lib/storage/indexedDb";

const CHESSCOM_USERNAME_KEY = "chesscom.username";
const LIBRARY_FILTERS_KEY = "library.filters";
const USER_SETTINGS_KEY = "user.settings";

export type UserSettings = {
  defaultDepth: number;
  /** When true, engine uses MultiPV 2 for equivalent-move detection during game analysis. */
  equivalentMoveDetection: boolean;
  defaultBoardOrientation: PlayerColor;
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  defaultDepth: DEFAULT_ANALYSIS_SETTINGS.depth,
  equivalentMoveDetection: false,
  defaultBoardOrientation: "white",
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getUserSettings(): UserSettings {
  if (!isBrowser()) {
    return DEFAULT_USER_SETTINGS;
  }

  const raw = localStorage.getItem(USER_SETTINGS_KEY);
  if (!raw) {
    return DEFAULT_USER_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return {
      ...DEFAULT_USER_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_USER_SETTINGS;
  }
}

export function setUserSettings(settings: UserSettings): void {
  if (!isBrowser()) {
    return;
  }
  localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(settings));
}

export function analysisSettingsFromUser(
  user: UserSettings = getUserSettings(),
): AnalysisSettings {
  return {
    depth: user.defaultDepth,
    multipv: user.equivalentMoveDetection ? 2 : 1,
  };
}

export function getChessComUsername(): string {
  if (!isBrowser()) {
    return "";
  }
  return localStorage.getItem(CHESSCOM_USERNAME_KEY) ?? "";
}

export function setChessComUsername(username: string): void {
  if (!isBrowser()) {
    return;
  }
  localStorage.setItem(CHESSCOM_USERNAME_KEY, username.trim().toLowerCase());
}

export function getLibraryFilters(): LibraryFilters {
  if (!isBrowser()) {
    return DEFAULT_LIBRARY_FILTERS;
  }

  const raw = localStorage.getItem(LIBRARY_FILTERS_KEY);
  if (!raw) {
    return DEFAULT_LIBRARY_FILTERS;
  }

  try {
    return { ...DEFAULT_LIBRARY_FILTERS, ...(JSON.parse(raw) as Partial<LibraryFilters>) };
  } catch {
    return DEFAULT_LIBRARY_FILTERS;
  }
}

export function setLibraryFilters(filters: LibraryFilters): void {
  if (!isBrowser()) {
    return;
  }
  localStorage.setItem(LIBRARY_FILTERS_KEY, JSON.stringify(filters));
}

const INDEXED_DB_STORES: StoreName[] = ["games", "pgns", "analyses", "sync"];

export async function clearAllLocalData(): Promise<void> {
  for (const store of INDEXED_DB_STORES) {
    await idbClear(store);
  }
  resetDatabaseConnection();

  if (!isBrowser()) {
    return;
  }

  localStorage.removeItem(CHESSCOM_USERNAME_KEY);
  localStorage.removeItem(LIBRARY_FILTERS_KEY);
  localStorage.removeItem(USER_SETTINGS_KEY);
}
