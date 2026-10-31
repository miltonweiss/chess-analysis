import {
  ChessComError,
  chessComArchivesSchema,
  chessComMonthlyGamesSchema,
  chessComPlayerSchema,
  type ChessComFetchResult,
} from "@/lib/chesscom/types";

const BASE_URL = "https://api.chess.com/pub";
const MAX_RETRIES = 5;

export type ChessComClientOptions = {
  fetchImpl?: typeof fetch;
};

type ConditionalHeaders = {
  etag?: string;
  lastModified?: string;
};

export class ChessComClient {
  private readonly fetchImpl: typeof fetch;
  private queue: Promise<unknown> = Promise.resolve();
  private inFlight = 0;

  constructor(options: ChessComClientOptions = {}) {
    // Wrap global fetch so it is not invoked with the client as `this`
    // (which causes "Illegal invocation" in browsers).
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
  }

  get concurrentRequests(): number {
    return this.inFlight;
  }

  async getPlayer(username: string, signal?: AbortSignal): Promise<ChessComFetchResult<unknown>> {
    return this.request(`/player/${encodeURIComponent(username)}`, undefined, signal);
  }

  async getArchives(
    username: string,
    signal?: AbortSignal,
  ): Promise<ChessComFetchResult<{ archives: string[] }>> {
    const result = await this.request(
      `/player/${encodeURIComponent(username)}/games/archives`,
      undefined,
      signal,
    );

    if (!result.ok) {
      return result;
    }

    if (result.notModified) {
      return result;
    }

    const parsed = chessComArchivesSchema.safeParse(result.data);
    if (!parsed.success) {
      return {
        ok: false,
        error: new ChessComError("bad_response", "Invalid archives response from Chess.com"),
      };
    }

    return {
      ok: true,
      data: parsed.data,
      etag: result.etag,
      lastModified: result.lastModified,
    };
  }

  async getMonthlyGames(
    archiveUrl: string,
    headers: ConditionalHeaders = {},
    signal?: AbortSignal,
  ): Promise<ChessComFetchResult<{ games: unknown[] }>> {
    const path = archiveUrl.replace(BASE_URL, "");
    const result = await this.request(path, headers, signal);

    if (!result.ok) {
      return result;
    }

    if (result.notModified) {
      return result;
    }

    const parsed = chessComMonthlyGamesSchema.safeParse(result.data);
    if (!parsed.success) {
      return {
        ok: false,
        error: new ChessComError("bad_response", "Invalid monthly games response from Chess.com"),
      };
    }

    return {
      ok: true,
      data: parsed.data,
      etag: result.etag,
      lastModified: result.lastModified,
    };
  }

  private async request(
    path: string,
    headers: ConditionalHeaders = {},
    signal?: AbortSignal,
  ): Promise<ChessComFetchResult<unknown>> {
    const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;

    const task = this.queue.then(async () => {
      this.inFlight += 1;
      try {
        return await this.fetchWithRetry(url, headers, signal);
      } finally {
        this.inFlight -= 1;
      }
    });

    this.queue = task.catch(() => undefined);
    return task;
  }

  private async fetchWithRetry(
    url: string,
    headers: ConditionalHeaders,
    signal?: AbortSignal,
  ): Promise<ChessComFetchResult<unknown>> {
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      if (signal?.aborted) {
        return { ok: false, error: new ChessComError("aborted", "Import cancelled") };
      }

      try {
        const requestHeaders: Record<string, string> = {
          Accept: "application/json",
        };

        if (headers.etag) {
          requestHeaders["If-None-Match"] = headers.etag;
        }
        if (headers.lastModified) {
          requestHeaders["If-Modified-Since"] = headers.lastModified;
        }

        const response = await this.fetchImpl(url, { headers: requestHeaders, signal });
        const etag = response.headers.get("etag") ?? undefined;
        const lastModified = response.headers.get("last-modified") ?? undefined;

        if (response.status === 304) {
          return { ok: true, notModified: true, etag, lastModified };
        }

        if (response.status === 404) {
          return {
            ok: false,
            error: new ChessComError("user_not_found", "Chess.com username not found"),
          };
        }

        if (response.status === 429) {
          attempt += 1;
          const delayMs = Math.min(1000 * 2 ** attempt, 8000);
          await sleep(delayMs, signal);
          continue;
        }

        if (!response.ok) {
          return {
            ok: false,
            error: new ChessComError(
              "bad_response",
              `Chess.com request failed with status ${response.status}`,
            ),
          };
        }

        const data: unknown = await response.json();
        return { ok: true, data, etag, lastModified, notModified: false };
      } catch (error) {
        if (signal?.aborted) {
          return { ok: false, error: new ChessComError("aborted", "Import cancelled") };
        }

        attempt += 1;
        if (attempt >= MAX_RETRIES) {
          const message = error instanceof Error ? error.message : "Network request failed";
          return { ok: false, error: new ChessComError("network", message) };
        }

        await sleep(Math.min(1000 * attempt, 5000), signal);
      }
    }

    return {
      ok: false,
      error: new ChessComError("rate_limited", "Chess.com rate limit exceeded"),
    };
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new ChessComError("aborted", "Import cancelled"));
      },
      { once: true },
    );
  });
}

export function validateChessComUsername(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  if (!/^[a-z0-9_-]{3,25}$/i.test(trimmed)) {
    return null;
  }

  return trimmed;
}

export function parsePlayerProfile(data: unknown) {
  return chessComPlayerSchema.safeParse(data);
}
