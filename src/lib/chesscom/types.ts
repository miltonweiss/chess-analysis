import { z } from "zod";

export const chessComPlayerSchema = z.object({
  username: z.string(),
  player_id: z.number().optional(),
  url: z.string().optional(),
  name: z.string().optional(),
  title: z.string().optional(),
  country: z.string().optional(),
  joined: z.number().optional(),
  status: z.string().optional(),
  followers: z.number().optional(),
  last_online: z.number().optional(),
});

export const chessComArchivesSchema = z.object({
  archives: z.array(z.string()),
});

const chessComPlayerSideSchema = z.object({
  username: z.string(),
  rating: z.number().optional(),
  result: z.string().optional(),
  uuid: z.string().optional(),
  "@id": z.string().optional(),
});

export const chessComGameSchema = z.object({
  url: z.string(),
  pgn: z.string(),
  time_control: z.string().optional(),
  time_class: z.enum(["daily", "rapid", "blitz", "bullet"]).optional(),
  end_time: z.number(),
  start_time: z.number().optional(),
  rated: z.boolean().optional(),
  rules: z.string().optional(),
  fen: z.string().optional(),
  eco: z.string().optional(),
  accuracies: z
    .object({
      white: z.number().optional(),
      black: z.number().optional(),
    })
    .optional(),
  white: chessComPlayerSideSchema,
  black: chessComPlayerSideSchema,
});

export const chessComMonthlyGamesSchema = z.object({
  games: z.array(chessComGameSchema),
});

export type ChessComPlayer = z.infer<typeof chessComPlayerSchema>;
export type ChessComGame = z.infer<typeof chessComGameSchema>;

export type ChessComErrorCode =
  | "user_not_found"
  | "rate_limited"
  | "network"
  | "bad_response"
  | "aborted";

export class ChessComError extends Error {
  constructor(
    public readonly code: ChessComErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ChessComError";
  }
}

export type ChessComFetchResult<T> =
  | { ok: true; data: T; etag?: string; lastModified?: string; notModified?: false }
  | { ok: true; notModified: true; etag?: string; lastModified?: string }
  | { ok: false; error: ChessComError };

export type ImportProgress = {
  phase: "profile" | "archives" | "month";
  currentMonth: number;
  totalMonths: number;
  monthLabel?: string;
  gamesAdded: number;
  duplicates: number;
  skippedVariants: number;
  skippedInvalid: number;
};

export type ImportResult = {
  username: string;
  gamesAdded: number;
  duplicates: number;
  skippedVariants: number;
  skippedInvalid: number;
  monthsProcessed: number;
  monthErrors: number;
  lastSyncedAt: string;
};
