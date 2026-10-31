"use client";

import { Chess } from "chess.js";
import { classificationLabel } from "@/lib/analysis/classification";
import { normalizeUci, uciToSan } from "@/lib/analysis/uciToSan";
import type { MoveAnalysis } from "@/lib/analysis/types";
import { formatEvaluation } from "@/lib/engine/uci";

type SelectedMovePanelProps = {
  analysis: MoveAnalysis | null;
  fenBefore?: string;
};

function formatPv(fen: string | undefined, pv: string[] | undefined, limit = 8): string {
  if (!fen || !pv || pv.length === 0) {
    return "—";
  }

  const sanMoves: string[] = [];
  let currentFen = fen;

  for (const uci of pv.slice(0, limit)) {
    const normalized = normalizeUci(uci);
    const san = uciToSan(currentFen, normalized);
    if (!san) {
      break;
    }
    sanMoves.push(san);
    try {
      const chess = new Chess(currentFen);
      chess.move({
        from: normalized.slice(0, 2),
        to: normalized.slice(2, 4),
        promotion: normalized[4] as "q" | "r" | "b" | "n" | undefined,
      });
      currentFen = chess.fen();
    } catch {
      break;
    }
  }

  return sanMoves.length > 0 ? sanMoves.join(" ") : pv.slice(0, limit).join(" ");
}

export function SelectedMovePanel({ analysis, fenBefore }: SelectedMovePanelProps) {
  if (!analysis) {
    return (
      <p className="text-sm text-zinc-500">
        Select a move to inspect its engine analysis.
      </p>
    );
  }

  const prefix =
    analysis.color === "white"
      ? `${analysis.moveNumber}.`
      : `${analysis.moveNumber}...`;

  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div className="sm:col-span-2">
        <dt className="text-zinc-500">Move</dt>
        <dd className="text-lg font-medium text-zinc-100">
          {prefix} {analysis.playedMove}
        </dd>
        <dd className="text-xs text-zinc-500">{classificationLabel(analysis.classification)}</dd>
      </div>
      <div>
        <dt className="text-zinc-500">Evaluation</dt>
        <dd className="font-mono text-zinc-100">
          {formatEvaluation(analysis.evaluationBefore)} →{" "}
          {formatEvaluation(analysis.evaluationAfter)}
        </dd>
      </div>
      <div>
        <dt className="text-zinc-500">Loss</dt>
        <dd className="font-mono text-zinc-100">{analysis.evaluationLoss.toFixed(2)}</dd>
      </div>
      <div>
        <dt className="text-zinc-500">Best move</dt>
        <dd className="font-mono text-zinc-100">
          {analysis.bestMoveSan ?? analysis.bestMove ?? "—"}
        </dd>
      </div>
      <div>
        <dt className="text-zinc-500">Depth</dt>
        <dd className="font-mono text-zinc-100">{analysis.engineBefore?.depth ?? "—"}</dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-zinc-500">Principal variation</dt>
        <dd className="font-mono text-xs text-zinc-300">
          {formatPv(fenBefore, analysis.principalVariation)}
        </dd>
      </div>
    </dl>
  );
}
