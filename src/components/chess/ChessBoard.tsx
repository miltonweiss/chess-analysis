"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import { Chessboard } from "react-chessboard";
import { isPromotionMove } from "@/lib/chess/game";
import type { PlayerColor } from "@/lib/chess/types";
import type { ChessMove } from "@/lib/chess/types";
import type { MoveClassification } from "@/lib/analysis/types";
import { classificationHex } from "@/lib/analysis/classificationDisplay";
import { ClassificationIcon } from "@/components/review/ClassificationIcon";

type BoardArrow = {
  startSquare: string;
  endSquare: string;
  color: string;
};

type PromotionPiece = "q" | "r" | "b" | "n";

type ChessBoardProps = {
  fen: string;
  orientation: PlayerColor;
  lastMove: ChessMove | null;
  moveClassification?: MoveClassification | null;
  bestMoveUci?: string | null;
  interactive?: boolean;
  fill?: boolean;
  onMove: (from: string, to: string, promotion?: PromotionPiece) => boolean;
};

const PROMOTION_OPTIONS: { piece: PromotionPiece; label: string }[] = [
  { piece: "q", label: "Queen" },
  { piece: "r", label: "Rook" },
  { piece: "b", label: "Bishop" },
  { piece: "n", label: "Knight" },
];

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function squareToGrid(square: string, orientation: PlayerColor): { col: number; row: number } {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]) - 1;
  const col = orientation === "white" ? file : 7 - file;
  const row = orientation === "white" ? 7 - rank : rank;
  return { col: col + 1, row: row + 1 };
}

export function ChessBoard({
  fen,
  orientation,
  lastMove,
  moveClassification,
  bestMoveUci,
  interactive = true,
  fill = false,
  onMove,
}: ChessBoardProps) {
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: string;
    to: string;
  } | null>(null);

  const cancelPromotion = useCallback(() => {
    setPendingPromotion(null);
  }, []);

  useEffect(() => {
    if (!pendingPromotion) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cancelPromotion();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pendingPromotion, cancelPromotion]);

  const squareStyles: Record<string, CSSProperties> = {};

  if (lastMove) {
    if (moveClassification) {
      const hex = classificationHex(moveClassification);
      squareStyles[lastMove.from] = { backgroundColor: hexToRgba(hex, 0.3) };
      squareStyles[lastMove.to] = { backgroundColor: hexToRgba(hex, 0.55) };
    } else {
      squareStyles[lastMove.from] = { backgroundColor: "rgba(255, 255, 120, 0.35)" };
      squareStyles[lastMove.to] = { backgroundColor: "rgba(255, 255, 120, 0.55)" };
    }
  }

  // Arrows: if bestMoveUci is provided and different from the played move, show a green arrow
  const arrows: BoardArrow[] = [];
  if (bestMoveUci && bestMoveUci.length >= 4) {
    const startSquare = bestMoveUci.slice(0, 2);
    const endSquare = bestMoveUci.slice(2, 4);
    // Only show if it differs from the played move, or if explicitly requested
    if (!lastMove || lastMove.from !== startSquare || lastMove.to !== endSquare) {
      arrows.push({
        startSquare,
        endSquare,
        color: "#81b64c", // Chess.com green arrow
      });
    }
  }

  const handlePromotionChoice = (piece: PromotionPiece) => {
    if (!pendingPromotion) {
      return;
    }
    const { from, to } = pendingPromotion;
    setPendingPromotion(null);
    onMove(from, to, piece);
  };

  const toSquare = lastMove?.to;

  return (
    <div
      className={
        fill
          ? "relative h-full w-full"
          : "relative aspect-square w-full max-w-[min(100%,720px)]"
      }
    >
      <Chessboard
        options={{
          position: fen,
          boardOrientation: orientation,
          allowDragging: interactive && !pendingPromotion,
          showAnimations: true,
          animationDurationInMs: 150,
          darkSquareStyle: { backgroundColor: "var(--board-dark)" },
          lightSquareStyle: { backgroundColor: "var(--board-light)" },
          boardStyle: {
            borderRadius: "4px",
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.35)",
          },
          squareStyles,
          arrows,
          onPieceDrop: ({ sourceSquare, targetSquare }) => {
            if (!targetSquare) {
              return false;
            }

            if (isPromotionMove(fen, sourceSquare, targetSquare)) {
              setPendingPromotion({ from: sourceSquare, to: targetSquare });
              return false;
            }

            return onMove(sourceSquare, targetSquare);
          },
        }}
      />

      {moveClassification && toSquare ? (
        <div className="pointer-events-none absolute inset-0 z-20 grid grid-cols-8 grid-rows-8">
          <div
            className="relative"
            style={{
              gridColumn: squareToGrid(toSquare, orientation).col,
              gridRow: squareToGrid(toSquare, orientation).row,
            }}
          >
            <div className="@container absolute top-0 right-0 flex h-1/2 w-1/2 items-center justify-center p-[6%]">
              <ClassificationIcon classification={moveClassification} size="board" />
            </div>
          </div>
        </div>
      ) : null}

      {pendingPromotion ? (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center rounded-md bg-black/50 p-4"
          role="dialog"
          aria-label="Choose promotion piece"
          onClick={cancelPromotion}
        >
          <div
            className="flex flex-col gap-2 rounded-lg border border-zinc-600 bg-zinc-900 p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-center text-sm font-medium text-zinc-200">Promote to</p>
            <div className="grid grid-cols-2 gap-2">
              {PROMOTION_OPTIONS.map(({ piece, label }) => (
                <button
                  key={piece}
                  type="button"
                  className="rounded-md border border-zinc-600 bg-zinc-800 px-4 py-2 text-sm text-zinc-100 transition-colors hover:border-zinc-400 hover:bg-zinc-700"
                  onClick={() => handlePromotionChoice(piece)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="text-xs text-zinc-500 hover:text-zinc-300"
              onClick={cancelPromotion}
            >
              Cancel (Esc)
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
