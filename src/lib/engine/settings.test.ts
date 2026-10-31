import { describe, expect, it } from "vitest";
import { analysisCacheKey } from "@/lib/engine/settings";

const FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("analysisCacheKey", () => {
  it("omits multipv suffix when multipv is 1", () => {
    const key = analysisCacheKey(FEN, { depth: 15, multipv: 1 });
    expect(key).toBe(`${FEN}|d:15|t:0`);
    expect(key).not.toContain("|m:");
  });

  it("includes multipv suffix when multipv > 1", () => {
    const key = analysisCacheKey(FEN, { depth: 15, multipv: 2 });
    expect(key).toBe(`${FEN}|d:15|t:0|m:2`);
  });
});
