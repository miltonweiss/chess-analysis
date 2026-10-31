import type { GameAnalysis } from "@/lib/analysis/types";
import type { AnalysisVersion } from "@/lib/analysis/version";
import type { PlayerColor } from "@/lib/chess/types";
import type { ClassificationCounts } from "@/lib/review/types";

export type GameSource = "chess.com" | "lichess" | "pgn" | "manual";

export type TimeClass = "daily" | "rapid" | "blitz" | "bullet" | "unknown";

export type UserResult = "win" | "loss" | "draw";

export type StoredPlayer = {
  name: string;
  rating?: number;
};

export type StoredGame = {
  id: string;
  source: GameSource;
  sourceGameId?: string;
  sourceUrl?: string;
  white: StoredPlayer;
  black: StoredPlayer;
  /** Color the importing user played, when known. */
  userColor?: PlayerColor;
  /** Result from the user's perspective. */
  result?: UserResult | null;
  rawResult?: string;
  endTime: number;
  timeClass: TimeClass;
  timeControl?: string;
  rated?: boolean;
  rules: string;
  eco?: string;
  openingName?: string;
  moveCount: number;
  chesscomAccuracies?: {
    white?: number;
    black?: number;
  };
  importedAt: number;
  /** Denormalized from analysis summary for list views. */
  analysisSummary?: AnalysisSummary;
  /** FEN after the last move, used for library board previews. */
  finalFen?: string;
  /** Squares of the last move, used to highlight the final position. */
  lastMove?: { from: string; to: string };
};

export type StoredPgn = {
  gameId: string;
  pgn: string;
};

export type AnalysisSummary = {
  whiteAccuracy: number;
  blackAccuracy: number;
  whiteCounts: ClassificationCounts;
  blackCounts: ClassificationCounts;
  analyzedAt: number;
  version: AnalysisVersion;
};

export type StoredAnalysis = {
  gameId: string;
  version: AnalysisVersion;
  analysis: GameAnalysis;
  summary: AnalysisSummary;
  analyzedAt: number;
};

export type ArchiveSyncMeta = {
  etag?: string;
  lastModified?: string;
  gameCount?: number;
};

export type SyncRecord = {
  key: string;
  username: string;
  lastSyncedAt: string;
  archives: Record<string, ArchiveSyncMeta>;
};

export type GameWithPgn = {
  game: StoredGame;
  pgn: string;
};
