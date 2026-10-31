import { defaultPieces } from "react-chessboard";
import type { PlayerColor } from "@/lib/chess/types";

type MiniBoardProps = {
  fen: string;
  orientation: PlayerColor;
  lastMove?: { from: string; to: string } | null;
  className?: string;
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

/** Maps each occupied square to its piece key, e.g. `e4 -> "wP"`. */
function parsePlacement(fen: string): Map<string, string> {
  const pieces = new Map<string, string>();
  const placement = fen.split(" ")[0] ?? "";
  const ranks = placement.split("/");

  ranks.forEach((rank, rankIndex) => {
    let file = 0;
    for (const char of rank) {
      if (/\d/.test(char)) {
        file += Number(char);
        continue;
      }
      const color = char === char.toUpperCase() ? "w" : "b";
      pieces.set(`${FILES[file]}${8 - rankIndex}`, `${color}${char.toUpperCase()}`);
      file += 1;
    }
  });

  return pieces;
}

/** Squares in display order: top-left first, from the viewer's side. */
function displaySquares(orientation: PlayerColor): { square: string; isDark: boolean }[] {
  const files = orientation === "white" ? FILES : [...FILES].reverse();
  const ranks = orientation === "white" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];

  return ranks.flatMap((rank) =>
    files.map((file) => {
      const fileIndex = FILES.indexOf(file);
      return {
        square: `${file}${rank}`,
        // a1 is a dark square: file index and rank sum to an odd number.
        isDark: (fileIndex + rank) % 2 === 1,
      };
    }),
  );
}

/**
 * Static, non-interactive board for list views. Uses the same piece artwork and
 * board colors as ChessBoard, but no drag-and-drop or per-instance state.
 */
export function MiniBoard({ fen, orientation, lastMove, className = "" }: MiniBoardProps) {
  const pieces = parsePlacement(fen);
  const highlighted = new Set(lastMove ? [lastMove.from, lastMove.to] : []);

  return (
    <div
      role="img"
      aria-label="Final position"
      className={`relative aspect-square w-full overflow-hidden ${className}`}
    >
      <div className="grid h-full w-full grid-cols-8 grid-rows-8">
        {displaySquares(orientation).map(({ square, isDark }) => {
          const piece = pieces.get(square);
          const Piece = piece ? defaultPieces[piece] : null;

          return (
            <div
              key={square}
              className={`relative ${isDark ? "bg-board-dark" : "bg-board-light"}`}
            >
              {highlighted.has(square) ? (
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{ backgroundColor: "rgba(255, 255, 120, 0.45)" }}
                />
              ) : null}
              {Piece ? (
                <div className="absolute inset-[4%]">{Piece()}</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
