import { describe, expect, it } from "vitest";
import { userColorFromMetadata } from "@/lib/chess/orientation";

describe("userColorFromMetadata", () => {
  it("detects white and black case-insensitively", () => {
    expect(userColorFromMetadata({ white: "Alice", black: "Bob" }, "alice")).toBe("white");
    expect(userColorFromMetadata({ white: "Alice", black: "Bob" }, " BOB ")).toBe("black");
  });

  it("returns undefined for unknown, empty or ambiguous users", () => {
    expect(userColorFromMetadata({ white: "Alice", black: "Bob" }, "carol")).toBeUndefined();
    expect(userColorFromMetadata({ white: "Alice", black: "Bob" }, "")).toBeUndefined();
    expect(userColorFromMetadata({ white: "Alice", black: "Bob" }, undefined)).toBeUndefined();
    expect(userColorFromMetadata({ white: "Me", black: "me" }, "me")).toBeUndefined();
  });
});
