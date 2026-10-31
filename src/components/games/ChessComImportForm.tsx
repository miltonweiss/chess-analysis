"use client";

import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { SearchIcon, XIcon } from "@/components/ui/icons";
import { pillEaseClasses, pillSurfaceClasses } from "@/components/ui/pillStyles";
import { useChessComImport } from "@/hooks/useChessComImport";
import { getChessComUsername } from "@/lib/storage/preferences";

type ChessComImportFormProps = {
  onImported?: () => void;
};

/** How long a finished import message stays visible before it fades out. */
const RESULT_MESSAGE_MS = 3500;

// The stored username lives outside React and is only read once, so nothing needs to subscribe.
const subscribeToNothing = () => () => {};
const getServerUsername = () => "";

/** Fixed pill at the bottom of the screen: enter a Chess.com username and fetch its games. */
export function ChessComImportForm({ onImported }: ChessComImportFormProps) {
  // The server has no localStorage, so it renders "" and React swaps in the stored value after hydration.
  // Reading localStorage in useState would make the server and client markup differ.
  const storedUsername = useSyncExternalStore(
    subscribeToNothing,
    getChessComUsername,
    getServerUsername,
  );
  // null until the user types; then the typed value wins over the stored one.
  const [draft, setDraft] = useState<string | null>(null);
  const username = draft ?? storedUsername;
  const { state, importGames, cancel, isImporting } = useChessComImport(onImported);
  // Holds the state object whose message has already faded out. A new state object shows the message again.
  const [dismissedState, setDismissedState] = useState<object | null>(null);

  const isFinished =
    state.type === "complete" || state.type === "error" || state.type === "cancelled";

  useEffect(() => {
    if (!isFinished) {
      return;
    }
    const timer = window.setTimeout(() => setDismissedState(state), RESULT_MESSAGE_MS);
    return () => window.clearTimeout(timer);
  }, [isFinished, state]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void importGames(username);
  };

  let status: string | null = null;
  if (state.type === "importing") {
    status =
      state.progress.phase === "month"
        ? `Importing ${state.progress.monthLabel ?? "archive"} (${state.progress.currentMonth}/${state.progress.totalMonths})…`
        : "Fetching games…";
  } else if (state.type === "complete") {
    const errors =
      state.result.monthErrors > 0 ? ` ${state.result.monthErrors} month(s) failed.` : "";
    status = `Added ${state.result.gamesAdded} games from ${state.result.monthsProcessed} month(s).${errors}`;
  } else if (state.type === "error") {
    status = state.message;
  } else if (state.type === "cancelled") {
    status = "Import cancelled.";
  }

  const statusVisible = status !== null && dismissedState !== state;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-4">
      {status ? (
        <p
          role="status"
          aria-hidden={!statusVisible}
          className={`rounded-full px-3 py-1 text-xs transition-[opacity,transform] duration-300 ${pillEaseClasses} ${pillSurfaceClasses} ${
            state.type === "error" ? "text-red-300" : "text-zinc-300"
          } ${
            statusVisible
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none translate-y-2 opacity-0"
          }`}
        >
          {status}
        </p>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className={`pointer-events-auto flex h-12 w-full max-w-lg items-center gap-2 rounded-full py-1.5 pr-1.5 pl-5 ${pillSurfaceClasses}`}
      >
        <input
          value={username}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Chess.com username"
          disabled={isImporting}
          aria-label="Chess.com username"
          className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none disabled:opacity-50"
        />

        {isImporting ? (
          <button
            type="button"
            onClick={cancel}
            aria-label="Cancel import"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-white/10 hover:text-zinc-50"
          >
            <XIcon className="h-4 w-4" />
          </button>
        ) : null}

        <button
          type="submit"
          aria-label="Update games"
          disabled={isImporting || !username.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-zinc-50 shadow-inner shadow-white/5 transition-colors hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <SearchIcon className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
