import { describe, expect, it } from "vitest";
import { verifyMoveExplanationContext } from "@/lib/ai/context/verifyContext";
import { EVAL_FIXTURES } from "@/lib/ai/eval/fixtures";

describe("eval fixtures", () => {
  for (const fixture of EVAL_FIXTURES) {
    it(`${fixture.name} passes server verification`, () => {
      expect(() => verifyMoveExplanationContext(fixture.context)).not.toThrow();
    });
  }
});
