"use client";

import { useCallback, useEffect, useState } from "react";
import { DEPTH_OPTIONS } from "@/lib/engine/settings";
import type { PlayerColor } from "@/lib/chess/types";
import {
  clearAllLocalData,
  DEFAULT_USER_SETTINGS,
  getChessComUsername,
  getUserSettings,
  setChessComUsername,
  setUserSettings,
  type UserSettings,
} from "@/lib/storage/preferences";

type AiStatus = {
  configured: boolean;
  provider: string;
  model: string;
};

export function SettingsPageContent() {
  const [settings, setSettingsState] = useState<UserSettings>(() => getUserSettings());
  const [chessComUsername, setChessComUsernameState] = useState(() => getChessComUsername());
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [clearMessage, setClearMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/ai/status")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load AI status");
        }
        return response.json() as Promise<AiStatus>;
      })
      .then((data) => {
        if (!cancelled) {
          setAiStatus(data);
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setAiError(error.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const persistSettings = useCallback((next: UserSettings) => {
    setSettingsState(next);
    setUserSettings(next);
  }, []);

  const handleClearData = async () => {
    const confirmed = window.confirm(
      "Delete all saved games, analyses, and preferences from this browser? This cannot be undone.",
    );
    if (!confirmed) {
      return;
    }

    try {
      await clearAllLocalData();
      setSettingsState(DEFAULT_USER_SETTINGS);
      setChessComUsernameState("");
      setClearMessage("Local data cleared.");
    } catch {
      setClearMessage("Could not clear local data.");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-10">
      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-400">Analysis</h2>
        <label className="block space-y-2">
          <span className="text-sm text-zinc-300">Default engine depth</span>
          <select
            value={settings.defaultDepth}
            onChange={(event) =>
              persistSettings({
                ...settings,
                defaultDepth: Number(event.target.value),
              })
            }
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
          >
            {DEPTH_OPTIONS.map((depth) => (
              <option key={depth} value={depth}>
                Depth {depth}
              </option>
            ))}
          </select>
        </label>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={settings.equivalentMoveDetection}
            onChange={(event) =>
              persistSettings({
                ...settings,
                equivalentMoveDetection: event.target.checked,
              })
            }
            className="mt-1"
          />
          <span className="text-sm text-zinc-300">
            Equivalent-move detection (MultiPV 2, slower full-game analysis)
          </span>
        </label>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-400">Chess.com</h2>
        <label className="block space-y-2">
          <span className="text-sm text-zinc-300">Default username for import</span>
          <input
            type="text"
            value={chessComUsername}
            onChange={(event) => {
              const value = event.target.value;
              setChessComUsernameState(value);
              setChessComUsername(value);
            }}
            placeholder="username"
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
          />
        </label>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-400">Board</h2>
        <label className="block space-y-2">
          <span className="text-sm text-zinc-300">Default board orientation</span>
          <select
            value={settings.defaultBoardOrientation}
            onChange={(event) =>
              persistSettings({
                ...settings,
                defaultBoardOrientation: event.target.value as PlayerColor,
              })
            }
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
          >
            <option value="white">White on bottom</option>
            <option value="black">Black on bottom</option>
          </select>
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-400">AI explanations</h2>
        {aiError ? (
          <p className="text-sm text-red-400">{aiError}</p>
        ) : aiStatus ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-zinc-500">Configured</dt>
            <dd className="text-zinc-200">{aiStatus.configured ? "Yes" : "No"}</dd>
            <dt className="text-zinc-500">Provider</dt>
            <dd className="text-zinc-200">{aiStatus.provider}</dd>
            <dt className="text-zinc-500">Model</dt>
            <dd className="text-zinc-200">{aiStatus.model}</dd>
          </dl>
        ) : (
          <p className="text-sm text-zinc-500">Loading AI status…</p>
        )}
        <p className="text-xs text-zinc-500">
          Configure <code className="text-zinc-400">OPENAI_API_KEY</code> or{" "}
          <code className="text-zinc-400">AI_PROVIDER=mock</code> in <code>.env.local</code>.
        </p>
      </section>

      <section className="space-y-3 border-t border-zinc-800 pt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-400">Data</h2>
        <button
          type="button"
          onClick={() => void handleClearData()}
          className="rounded-md border border-red-900/80 bg-red-950/40 px-4 py-2 text-sm text-red-200 transition-colors hover:bg-red-950/70"
        >
          Clear all local data
        </button>
        {clearMessage ? <p className="text-sm text-zinc-400">{clearMessage}</p> : null}
      </section>
    </div>
  );
}
