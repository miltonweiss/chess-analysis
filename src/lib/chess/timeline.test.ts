import { describe, expect, it } from "vitest";
import { parsePgn } from "@/lib/chess/pgn";
import { buildTimeline, continueGamePly } from "@/lib/chess/timeline";

const RUY_LOPEZ_PGN = `[Event "Test"]
[White "Alice"]
[Black "Bob"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *`;

describe("timeline", () => {
  it("builds deterministic positions for a known game", () => {
    const parsed = parsePgn(RUY_LOPEZ_PGN);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const timeline = buildTimeline(parsed.game.initialFen, parsed.game.moves);

    expect(timeline).toHaveLength(7);
    expect(timeline[0]).toMatchObject({ ply: 0, move: null });
    expect(timeline[1]?.move?.san).toBe("e4");
    expect(timeline[2]?.move?.san).toBe("e5");
    expect(timeline[5]?.move?.san).toBe("Bb5");
    expect(timeline[6]?.move?.san).toBe("a6");

    expect(timeline[1]?.fen).toBe(timeline[1]?.move?.fenAfter);
    expect(timeline[5]?.move?.moveNumber).toBe(3);
    expect(timeline[5]?.move?.color).toBe("white");
    expect(timeline[6]?.move?.color).toBe("black");
    expect(timeline.every((position, index) => position.ply === index)).toBe(true);
  });

  it("continues the real game when the first try-move is the next played move", () => {
    const parsed = parsePgn(RUY_LOPEZ_PGN);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const { moves, initialFen } = parsed.game;
    const timeline = buildTimeline(initialFen, moves);

    expect(
      continueGamePly(timeline, moves, timeline[2]?.fen ?? "", 2, "g1", "f3"),
    ).toBe(3);

    expect(
      continueGamePly(timeline, moves, timeline[2]?.fen ?? "", 2, "d2", "d4"),
    ).toBeNull();
  });

  it("finds the matching game position even when the cursor is after that ply", () => {
    const parsed = parsePgn(RUY_LOPEZ_PGN);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const { moves, initialFen } = parsed.game;
    const timeline = buildTimeline(initialFen, moves);

    expect(
      continueGamePly(timeline, moves, timeline[0]?.fen ?? "", 6, "e2", "e4"),
    ).toBe(1);
  });
});
