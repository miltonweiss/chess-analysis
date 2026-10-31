"use client";

import { useMemo } from "react";
import type { GameAnalysis } from "@/lib/analysis/types";
import type { GameMetadata } from "@/lib/chess/types";
import { buildGameReview } from "@/lib/review/review";
import type { GameReview } from "@/lib/review/types";

export function useGameReview(
  metadata: GameMetadata,
  gameAnalysis: GameAnalysis | null,
): GameReview | null {
  return useMemo(() => {
    if (!gameAnalysis || gameAnalysis.moves.length === 0) {
      return null;
    }

    return buildGameReview(metadata, gameAnalysis);
  }, [metadata, gameAnalysis]);
}
