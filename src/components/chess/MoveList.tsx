"use client";

import { useEffect, useRef, type Ref } from "react";
import { classificationLabel } from "@/lib/analysis/classification";
import { ClassificationIcon } from "@/components/review/ClassificationIcon";
import type { MoveAnalysis } from "@/lib/analysis/types";
import type { ChessMove } from "@/lib/chess/types";

type MoveListProps = {
  moves: ChessMove[];
  cursor: number;
  result?: string;
  moveAnalyses?: Map<number, MoveAnalysis>;
  onSelectPly: (ply: number) => void;
};

type MovePair = {
  number: number;
  white?: ChessMove;
  black?: ChessMove;
};

function buildMovePairs(moves: ChessMove[]): MovePair[] {
  const pairs: MovePair[] = [];

  for (const move of moves) {
    const lastPair = pairs[pairs.length - 1];

    if (move.color === "white" || !lastPair || lastPair.black) {
      pairs.push({
        number: move.moveNumber,
        white: move.color === "white" ? move : undefined,
        black: move.color === "black" ? move : undefined,
      });
      continue;
    }

    lastPair.black = move;
  }

  return pairs;
}

export function MoveList({
  moves,
  cursor,
  result,
  moveAnalyses,
  onSelectPly,
}: MoveListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const pairs = buildMovePairs(moves);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  if (pairs.length === 0) {
    return (
      <div ref={listRef} className="text-sm">
        <MoveButton
          ref={cursor === 0 ? activeRef : undefined}
          label="Starting position"
          isActive={cursor === 0}
          onClick={() => onSelectPly(0)}
        />
        <p className="mt-2 text-zinc-500">No moves yet.</p>
      </div>
    );
  }

  return (
    <div ref={listRef} className="text-sm">
      <MoveButton
        ref={cursor === 0 ? activeRef : undefined}
        label="Starting position"
        isActive={cursor === 0}
        onClick={() => onSelectPly(0)}
      />

      <ol className="mt-1 grid gap-px">
        {pairs.map((pair) => (
          <li
            key={pair.number}
            className="grid grid-cols-[2rem_1fr_1fr] items-center gap-1 rounded px-1"
          >
            <span className="tabular-nums text-zinc-600">{pair.number}.</span>
            <ClassifiedMoveButton
              ref={pair.white?.ply === cursor ? activeRef : undefined}
              move={pair.white}
              analysis={pair.white ? moveAnalyses?.get(pair.white.ply) : undefined}
              isActive={pair.white?.ply === cursor}
              onClick={() => pair.white && onSelectPly(pair.white.ply)}
            />
            <ClassifiedMoveButton
              ref={pair.black?.ply === cursor ? activeRef : undefined}
              move={pair.black}
              analysis={pair.black ? moveAnalyses?.get(pair.black.ply) : undefined}
              isActive={pair.black?.ply === cursor}
              onClick={() => pair.black && onSelectPly(pair.black.ply)}
            />
          </li>
        ))}
      </ol>

      {result ? <p className="mt-2 px-1 text-xs text-zinc-500">{result}</p> : null}
    </div>
  );
}

function ClassifiedMoveButton({
  move,
  analysis,
  isActive,
  onClick,
  ref,
}: {
  move?: ChessMove;
  analysis?: MoveAnalysis;
  isActive: boolean;
  onClick: () => void;
  ref?: Ref<HTMLButtonElement>;
}) {
  if (!move) {
    return <span />;
  }

  const title = analysis ? classificationLabel(analysis.classification) : undefined;
  const showIcon =
    analysis &&
    [
      "brilliant",
      "great",
      "best",
      "inaccuracy",
      "mistake",
      "miss",
      "blunder",
    ].includes(analysis.classification);

  return (
    <button
      ref={ref}
      type="button"
      title={title}
      aria-current={isActive ? "step" : undefined}
      onClick={onClick}
      className={`flex items-center justify-between gap-1.5 rounded px-1.5 py-0.5 text-left transition-colors ${
        isActive
          ? "bg-zinc-800 text-zinc-50 font-medium"
          : "text-zinc-300 hover:bg-zinc-800/70"
      }`}
    >
      <span className="truncate">{move.san}</span>
      {showIcon && analysis ? (
        <ClassificationIcon classification={analysis.classification} size="sm" />
      ) : null}
    </button>
  );
}

function MoveButton({
  label,
  isActive,
  onClick,
  ref,
}: {
  label?: string;
  isActive: boolean;
  onClick: () => void;
  ref?: Ref<HTMLButtonElement>;
}) {
  if (!label) {
    return <span />;
  }

  return (
    <button
      ref={ref}
      type="button"
      aria-current={isActive ? "step" : undefined}
      onClick={onClick}
      className={`rounded px-1.5 py-0.5 text-left text-xs transition-colors ${
        isActive ? "bg-zinc-800 text-zinc-50" : "text-zinc-500 hover:bg-zinc-800/70 hover:text-zinc-300"
      }`}
    >
      {label}
    </button>
  );
}
