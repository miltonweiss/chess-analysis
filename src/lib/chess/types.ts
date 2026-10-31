export type PlayerColor = "white" | "black";

export type GameMode = "play" | "replay";
// Future: "analysis" for variation editing

export type GameMetadata = {
  white?: string;
  black?: string;
  whiteElo?: string;
  blackElo?: string;
  event?: string;
  site?: string;
  date?: string;
  result?: string;
  round?: string;
  eco?: string;
  opening?: string;
  timeControl?: string;
  headers?: Record<string, string>;
};

export type ChessMove = {
  ply: number;
  moveNumber: number;
  color: PlayerColor;
  san: string;
  uci: string;
  from: string;
  to: string;
  promotion?: string;
  fenBefore: string;
  fenAfter: string;
};

export type GamePosition = {
  ply: number;
  fen: string;
  move: ChessMove | null;
};

export type LoadedGame = {
  initialFen: string;
  moves: ChessMove[];
  metadata: GameMetadata;
  pgn: string;
};

export type GameState = {
  initialFen: string;
  moves: ChessMove[];
  cursor: number;
  metadata: GameMetadata;
  mode: GameMode;
  pgn?: string;
};

export type GameStatus =
  | { type: "playing"; turn: PlayerColor }
  | { type: "checkmate"; winner: PlayerColor }
  | { type: "stalemate" }
  | { type: "draw"; reason: string };

export type GameAction =
  | { type: "MAKE_MOVE"; uci: string }
  | { type: "PREVIOUS" }
  | { type: "NEXT" }
  | { type: "FIRST" }
  | { type: "LAST" }
  | { type: "GOTO"; ply: number }
  | { type: "NEW_BOARD" }
  | { type: "LOAD_GAME"; game: LoadedGame };

export type PgnErrorCode =
  | "empty"
  | "syntax"
  | "illegal-move"
  | "invalid-fen"
  | "no-moves";

export type PgnError = {
  code: PgnErrorCode;
  message: string;
};

export type PgnParseResult =
  | { ok: true; game: LoadedGame }
  | { ok: false; error: PgnError };
