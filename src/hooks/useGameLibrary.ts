"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  filterAndSortGames,
  paginateGames,
  type LibraryFilters,
} from "@/lib/games/filters";
import type { StoredGame } from "@/lib/games/types";
import { backfillFinalPositions, listGames } from "@/lib/storage/gameRepository";
import { getLibraryFilters, setLibraryFilters } from "@/lib/storage/preferences";

// Divisible by 2 and 3 so pages fill both the 2- and 3-column grids.
const PAGE_SIZE = 48;

export function useGameLibrary() {
  const [games, setGames] = useState<StoredGame[]>([]);
  const [filters, setFiltersState] = useState<LibraryFilters>(() => getLibraryFilters());
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const records = await listGames();
        const withPositions = await backfillFinalPositions(records);
        if (!cancelled) {
          setGames(withPositions);
          setError(null);
        }
      } catch (caught) {
        if (!cancelled) {
          const message = caught instanceof Error ? caught.message : "Failed to load games";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const setFilters = useCallback((next: LibraryFilters) => {
    setFiltersState(next);
    setLibraryFilters(next);
    setPage(1);
  }, []);

  const filteredGames = useMemo(() => filterAndSortGames(games, filters), [games, filters]);

  const visibleGames = useMemo(
    () => paginateGames(filteredGames, page, PAGE_SIZE),
    [filteredGames, page],
  );

  const stats = useMemo(() => {
    const analyzed = games.filter((game) => Boolean(game.analysisSummary)).length;
    return {
      total: games.length,
      analyzed,
      unanalyzed: games.length - analyzed,
    };
  }, [games]);

  const hasMore = visibleGames.length < filteredGames.length;

  return {
    games,
    filteredGames,
    visibleGames,
    filters,
    setFilters,
    page,
    setPage,
    hasMore,
    pageSize: PAGE_SIZE,
    loading,
    error,
    stats,
  };
}
