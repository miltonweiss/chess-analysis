"use client";

import { useState } from "react";
import { GameCard } from "@/components/games/GameCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dropdown } from "@/components/ui/Dropdown";
import { CheckIcon, FilterIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/Input";
import { pillSurfaceClasses } from "@/components/ui/pillStyles";
import { Skeleton } from "@/components/ui/Skeleton";
import { useGameLibrary } from "@/hooks/useGameLibrary";
import type {
  ResultFilter,
  SortOption,
  TimeClassFilter,
} from "@/lib/games/filters";

const gridClasses = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

const resultOptions: { value: ResultFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "win", label: "Wins" },
  { value: "loss", label: "Losses" },
  { value: "draw", label: "Draws" },
];

const timeClassOptions: { value: TimeClassFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "bullet", label: "Bullet" },
  { value: "blitz", label: "Blitz" },
  { value: "rapid", label: "Rapid" },
  { value: "daily", label: "Daily" },
];

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "rating", label: "Rating" },
  { value: "accuracy", label: "Accuracy" },
];

function GameCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-border bg-surface-muted">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-2 p-3">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export function GameLibrary() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const {
    visibleGames,
    filteredGames,
    filters,
    setFilters,
    page,
    setPage,
    hasMore,
    loading,
    error,
    stats,
  } = useGameLibrary();

  if (loading) {
    return (
      <section className={gridClasses} aria-busy="true" aria-label="Loading games">
        {Array.from({ length: 6 }, (_, index) => (
          <GameCardSkeleton key={index} />
        ))}
      </section>
    );
  }

  if (error) {
    return (
      <Card className="p-4 text-sm text-red-300">
        <p>{error}</p>
      </Card>
    );
  }

  const analysedOnly = filters.analysis === "analyzed";
  const activeFilterCount = [
    filters.result !== "all",
    filters.timeClass !== "all",
    analysedOnly,
  ].filter(Boolean).length;

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-2">
        <Input
          type="search"
          value={filters.search}
          onChange={(event) => setFilters({ ...filters, search: event.target.value })}
          placeholder="Search opponent or opening"
          aria-label="Search games"
          className="min-w-0 flex-1"
        />

        <button
          type="button"
          aria-expanded={filtersOpen}
          aria-controls="library-filters"
          onClick={() => setFiltersOpen((open) => !open)}
          className={`flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-xs transition-[color,opacity] hover:opacity-90 ${pillSurfaceClasses} ${
            filtersOpen ? "text-zinc-50" : "text-zinc-300 hover:text-zinc-100"
          }`}
        >
          <FilterIcon className="h-3.5 w-3.5" />
          Filter
          {activeFilterCount > 0 ? (
            <span className="rounded-full bg-white/15 px-1.5 text-xs tabular-nums">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      </div>

      {/* Collapsed content stays mounted and inert, so the height animates smoothly. */}
      <div
        id="library-filters"
        inert={!filtersOpen}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          filtersOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0">
          <div className="flex flex-wrap items-center gap-2 pb-1">
            <Dropdown
              aria-label="Filter by result"
              prefix="Result"
              options={resultOptions}
              value={filters.result}
              onChange={(result) => setFilters({ ...filters, result })}
            />
            <Dropdown
              aria-label="Filter by time class"
              prefix="Time"
              options={timeClassOptions}
              value={filters.timeClass}
              onChange={(timeClass) => setFilters({ ...filters, timeClass })}
            />

            <button
              type="button"
              role="checkbox"
              aria-checked={analysedOnly}
              onClick={() =>
                setFilters({ ...filters, analysis: analysedOnly ? "all" : "analyzed" })
              }
              className={`flex h-10 items-center gap-2 rounded-full px-4 text-xs transition-[color,opacity] hover:opacity-90 ${pillSurfaceClasses} ${
                analysedOnly ? "text-zinc-50" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span
                aria-hidden
                className={`flex h-4 w-4 items-center justify-center rounded-[5px] border transition-colors ${
                  analysedOnly
                    ? "border-zinc-100 bg-zinc-100 text-zinc-950"
                    : "border-zinc-600 text-transparent"
                }`}
              >
                <CheckIcon className="h-3 w-3" />
              </span>
              Analysed
            </button>

            <Dropdown
              aria-label="Sort games"
              prefix="Sort"
              align="right"
              className="ml-auto"
              options={sortOptions}
              value={filters.sort}
              onChange={(sort) => setFilters({ ...filters, sort })}
            />
          </div>
        </div>
      </div>

      {filteredGames.length === 0 ? (
        <Card className="px-6 py-12 text-center text-sm text-zinc-400">
          {stats.total === 0
            ? "No games yet. Enter your Chess.com username below."
            : "No games match these filters."}
        </Card>
      ) : (
        <div className="space-y-6">
          <div className={gridClasses}>
            {visibleGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>

          {hasMore ? (
            <div className="flex justify-center">
              <Button type="button" onClick={() => setPage(page + 1)}>
                Load more ({visibleGames.length} / {filteredGames.length})
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
