import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChessComClient } from "@/lib/chesscom/client";
import { importChessComGames, selectArchiveUrls } from "@/lib/chesscom/importGames";
import { resetDatabaseConnection } from "@/lib/storage/indexedDb";
import { clearAllGames, countGames, saveSyncRecord } from "@/lib/storage/gameRepository";

const samplePgn = `[Event "Live Chess"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]
[TimeControl "180"]

1. e4 e5 1-0`;

const sampleGame = {
  url: "https://www.chess.com/game/live/999",
  pgn: samplePgn,
  end_time: 1_704_067_200,
  time_control: "180",
  time_class: "blitz",
  rated: true,
  rules: "chess",
  white: { username: "Alice", rating: 1500, result: "win" },
  black: { username: "Bob", rating: 1400, result: "resigned" },
};

function createMockClient() {
  const client = new ChessComClient({
    fetchImpl: vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/archives")) {
        return new Response(
          JSON.stringify({
            archives: ["https://api.chess.com/pub/player/alice/games/2024/01"],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (url.includes("/2024/01")) {
        return new Response(JSON.stringify({ games: [sampleGame] }), {
          status: 200,
          headers: { "content-type": "application/json", etag: 'W/"month"' },
        });
      }

      if (url.endsWith("/player/alice")) {
        return new Response(JSON.stringify({ username: "alice" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response("{}", { status: 404 });
    }),
  });

  return client;
}

beforeEach(async () => {
  resetDatabaseConnection();
  await clearAllGames();
});

describe("importChessComGames", () => {
  it("imports games newest-first and deduplicates on re-run", async () => {
    const client = createMockClient();

    const first = await importChessComGames({ username: "Alice", client });
    expect(first.gamesAdded).toBe(1);
    expect(await countGames()).toBe(1);

    const second = await importChessComGames({ username: "Alice", client });
    expect(second.gamesAdded).toBe(0);
    expect(second.duplicates).toBe(1);
    expect(await countGames()).toBe(1);
  });

  it("continues when a month fails", async () => {
    const client = new ChessComClient({
      fetchImpl: vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
        if (url.includes("/archives")) {
          return new Response(
            JSON.stringify({
              archives: [
                "https://api.chess.com/pub/player/bob/games/2024/02",
                "https://api.chess.com/pub/player/bob/games/2024/01",
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }

        if (url.includes("/2024/02")) {
          return new Response("fail", { status: 500 });
        }

        if (url.includes("/2024/01")) {
          return new Response(JSON.stringify({ games: [sampleGame] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }

        if (url.endsWith("/player/bob")) {
          return new Response(JSON.stringify({ username: "bob" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }

        return new Response("{}", { status: 404 });
      }),
    });

    const result = await importChessComGames({ username: "Bob", client });
    expect(result.monthErrors).toBe(1);
    expect(result.gamesAdded).toBe(1);
  });

  it("on a later sync only fetches months since lastSyncedAt", async () => {
    const requested: string[] = [];
    const client = new ChessComClient({
      fetchImpl: vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        requested.push(url);
        if (url.includes("/archives")) {
          return new Response(
            JSON.stringify({
              archives: [
                "https://api.chess.com/pub/player/cara/games/2024/01",
                "https://api.chess.com/pub/player/cara/games/2024/04",
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        if (url.includes("/2024/04") || url.includes("/2024/01")) {
          return new Response(JSON.stringify({ games: [] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        if (url.endsWith("/player/cara")) {
          return new Response(JSON.stringify({ username: "cara" }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response("{}", { status: 404 });
      }),
    });

    await saveSyncRecord({
      key: "chess.com:cara",
      username: "cara",
      lastSyncedAt: "2024-04-10T12:00:00.000Z",
      archives: {},
    });

    await importChessComGames({ username: "Cara", client });
    expect(requested.some((url) => url.includes("/2024/04"))).toBe(true);
    expect(requested.some((url) => url.includes("/2024/01"))).toBe(false);
  });
});

describe("selectArchiveUrls", () => {
  const urls = [
    "https://api.chess.com/pub/player/a/games/2024/04",
    "https://api.chess.com/pub/player/a/games/2024/03",
    "https://api.chess.com/pub/player/a/games/2024/02",
    "https://api.chess.com/pub/player/a/games/2024/01",
  ];

  it("fetches every archive on first sync", () => {
    expect(selectArchiveUrls(urls, undefined)).toEqual(urls);
  });

  it("fetches only the current month when last sync was this month", () => {
    expect(selectArchiveUrls(urls, "2024-04-20T00:00:00.000Z")).toEqual([
      "https://api.chess.com/pub/player/a/games/2024/04",
    ]);
  });

  it("fetches from the last-sync month through now", () => {
    expect(selectArchiveUrls(urls, "2024-02-03T00:00:00.000Z")).toEqual([
      "https://api.chess.com/pub/player/a/games/2024/04",
      "https://api.chess.com/pub/player/a/games/2024/03",
      "https://api.chess.com/pub/player/a/games/2024/02",
    ]);
  });
});
