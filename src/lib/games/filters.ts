import type { StoredGame, TimeClass, UserResult } from "@/lib/games/types";

export type AnalysisFilter = "all" | "analyzed" | "not_analyzed";
export type ResultFilter = "all" | UserResult;
export type TimeClassFilter = "all" | TimeClass;
export type SortOption = "newest" | "oldest" | "rating" | "accuracy";

export type LibraryFilters = {
  search: string;
  timeClass: TimeClassFilter;
  result: ResultFilter;
  analysis: AnalysisFilter;
  sort: SortOption;
};

export const DEFAULT_LIBRARY_FILTERS: LibraryFilters = {
  search: "",
  timeClass: "all",
  result: "all",
  analysis: "all",
  sort: "newest",
};

function matchesSearch(game: StoredGame, search: string): boolean {
  const query = search.trim().toLowerCase();
  if (!query) {
    return true;
  }

  const haystack = [
    game.white.name,
    game.black.name,
    game.openingName,
    game.eco,
    game.rawResult,
    game.timeControl,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function userRating(game: StoredGame): number {
  if (game.userColor === "white") {
    return game.white.rating ?? 0;
  }
  if (game.userColor === "black") {
    return game.black.rating ?? 0;
  }

  return Math.max(game.white.rating ?? 0, game.black.rating ?? 0);
}

function userAccuracy(game: StoredGame): number {
  if (!game.analysisSummary) {
    return -1;
  }

  if (game.userColor === "white") {
    return game.analysisSummary.whiteAccuracy;
  }
  if (game.userColor === "black") {
    return game.analysisSummary.blackAccuracy;
  }

  return Math.max(
    game.analysisSummary.whiteAccuracy,
    game.analysisSummary.blackAccuracy,
  );
}

export function filterAndSortGames(
  games: StoredGame[],
  filters: LibraryFilters,
): StoredGame[] {
  const filtered = games.filter((game) => {
    if (!matchesSearch(game, filters.search)) {
      return false;
    }

    if (filters.timeClass !== "all" && game.timeClass !== filters.timeClass) {
      return false;
    }

    if (filters.result !== "all" && game.result !== filters.result) {
      return false;
    }

    const analyzed = Boolean(game.analysisSummary);
    if (filters.analysis === "analyzed" && !analyzed) {
      return false;
    }
    if (filters.analysis === "not_analyzed" && analyzed) {
      return false;
    }

    return true;
  });

  const sorted = [...filtered];

  sorted.sort((a, b) => {
    switch (filters.sort) {
      case "oldest":
        return a.endTime - b.endTime;
      case "rating":
        return userRating(b) - userRating(a);
      case "accuracy":
        return userAccuracy(b) - userAccuracy(a);
      case "newest":
      default:
        return b.endTime - a.endTime;
    }
  });

  return sorted;
}

export function paginateGames<T>(items: T[], page: number, pageSize: number): T[] {
  return items.slice(0, page * pageSize);
}
