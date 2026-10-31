import { describe, expect, it } from "vitest";
import { classifyMove } from "@/lib/analysis/classification";
import { DEFAULT_CLASSIFICATION_THRESHOLDS } from "@/lib/analysis/settings";

const thresholds = DEFAULT_CLASSIFICATION_THRESHOLDS;

describe("classifyMove", () => {
  it("classifies forced positions", () => {
    expect(
      classifyMove({
        playerColor: "white",
        evaluationBefore: { type: "cp", value: 0 },
        evaluationAfter: { type: "cp", value: 0 },
        playedMoveUci: "e2e4",
        bestMoveUci: "d2d4",
        isForced: true,
      }),
    ).toBe("forced");
  });

  it("classifies engine top move as best", () => {
    expect(
      classifyMove({
        playerColor: "white",
        evaluationBefore: { type: "cp", value: 0.3 },
        evaluationAfter: { type: "cp", value: 0.25 },
        playedMoveUci: "e2e4",
        bestMoveUci: "e2e4",
      }),
    ).toBe("best");
  });

  it("classifies MultiPV equivalent line as best", () => {
    expect(
      classifyMove({
        playerColor: "white",
        evaluationBefore: { type: "cp", value: 0.42 },
        evaluationAfter: { type: "cp", value: 0.38 },
        playedMoveUci: "d2d4",
        bestMoveUci: "e2e4",
        alternativeLines: [
          { bestMoveUci: "e2e4", evaluation: { type: "cp", value: 0.42 } },
          { bestMoveUci: "d2d4", evaluation: { type: "cp", value: 0.4 } },
        ],
      }),
    ).toBe("best");
  });

  it("classifies near-zero loss as best", () => {
    expect(
      classifyMove({
        playerColor: "white",
        evaluationBefore: { type: "cp", value: 0.5 },
        evaluationAfter: { type: "cp", value: 0.495 },
        playedMoveUci: "g1f3",
        bestMoveUci: "e2e4",
      }),
    ).toBe("best");
  });

  it("classifies threshold boundaries", () => {
    const base = {
      playerColor: "white" as const,
      evaluationBefore: { type: "cp" as const, value: 1.0 },
      playedMoveUci: "g1f3",
      bestMoveUci: "e2e4",
      thresholds,
    };

    expect(
      classifyMove({
        ...base,
        evaluationAfter: { type: "cp", value: 1.0 - thresholds.excellentMaxLoss + 0.001 },
      }),
    ).toBe("excellent");

    expect(
      classifyMove({
        ...base,
        evaluationAfter: { type: "cp", value: 1.0 - thresholds.goodMaxLoss + 0.001 },
      }),
    ).toBe("good");

    expect(
      classifyMove({
        ...base,
        evaluationAfter: { type: "cp", value: 1.0 - thresholds.inaccuracyMaxLoss + 0.001 },
      }),
    ).toBe("inaccuracy");

    expect(
      classifyMove({
        ...base,
        evaluationAfter: { type: "cp", value: 1.0 - thresholds.mistakeMaxLoss + 0.001 },
      }),
    ).toBe("mistake");

    expect(
      classifyMove({
        ...base,
        evaluationAfter: { type: "cp", value: 1.0 - thresholds.mistakeMaxLoss - 0.001 },
      }),
    ).toBe("blunder");
  });

  it("classifies great move when second line is significantly worse", () => {
    expect(
      classifyMove({
        playerColor: "white",
        evaluationBefore: { type: "cp", value: 1.5 },
        evaluationAfter: { type: "cp", value: 1.5 },
        playedMoveUci: "e2e4",
        bestMoveUci: "e2e4",
        alternativeLines: [
          { bestMoveUci: "e2e4", evaluation: { type: "cp", value: 1.5 } },
          { bestMoveUci: "d2d4", evaluation: { type: "cp", value: 0.1 } },
        ],
      }),
    ).toBe("great");
  });

  it("classifies brilliant move when a sacrifice is played and position remains winning", () => {
    // Greek gift or knight sacrifice: 1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. Bxf7+
    const fenBefore = "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4";
    expect(
      classifyMove({
        playerColor: "white",
        evaluationBefore: { type: "cp", value: 1.5 },
        evaluationAfter: { type: "cp", value: 1.4 },
        playedMoveUci: "c4f7",
        bestMoveUci: "c4f7",
        fenBefore,
      }),
    ).toBe("brilliant");
  });
});
