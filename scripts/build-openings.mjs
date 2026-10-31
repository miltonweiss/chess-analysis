#!/usr/bin/env node
/**
 * Builds src/lib/openings/openings.json from lichess-org/chess-openings (CC0).
 * Run manually: node scripts/build-openings.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Chess } from "chess.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../src/lib/openings/openings.json");
const BASE =
  "https://raw.githubusercontent.com/lichess-org/chess-openings/master";

const FILES = ["a.tsv", "b.tsv", "c.tsv", "d.tsv", "e.tsv"];

function positionKey(fen) {
  return fen.trim().split(/\s+/).slice(0, 4).join(" ");
}

function epdFromPgn(pgnLine) {
  const chess = new Chess();
  const pgn = `[Event "?"]\n[Site "?"]\n[Date "????.??.??"]\n[Result "*"]\n\n${pgnLine} *`;

  try {
    chess.loadPgn(pgn, { strict: false });
  } catch {
    return null;
  }

  return positionKey(chess.fen());
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

const byKey = new Map();
let skipped = 0;

for (const file of FILES) {
  const text = await fetchText(`${BASE}/${file}`);
  const lines = text.split("\n").slice(1);

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    const [eco, name, pgn] = line.split("\t");
    if (!eco || !name || !pgn) {
      continue;
    }

    const epd = epdFromPgn(pgn.trim());
    if (!epd) {
      skipped += 1;
      continue;
    }

    const existing = byKey.get(epd);
    if (!existing || name.length > existing.name.length) {
      byKey.set(epd, { eco: eco.trim(), name: name.trim(), epd });
    }
  }
}

const openings = [...byKey.values()].sort((a, b) => a.eco.localeCompare(b.eco));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(openings));

console.log(`Wrote ${openings.length} openings to ${OUT} (${skipped} PGN rows skipped)`);
