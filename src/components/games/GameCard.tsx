import { MiniBoard } from "@/components/chess/MiniBoard";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { StoredGame, TimeClass } from "@/lib/games/types";

type GameCardProps = {
  game: StoredGame;
};

const timeClassLabels: Record<TimeClass, string> = {
  daily: "Daily",
  rapid: "Rapid",
  blitz: "Blitz",
  bullet: "Bullet",
  unknown: "Unknown",
};

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Result word for the bottom row, colored with the theme tokens. */
function resultText(game: StoredGame): { label: string; className: string } {
  if (game.result === "win") {
    return { label: "Win", className: "text-win" };
  }
  if (game.result === "loss") {
    return { label: "Loss", className: "text-loss" };
  }
  if (game.result === "draw") {
    return { label: "Draw", className: "text-draw" };
  }
  return { label: "–", className: "text-zinc-500" };
}

/** The user's accuracy as a percent string, or null when the game is not analyzed. */
function formatAccuracy(game: StoredGame): string | null {
  if (!game.analysisSummary) {
    return null;
  }

  const summary = game.analysisSummary;
  if (game.userColor === "black") {
    return `${summary.blackAccuracy.toFixed(0)}%`;
  }

  return `${summary.whiteAccuracy.toFixed(0)}%`;
}

export function GameCard({ game }: GameCardProps) {
  const result = resultText(game);
  const opponent =
    game.userColor === "white" ? game.black : game.userColor === "black" ? game.white : null;
  const title = opponent
    ? `${opponent.name}${opponent.rating ? ` (${opponent.rating})` : ""}`
    : `${game.white.name} vs ${game.black.name}`;
  const side =
    game.userColor === "white" ? "White" : game.userColor === "black" ? "Black" : null;
  const accuracy = formatAccuracy(game);
  const orientation = game.userColor ?? "white";

  return (
    <Card
      href={`/analyze?game=${encodeURIComponent(game.id)}`}
      className="flex flex-col overflow-hidden"
    >
      <div className="relative">
        {game.finalFen ? (
          <MiniBoard
            fen={game.finalFen}
            orientation={orientation}
            lastMove={game.lastMove}
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center bg-surface text-xs text-zinc-600">
            No position
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="truncate font-medium text-zinc-100">{title}</p>
        <p className="truncate text-xs text-zinc-500">
          {formatDate(game.endTime)} · {timeClassLabels[game.timeClass]}
          {side ? ` · ${side}` : ""}
        </p>

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className={`text-sm font-medium ${result.className}`}>{result.label}</span>
          {accuracy ? (
            <Badge variant="neutral">{accuracy}</Badge>
          ) : (
            <Badge variant="accent">Analyse</Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
