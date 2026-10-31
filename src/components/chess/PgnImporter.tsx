"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { PgnParseResult } from "@/lib/chess/types";

type PgnImporterProps = {
  onLoad: (pgnText: string) => PgnParseResult;
};

export function PgnImporter({ onLoad }: PgnImporterProps) {
  const [pgnText, setPgnText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const handleLoad = () => {
    setError(null);
    setSuccess(null);

    const result = onLoad(pgnText);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setSuccess("Game loaded successfully.");
    setCollapsed(true);
  };

  if (collapsed) {
    return (
      <section className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-emerald-400">{success ?? "Game loaded."}</p>
          <Button
            variant="ghost"
            onClick={() => {
              setCollapsed(false);
              setSuccess(null);
            }}
          >
            Import another game
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Import Game</p>
        <label htmlFor="pgn-input" className="mt-2 block text-sm text-zinc-300">
          Paste PGN
        </label>
      </div>

      <textarea
        id="pgn-input"
        value={pgnText}
        onChange={(event) => {
          setPgnText(event.target.value);
          setError(null);
          setSuccess(null);
        }}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "pgn-error" : undefined}
        placeholder={`[Event "Casual Game"]\n[White "Alice"]\n[Black "Bob"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 1-0`}
        className="min-h-36 w-full resize-y rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-100 outline-none transition-colors focus:border-zinc-500"
      />

      {error ? (
        <p id="pgn-error" role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button variant="primary" onClick={handleLoad}>
          Load game
        </Button>
      </div>
    </section>
  );
}
