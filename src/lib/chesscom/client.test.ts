import { describe, expect, it, vi } from "vitest";
import { ChessComClient } from "@/lib/chesscom/client";

describe("ChessComClient", () => {
  it("serializes requests", async () => {
    let concurrent = 0;
    let maxConcurrent = 0;

    const fetchImpl = vi.fn(async () => {
      concurrent += 1;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise((resolve) => setTimeout(resolve, 5));
      concurrent -= 1;
      return new Response(JSON.stringify({ archives: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const client = new ChessComClient({ fetchImpl });

    await Promise.all([
      client.getArchives("alice"),
      client.getArchives("alice"),
      client.getArchives("alice"),
    ]);

    expect(maxConcurrent).toBe(1);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("returns not modified on 304", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 304 }));

    const client = new ChessComClient({ fetchImpl });
    const result = await client.getMonthlyGames(
      "https://api.chess.com/pub/player/alice/games/2024/01",
      { etag: 'W/"abc"' },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.notModified).toBe(true);
    }
  });

  it("maps 404 to user_not_found for profile", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 404 }));
    const client = new ChessComClient({ fetchImpl });
    const result = await client.getPlayer("missing");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("user_not_found");
    }
  });

  it("retries on 429 then succeeds", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      if (calls === 1) {
        return new Response("{}", { status: 429 });
      }
      return new Response(JSON.stringify({ archives: ["https://api.chess.com/a"] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const client = new ChessComClient({ fetchImpl });
    const result = await client.getArchives("alice");

    expect(calls).toBeGreaterThan(1);
    expect(result.ok).toBe(true);
  });
});
