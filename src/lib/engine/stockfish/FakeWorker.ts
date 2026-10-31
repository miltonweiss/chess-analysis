type ResponseRule = {
  command: string | RegExp;
  lines: string[];
};

export class FakeWorker {
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  posted: string[] = [];
  terminated = false;

  constructor(private readonly rules: ResponseRule[]) {}

  postMessage(message: string): void {
    if (this.terminated) {
      return;
    }

    this.posted.push(message);

    for (const rule of this.rules) {
      const matches =
        typeof rule.command === "string"
          ? rule.command === message
          : rule.command.test(message);

      if (!matches) {
        continue;
      }

      for (const line of rule.lines) {
        this.onmessage?.({ data: line } as MessageEvent<string>);
      }
      return;
    }
  }

  terminate(): void {
    this.terminated = true;
  }
}

export function createInitRules(): ResponseRule[] {
  return [
    {
      command: "uci",
      lines: ["id name Fake Stockfish", "uciok"],
    },
    {
      command: "isready",
      lines: ["readyok"],
    },
  ];
}

export function createSearchRules(fen: string, depth = 15, multipv = 1): ResponseRule[] {
  const goLines =
    multipv > 1
      ? [
          `info depth ${depth} multipv 1 score cp 42 pv e2e4 e7e5 g1f3`,
          `info depth ${depth} multipv 2 score cp 40 pv d2d4 d7d5 c2c4`,
          "bestmove e2e4 ponder e7e5",
        ]
      : [
          `info depth 10 score cp 20 pv e2e4 e7e5`,
          `info depth ${depth} score cp 42 pv e2e4 e7e5 g1f3`,
          "bestmove e2e4 ponder e7e5",
        ];

  return [
    ...createInitRules(),
    {
      command: /^setoption name MultiPV value/,
      lines: [],
    },
    {
      command: "ucinewgame",
      lines: [],
    },
    {
      command: `position fen ${fen}`,
      lines: [],
    },
    {
      command: /^go /,
      lines: goLines,
    },
    {
      command: "stop",
      lines: ["bestmove e2e4"],
    },
    {
      command: "quit",
      lines: [],
    },
  ];
}
