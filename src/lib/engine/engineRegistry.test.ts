import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  acquireEngine,
  releaseEngine,
  resetEngineRegistryForTests,
} from "@/lib/engine/engineRegistry";
import { createInitRules, FakeWorker } from "@/lib/engine/stockfish/FakeWorker";

describe("engineRegistry", () => {
  beforeEach(() => {
    resetEngineRegistryForTests();
  });

  afterEach(() => {
    resetEngineRegistryForTests();
    vi.useRealTimers();
  });

  it("reuses engine within release delay window", async () => {
    vi.useFakeTimers();

    const factory = vi.fn(() => new FakeWorker(createInitRules()) as unknown as Worker);

    const first = acquireEngine(factory);
    await first.engine.initialize();
    releaseEngine();

    const second = acquireEngine(factory);
    await second.engine.initialize();

    expect(factory).toHaveBeenCalledTimes(1);
    expect(second.engine.status).not.toBe("destroyed");
  });

  it("destroys engine after release delay", async () => {
    vi.useFakeTimers();

    const worker = new FakeWorker(createInitRules());
    const factory = vi.fn(() => worker as unknown as Worker);

    const handle = acquireEngine(factory);
    await handle.engine.initialize();
    releaseEngine();

    await vi.advanceTimersByTimeAsync(250);

    expect(worker.terminated).toBe(true);
  });

  it("keeps engine alive while references remain", async () => {
    vi.useFakeTimers();

    const worker = new FakeWorker(createInitRules());
    const factory = vi.fn(() => worker as unknown as Worker);

    acquireEngine(factory);
    const second = acquireEngine(factory);
    releaseEngine();

    await vi.advanceTimersByTimeAsync(250);

    expect(worker.terminated).toBe(false);
    expect(second.engine.status).not.toBe("destroyed");
  });
});
