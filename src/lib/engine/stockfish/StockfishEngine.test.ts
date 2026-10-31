import { afterEach, describe, expect, it, vi } from "vitest";
import { StockfishEngine } from "@/lib/engine/stockfish/StockfishEngine";
import { createInitRules, createSearchRules, FakeWorker } from "@/lib/engine/stockfish/FakeWorker";
import { EngineAbortedError } from "@/lib/engine/types";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("StockfishEngine", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("initializes with uci handshake", async () => {
    const worker = new FakeWorker(createInitRules());
    const engine = new StockfishEngine(() => worker as unknown as Worker);

    const identity = await engine.initialize();

    expect(identity.name).toBe("Fake Stockfish");
    expect(engine.status).toBe("ready");
    expect(worker.posted).toContain("uci");
    expect(worker.posted).toContain("isready");
  });

  it("initialize is idempotent", async () => {
    const worker = new FakeWorker(createInitRules());
    const engine = new StockfishEngine(() => worker as unknown as Worker);

    await engine.initialize();
    await engine.initialize();

    expect(worker.posted.filter((cmd) => cmd === "uci")).toHaveLength(1);
  });

  it("sends MultiPV option when multipv > 1", async () => {
    const worker = new FakeWorker(createSearchRules(START_FEN, 15, 2));
    const engine = new StockfishEngine(() => worker as unknown as Worker);

    const result = await engine.analyze(START_FEN, { depth: 15, multipv: 2 });

    expect(worker.posted).toContain("setoption name MultiPV value 2");
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0]?.bestMove).toBe("e2e4");
    expect(result.lines[1]?.bestMove).toBe("d2d4");
  });

  it("returns structured search result", async () => {
    const worker = new FakeWorker(createSearchRules(START_FEN));
    const engine = new StockfishEngine(() => worker as unknown as Worker);

    const result = await engine.analyze(START_FEN, { depth: 15 });

    expect(result.bestMove).toBe("e2e4");
    expect(result.depth).toBe(15);
    expect(result.score).toEqual({ type: "cp", value: 42 });
    expect(result.principalVariation).toEqual(["e2e4", "e7e5", "g1f3"]);
  });

  it("reports progress once per depth", async () => {
    const worker = new FakeWorker(createSearchRules(START_FEN));
    const engine = new StockfishEngine(() => worker as unknown as Worker);
    const depths: number[] = [];

    await engine.analyze(START_FEN, { depth: 15 }, (progress) => {
      depths.push(progress.depth);
    });

    expect(depths).toEqual([10, 15]);
  });

  it("cancels first search when second starts", async () => {
    const worker = new FakeWorker([
      ...createInitRules(),
      { command: "ucinewgame", lines: [] },
      { command: /^position fen/, lines: [] },
      { command: "stop", lines: ["bestmove (none)"] },
      {
        command: /^go depth 12/,
        lines: ["info depth 12 score cp 10 pv d2d4", "bestmove d2d4"],
      },
    ]);
    const engine = new StockfishEngine(() => worker as unknown as Worker);

    const first = engine.analyze(START_FEN, { depth: 15 });
    const second = engine.analyze(START_FEN, { depth: 12 });

    await expect(first).rejects.toBeInstanceOf(EngineAbortedError);
    await expect(second).resolves.toMatchObject({ bestMove: "d2d4" });
    expect(worker.posted).toContain("stop");
  });

  it("destroy sends quit and terminates worker", async () => {
    const worker = new FakeWorker(createInitRules());
    const engine = new StockfishEngine(() => worker as unknown as Worker);

    await engine.initialize();
    engine.destroy();

    expect(worker.posted).toContain("quit");
    expect(worker.terminated).toBe(true);
    expect(engine.status).toBe("destroyed");
  });

  it("times out during initialization", async () => {
    vi.useFakeTimers();

    const worker = new FakeWorker([]);
    const engine = new StockfishEngine(() => worker as unknown as Worker);

    const initPromise = engine.initialize();
    const expectation = expect(initPromise).rejects.toThrow(/Timed out/);
    await vi.advanceTimersByTimeAsync(30_000);
    await expectation;
  });
});
