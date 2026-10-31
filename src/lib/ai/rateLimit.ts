type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export class RateLimiter {
  private entries = new Map<string, RateLimitEntry>();
  private readonly maxPerMinute: number;

  constructor(maxPerMinute: number) {
    this.maxPerMinute = maxPerMinute;
  }

  check(key: string): boolean {
    const now = Date.now();
    const entry = this.entries.get(key);

    if (!entry || now >= entry.resetAt) {
      this.entries.set(key, { count: 1, resetAt: now + 60_000 });
      return true;
    }

    if (entry.count >= this.maxPerMinute) {
      return false;
    }

    entry.count += 1;
    return true;
  }

  reset(): void {
    this.entries.clear();
  }
}
