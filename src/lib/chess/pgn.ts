import { Chess, DEFAULT_POSITION, type Move } from "chess.js";
import type {
  ChessMove,
  GameMetadata,
  GameState,
  LoadedGame,
  PgnError,
  PgnParseResult,
} from "@/lib/chess/types";

function colorFromChess(color: "w" | "b"): "white" | "black" {
  return color === "w" ? "white" : "black";
}

function moveToChessMove(move: Move, ply: number): ChessMove {
  return {
    ply,
    moveNumber: Math.ceil(ply / 2),
    color: colorFromChess(move.color),
    san: move.san,
    uci: move.lan,
    from: move.from,
    to: move.to,
    promotion: move.promotion,
    fenBefore: move.before,
    fenAfter: move.after,
  };
}

function normalizeHeaderValue(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === "?") {
    return undefined;
  }

  return trimmed;
}

function extractMetadata(headers: Record<string, string>): GameMetadata {
  const metadata: GameMetadata = {
    white: normalizeHeaderValue(headers.White),
    black: normalizeHeaderValue(headers.Black),
    whiteElo: normalizeHeaderValue(headers.WhiteElo),
    blackElo: normalizeHeaderValue(headers.BlackElo),
    event: normalizeHeaderValue(headers.Event),
    site: normalizeHeaderValue(headers.Site),
    date: normalizeHeaderValue(headers.Date),
    result: normalizeHeaderValue(headers.Result),
    round: normalizeHeaderValue(headers.Round),
    eco: normalizeHeaderValue(headers.ECO),
    opening: normalizeHeaderValue(headers.Opening),
    timeControl: normalizeHeaderValue(headers.TimeControl),
    headers: Object.fromEntries(
      Object.entries(headers).filter(([, value]) => normalizeHeaderValue(value) !== undefined),
    ),
  };

  return metadata;
}

function hasMeaningfulMetadata(metadata: GameMetadata): boolean {
  return Boolean(
    metadata.white ||
      metadata.black ||
      metadata.event ||
      metadata.site ||
      metadata.date ||
      metadata.result ||
      metadata.round ||
      metadata.eco ||
      metadata.opening,
  );
}

function translatePgnError(error: unknown): PgnError {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("Invalid move in PGN:")) {
    const move = message.split("Invalid move in PGN:")[1]?.trim() ?? "unknown";
    return {
      code: "illegal-move",
      message: `Unable to load this PGN. The move "${move}" is illegal in the current position.`,
    };
  }

  if (message.includes("Invalid FEN")) {
    return {
      code: "invalid-fen",
      message: "Unable to load this PGN. The FEN tag contains an invalid position.",
    };
  }

  if (error instanceof SyntaxError || message.toLowerCase().includes("expected")) {
    return {
      code: "syntax",
      message: "Unable to load this PGN. The syntax is invalid.",
    };
  }

  return {
    code: "syntax",
    message: "Unable to load this PGN. Please check the format and try again.",
  };
}

export function parsePgn(pgnText: string): PgnParseResult {
  const trimmed = pgnText.trim();

  if (!trimmed) {
    return {
      ok: false,
      error: {
        code: "empty",
        message: "Please paste a PGN before loading.",
      },
    };
  }

  const chess = new Chess();

  try {
    chess.loadPgn(trimmed);
  } catch (error) {
    console.debug("[parsePgn]", error);
    return {
      ok: false,
      error: translatePgnError(error),
    };
  }

  const headers = chess.getHeaders();
  const metadata = extractMetadata(headers);
  const history = chess.history({ verbose: true }) as Move[];

  if (history.length === 0) {
    return {
      ok: false,
      error: {
        code: "no-moves",
        message: hasMeaningfulMetadata(metadata)
          ? "Unable to load this PGN. Headers were found, but no moves were included."
          : "Unable to load this PGN. No moves or game headers were found.",
      },
    };
  }

  const setupFen = normalizeHeaderValue(headers.FEN);
  const initialFen = setupFen ?? history[0]?.before ?? DEFAULT_POSITION;
  const moves = history.map((move, index) => moveToChessMove(move, index + 1));

  const game: LoadedGame = {
    initialFen,
    moves,
    metadata,
    pgn: trimmed,
  };

  return { ok: true, game };
}

export function gameStateToLoadedGame(state: GameState): LoadedGame {
  return {
    initialFen: state.initialFen,
    moves: state.moves,
    metadata: state.metadata,
    pgn: state.pgn ?? toPgn({ ...state, cursor: state.moves.length }),
  };
}

export function toPgn(state: GameState): string {
  const chess = new Chess(state.initialFen);

  const headerMap: Array<[string, keyof GameMetadata]> = [
    ["Event", "event"],
    ["Site", "site"],
    ["Date", "date"],
    ["Round", "round"],
    ["White", "white"],
    ["Black", "black"],
    ["WhiteElo", "whiteElo"],
    ["BlackElo", "blackElo"],
    ["Result", "result"],
    ["ECO", "eco"],
    ["Opening", "opening"],
    ["TimeControl", "timeControl"],
  ];

  for (const [headerKey, metadataKey] of headerMap) {
    const value = state.metadata[metadataKey];
    if (typeof value === "string" && value) {
      chess.setHeader(headerKey, value);
    }
  }

  for (let i = 0; i < state.cursor; i += 1) {
    const move = state.moves[i];
    chess.move({ from: move.from, to: move.to, promotion: move.promotion ?? "q" });
  }

  return chess.pgn();
}
