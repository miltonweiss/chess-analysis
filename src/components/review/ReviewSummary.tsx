"use client";

import type { GameReview } from "@/lib/review/types";

type ReviewSummaryProps = {
  review: GameReview;
};

export function ReviewSummary({ review }: ReviewSummaryProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <PlayerAccuracyCard
          label={review.metadata.white ?? "White"}
          accuracy={review.white.accuracy}
        />
        <PlayerAccuracyCard
          label={review.metadata.black ?? "Black"}
          accuracy={review.black.accuracy}
        />
      </div>

      <p className="text-xs text-zinc-500">
        Accuracy is a review metric based on engine win-chance changes — not a player rating.
      </p>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <ClassificationSummary title="White" counts={review.white.counts} />
        <ClassificationSummary title="Black" counts={review.black.counts} />
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        {review.opening ? (
          <SummaryItem
            label="Opening"
            value={
              review.opening.eco
                ? `${review.opening.name} (${review.opening.eco})`
                : review.opening.name
            }
          />
        ) : null}
        <SummaryItem label="Result" value={review.resultSummary ?? "—"} />
        <SummaryItem label="Moves analyzed" value={String(review.moveAnalyses.length)} />
        <SummaryItem label="Key moments" value={String(review.keyMoments.length)} />
        <SummaryItem
          label="Biggest swing"
          value={
            review.biggestSwing
              ? `${review.biggestSwing.playedMove} (${review.biggestSwing.evaluationSwing.toFixed(1)}%)`
              : "—"
          }
        />
        <SummaryItem
          label="Biggest mistake"
          value={review.biggestMistake?.playedMove ?? "—"}
        />
        <SummaryItem
          label="Best highlight"
          value={review.bestMove?.playedMove ?? "—"}
        />
      </dl>
    </div>
  );
}

function PlayerAccuracyCard({
  label,
  accuracy,
}: {
  label: string;
  accuracy: GameReview["white"]["accuracy"];
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-zinc-100">
        {accuracy.isEmpty ? "n/a" : `${accuracy.score.toFixed(1)}%`}
      </p>
      <p className="mt-1 text-xs text-zinc-500">{accuracy.moveCount} moves</p>
    </div>
  );
}

function ClassificationSummary({
  title,
  counts,
}: {
  title: string;
  counts: GameReview["white"]["counts"];
}) {
  const rows = [
    ["Brilliant", counts.brilliant],
    ["Great", counts.great],
    ["Best", counts.best + counts.excellent],
    ["Good", counts.good],
    ["Book", counts.book],
    ["Inaccuracy", counts.inaccuracy],
    ["Mistake", counts.mistake],
    ["Miss", counts.miss],
    ["Blunder", counts.blunder],
  ] as const;

  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-500">{title}</p>
      <ul className="space-y-1">
        {rows.map(([label, value]) => (
          <li key={label} className="flex justify-between text-zinc-300">
            <span>{label}</span>
            <span className="font-mono">{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-mono text-zinc-100">{value}</dd>
    </div>
  );
}
