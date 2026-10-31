#!/usr/bin/env node
/**
 * Manual AI explanation quality harness.
 * Requires OPENAI_API_KEY or AI_PROVIDER=mock in environment.
 *
 * Usage: node scripts/ai-eval.mjs
 */

const BASE = "http://127.0.0.1:3000";

const FIXTURE = {
  perspective: "neutral",
  ply: 1,
  moveNumber: 1,
  color: "white",
  playedUci: "e2e4",
  bestUci: "e2e4",
  playedWasBest: true,
  isForced: false,
  classification: "best",
  evaluationBefore: { type: "cp", value: 0.2 },
  evaluationAfter: { type: "cp", value: 0.28 },
  evaluationLoss: 0,
  winPercentBefore: 52,
  winPercentAfter: 54,
  fenBefore: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  fenAfter: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  bestLine: ["e2e4"],
  afterPlayedLine: ["e7e5"],
  engineDepth: 15,
  previousMoves: [],
  nextMoves: ["e7e5"],
};

const CHECKLIST = [
  "Factually correct",
  "References actual position",
  "Describes engine line correctly",
  "No invented tactics",
  "Cause and effect",
  "Useful lesson",
  "Concise",
];

async function main() {
  console.log("AI Evaluation Harness\n");

  const statusRes = await fetch(`${BASE}/api/ai/status`);
  const status = await statusRes.json();
  console.log(`Provider: ${status.provider}, Model: ${status.model}, Configured: ${status.configured}\n`);

  if (!status.configured) {
    console.error("AI not configured. Set OPENAI_API_KEY or AI_PROVIDER=mock.");
    process.exit(1);
  }

  const res = await fetch(`${BASE}/api/ai/explain-move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ context: FIXTURE }),
  });

  const result = await res.json();

  if (!result.ok) {
    console.error("Error:", result.error);
    process.exit(1);
  }

  const exp = result.data;
  console.log("--- Generated Explanation ---");
  console.log(`Headline: ${exp.headline}`);
  console.log(`Summary: ${exp.summary}`);
  console.log(`Why it matters: ${exp.whyItMatters}`);
  console.log(`Better idea: ${exp.betterIdea ?? "n/a"}`);
  console.log(`Lesson: ${exp.lesson}`);
  console.log(`Clarity: ${exp.reasonClarity}`);
  console.log(`Cached: ${result.meta.cached}\n`);

  console.log("--- Checklist (manual review) ---");
  for (const item of CHECKLIST) {
    console.log(`[ ] ${item}`);
  }
}

main().catch(console.error);
