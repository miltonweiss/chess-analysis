"use client";

import { useCallback, useState } from "react";
import { ChessComImportForm } from "@/components/games/ChessComImportForm";
import { GameLibrary } from "@/components/games/GameLibrary";
import { useAutomaticChessComSync } from "@/hooks/useAutomaticChessComSync";

export function GamesPageContent() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshLibrary = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);
  useAutomaticChessComSync(refreshLibrary);

  return (
    // pb-32 keeps the last cards clear of the fixed bottom search pill.
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-6 pb-32 sm:px-6">
      <ChessComImportForm onImported={refreshLibrary} />
      <GameLibrary key={refreshKey} />
    </div>
  );
}
