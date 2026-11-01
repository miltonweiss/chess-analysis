"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useChessComImport } from "@/hooks/useChessComImport";
import { getChessComUsername } from "@/lib/storage/preferences";

const subscribeToNothing = () => () => {};
const getServerUsername = () => "";

export function useAutomaticChessComSync(onComplete?: () => void) {
  const username = useSyncExternalStore(
    subscribeToNothing,
    getChessComUsername,
    getServerUsername,
  );
  const { state, importGames, cancel } = useChessComImport(onComplete);
  const syncedUsername = useRef<string | null>(null);

  useEffect(() => {
    if (syncedUsername.current === username) {
      return;
    }

    syncedUsername.current = username;

    if (!username) {
      return;
    }

    void importGames(username);
  }, [username, importGames]);

  const isSyncing = Boolean(username) && (state.type === "idle" || state.type === "importing");

  return {
    state,
    cancel,
    isSyncing,
    isReady: !isSyncing,
  };
}
