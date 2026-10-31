"use client";

import type { GameMetadata as GameMetadataType, GameMode } from "@/lib/chess/types";

type GameMetadataProps = {
  metadata: GameMetadataType;
  mode: GameMode;
};

function formatPlayer(name?: string, elo?: string): string | null {
  if (!name) {
    return null;
  }
  return elo ? `${name} (${elo})` : name;
}

export function GameMetadata({ metadata, mode }: GameMetadataProps) {
  if (mode === "play") {
    return (
      <section className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Game Info</p>
        <p className="text-sm text-zinc-300">Free play</p>
      </section>
    );
  }

  const white = formatPlayer(metadata.white, metadata.whiteElo);
  const black = formatPlayer(metadata.black, metadata.blackElo);

  const details = [
    white ? { label: "White", value: white } : null,
    black ? { label: "Black", value: black } : null,
    metadata.result ? { label: "Result", value: metadata.result } : null,
    metadata.event ? { label: "Event", value: metadata.event } : null,
    metadata.round ? { label: "Round", value: metadata.round } : null,
    metadata.date ? { label: "Date", value: metadata.date } : null,
    metadata.site ? { label: "Site", value: metadata.site } : null,
    metadata.eco ? { label: "ECO", value: metadata.eco } : null,
    metadata.opening ? { label: "Opening", value: metadata.opening } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  if (details.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Game Info</p>
      <dl className="grid gap-2 text-sm">
        {details.map((item) => (
          <div key={item.label} className="grid grid-cols-[5.5rem_1fr] gap-2">
            <dt className="text-zinc-500">{item.label}</dt>
            <dd className="text-zinc-200">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
