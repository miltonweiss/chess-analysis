import { describe, expect, it } from "vitest";
import { playerWinPercent, winPercentWhite } from "@/lib/review/winProbability";

describe("winPercentWhite", () => {
  it("maps equal position to 50%", () => {
    expect(winPercentWhite({ type: "cp", value: 0 })).toBeCloseTo(50, 0);
  });

  it("maps positive cp to above 50%", () => {
    expect(winPercentWhite({ type: "cp", value: 1 })).toBeGreaterThan(50);
  });

  it("maps negative cp to below 50%", () => {
    expect(winPercentWhite({ type: "cp", value: -1 })).toBeLessThan(50);
  });

  it("maps terminal white checkmate to 100%", () => {
    expect(
      winPercentWhite(
        { type: "mate", value: 0 },
        { terminal: "checkmate", winner: "white" },
      ),
    ).toBe(100);
  });

  it("maps terminal black checkmate to 0%", () => {
    expect(
      winPercentWhite(
        { type: "mate", value: 0 },
        { terminal: "checkmate", winner: "black" },
      ),
    ).toBe(0);
  });

  it("flips perspective for Black player", () => {
    const whiteWin = winPercentWhite({ type: "cp", value: 1 });
    const blackWin = playerWinPercent({ type: "cp", value: 1 }, "black");
    expect(blackWin).toBeCloseTo(100 - whiteWin, 1);
  });
});
