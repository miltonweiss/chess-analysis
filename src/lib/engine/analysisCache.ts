import { analysisCacheKey, type AnalysisSettings } from "@/lib/engine/settings";
import type { EngineAnalysis } from "@/lib/engine/types";

const DEFAULT_MAX_ENTRIES = 500;

export class AnalysisCache {
  private readonly entries = new Map<string, EngineAnalysis>();
  private readonly maxEntries: number;

  constructor(maxEntries = DEFAULT_MAX_ENTRIES) {
    this.maxEntries = maxEntries;
  }

  get(fen: string, settings: AnalysisSettings): EngineAnalysis | undefined {
    return this.entries.get(analysisCacheKey(fen, settings));
  }

  has(fen: string, settings: AnalysisSettings): boolean {
    return this.entries.has(analysisCacheKey(fen, settings));
  }

  set(fen: string, settings: AnalysisSettings, result: EngineAnalysis): void {
    const key = analysisCacheKey(fen, settings);
    if (this.entries.has(key)) {
      this.entries.delete(key);
    }
    this.entries.set(key, result);

    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (!oldestKey) {
        break;
      }
      this.entries.delete(oldestKey);
    }
  }

  clear(): void {
    this.entries.clear();
  }

  get size(): number {
    return this.entries.size;
  }
}
