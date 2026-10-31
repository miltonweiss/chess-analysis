import type { MoveExplanation } from "@/lib/ai/types";

const MOVE_PATTERN =
  /(?:O-O-O|O-O|[KQRBN][a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|[a-h]x?[a-h][1-8](?:=[QRBN])?[+#]?)/g;

function normalizeMoveToken(token: string): string {
  return token.replace(/[+#?!]/g, "").trim();
}

export function extractMoveTokens(text: string): string[] {
  const matches = text.match(MOVE_PATTERN) ?? [];
  return matches
    .map(normalizeMoveToken)
    .filter((m) => {
      if (/^[a-h][1-8]$/.test(m)) return false;
      return m.length >= 2;
    });
}

export function checkGrounding(
  explanation: MoveExplanation,
  allowedMoves: Set<string>,
): { ok: true } | { ok: false; violations: string[] } {
  const allText = [
    explanation.headline,
    explanation.summary,
    explanation.whyItMatters,
    explanation.betterIdea ?? "",
    explanation.lesson,
  ].join(" ");

  const tokens = extractMoveTokens(allText);
  const violations: string[] = [];

  for (const token of tokens) {
    const normalized = normalizeMoveToken(token);
    let found = false;
    for (const allowed of allowedMoves) {
      if (normalizeMoveToken(allowed) === normalized) {
        found = true;
        break;
      }
    }
    if (!found) {
      violations.push(token);
    }
  }

  if (violations.length > 0) {
    return { ok: false, violations: [...new Set(violations)] };
  }
  return { ok: true };
}

export function buildAllowedMoves(ctx: {
  playedSan: string;
  bestSan: string | null;
  bestLineSan: string[];
  afterPlayedLineSan: string[];
  previousMovesSan: string[];
  nextMovesSan: string[];
}): Set<string> {
  const moves = new Set<string>();
  moves.add(ctx.playedSan);
  if (ctx.bestSan) moves.add(ctx.bestSan);
  for (const m of [
    ...ctx.bestLineSan,
    ...ctx.afterPlayedLineSan,
    ...ctx.previousMovesSan,
    ...ctx.nextMovesSan,
  ]) {
    moves.add(m);
  }
  return moves;
}
