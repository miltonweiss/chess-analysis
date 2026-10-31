import { describe, expect, it } from "vitest";
import { loadedGameToState } from "@/lib/chess/game";
import { parsePgn, toPgn } from "@/lib/chess/pgn";

const SAMPLE_PGN = `[Event "Casual Game"]
[Site "Local"]
[Date "2026.10.06"]
[Round "1"]
[White "Alice"]
[Black "Bob"]
[WhiteElo "2400"]
[BlackElo "2300"]
[ECO "C60"]
[Opening "Ruy Lopez"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0`;

const MINIMAL_PGN = "1. e4 e5 2. Nf3 *";

const ILLEGAL_PGN = "1. e4 Qxe7";

const FEN_PGN = [
  '[SetUp "1"]',
  '[FEN "rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3"]',
  '[White "?"]',
  '[Black "?"]',
  '[Result "*"]',
  "",
  "3. Bb5+",
].join("\n");

describe("pgn parser", () => {
  it("parses valid pgn with headers", () => {
    const result = parsePgn(SAMPLE_PGN);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.game.metadata.white).toBe("Alice");
    expect(result.game.metadata.black).toBe("Bob");
    expect(result.game.metadata.whiteElo).toBe("2400");
    expect(result.game.metadata.eco).toBe("C60");
    expect(result.game.metadata.opening).toBe("Ruy Lopez");
    expect(result.game.moves).toHaveLength(6);
    expect(result.game.moves[0]?.san).toBe("e4");
  });

  it("parses pgn without headers", () => {
    const result = parsePgn(MINIMAL_PGN);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.game.moves).toHaveLength(3);
  });

  it("rejects empty pgn", () => {
    const result = parsePgn("   ");
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("empty");
  });

  it("rejects random text without valid game content", () => {
    const result = parsePgn("hello world");
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(["illegal-move", "syntax", "no-moves"]).toContain(result.error.code);
  });

  it("rejects header-only pgn without moves", () => {
    const result = parsePgn('[Event "Empty"]\n[Result "*"]');
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("no-moves");
  });

  it("reports illegal moves with friendly message", () => {
    const result = parsePgn(ILLEGAL_PGN);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.error.code).toBe("illegal-move");
    expect(result.error.message).toContain("Qxe7");
  });

  it("parses setup fen games", () => {
    const result = parsePgn(FEN_PGN);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.game.initialFen).toContain("5n2");
    expect(result.game.moves[0]?.san).toMatch(/^Bb5\+?$/);
  });

  it("ignores placeholder question mark headers", () => {
    const result = parsePgn(FEN_PGN);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.game.metadata.white).toBeUndefined();
    expect(result.game.metadata.black).toBeUndefined();
  });

  it("round-trips pgn for loaded games", () => {
    const parsed = parsePgn(SAMPLE_PGN);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const state = loadedGameToState(parsed.game);
    const pgn = toPgn(state);

    expect(pgn).toContain('[White "Alice"]');
    expect(pgn).toContain('[Black "Bob"]');
    expect(pgn).toContain("1. e4 e5");
  });
});
