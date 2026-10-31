# Move Analysis Model (Phase 4)

This document describes the deterministic move classifier used in Phase 4. It is separate from future opening-book metadata and accuracy scoring (Phase 5).

## Evaluation convention

All public evaluations use **White's perspective**:

| Form | Meaning |
| --- | --- |
| `{ type: "cp", value: +0.43 }` | White is better by 0.43 pawns |
| `{ type: "cp", value: -1.20 }` | Black is better by 1.20 pawns |
| `{ type: "mate", value: +3 }` | White mates in 3 |
| `{ type: "mate", value: -2 }` | Black mates in 2 |
| `{ type: "mate", value: 0 }` | Checkmate on the board (resolve winner via `EngineAnalysis.winner`) |

Raw UCI scores remain side-to-move relative inside the engine layer only.

## Evaluation loss

Loss measures how much the **moving player** worsened their position.

```text
White: loss = evalBefore − evalAfter
Black: loss = evalAfter − evalBefore
```

Both `evalBefore` and `evalAfter` are already White-POV values from Phase 3.

### Worked examples

**White blunders:**

```text
Before: +0.50
After:  −1.00
Loss:    1.50
```

**Black blunders:**

```text
Before: −0.50   (Black slightly better)
After:  +1.00   (White much better)
Loss:    1.50
```

### Internal comparison

For ordering and mate handling, evaluations map to centipawn-equivalent sort keys (`evaluationToCentipawns`):

- `cp`: `value × 100`
- `mate +N`: `100_000 − N` (shorter White mates rank higher)
- `mate −N`: `−100_000 + N` (shorter Black mates rank lower)

Loss is clamped to `≥ 0`.

## Mate transitions

Mate scores are **not** treated as ordinary pawns. Examples:

| Before | After | White loss | Notes |
| --- | --- | --- | --- |
| mate +3 | mate +1 | 0 | Faster own mate is never penalized |
| mate +1 | mate +3 | ~0.02 | Delaying own mate is a small loss (mate-delay rule) |
| mate +3 | mate −1 | ~2000 | Allowing opponent mate is catastrophic |
| +5.0 cp | mate −3 | ~2000+ | Thrown away winning position |

These mappings are approximate but monotonic — sufficient for threshold classification.

## Move analysis pipeline

For each played move:

1. `engineBefore = analyzePosition(fenBefore)` — cached
2. `engineAfter = analyzePosition(fenAfter)` — cached; overlaps with the next move's `fenBefore`
3. `evaluationLoss = compareEvaluations(before, after, color)`
4. `bestMove` / `bestMoveSan` from `engineBefore`
5. `classification = classifyMove(...)`

Unique positions analyzed per game: **`moves.length + 1`** (starting position + each resulting position), but cache reduces engine calls to one per unique FEN.

## Classification

Engine-quality labels (including `"book"` from the bundled lichess ECO dataset):

| Label | When |
| --- | --- |
| `forced` | Only one legal move before the played move |
| `brilliant` | Top engine move sacrificing a piece where the player remains equal/winning |
| `great` | Top engine move that is the only viable move (second line drops win% by ≥ 10%) |
| `best` | Played UCI matches engine top move, or loss ≤ 0.01 |
| `excellent` | Loss ≤ 0.10 (or ≤ 0.05 engine-equivalent band) |
| `good` | Loss ≤ 0.25 |
| `inaccuracy` | Loss ≤ 0.50 |
| `mistake` | Loss ≤ 1.00 |
| `miss` | Failure to punish opponent's mistake / blunder in previous move |
| `blunder` | Loss > 1.00 |
| `book` | Position before the move is in the local opening index (leading book streak) |

### Default thresholds (pawns)

Configured in `src/lib/analysis/settings.ts`:

```text
excellentMaxLoss:  0.10
goodMaxLoss:       0.25
inaccuracyMaxLoss: 0.50
mistakeMaxLoss:    1.00
```

These are inspired by common centipawn-loss buckets (Chess.com / Lichess) but simplified for transparency. They are **not** copied verbatim and should be tuned with real games.

### Design notes

- **Top move match** always yields `best`, even if eval noise exists.
- **Near-equal moves** with loss ≤ 0.05 are `excellent`, not punished for missing MultiPV line 1.
- **MultiPV** (opt-in, MultiPV 2) marks played moves as `best` when they match an engine line within the engine-equivalent loss band (≤ 0.05 pawns vs line 1).
- **Book moves** skip accuracy and key-moment detection; re-run analysis after upgrading to `classifier-v2` to refresh stored games.
- **Already-winning positions** (`+8 → +7`) produce small loss values — a known limitation of pure eval-delta classifiers. Documented, not over-engineered in Phase 4.

## UCI → SAN

Best moves are converted with `chess.js` from `fenBefore` — no custom SAN parser.

## Cancellation

Game analysis uses `AbortSignal`:

1. User clicks **Cancel analysis**
2. AbortController fires → current `analyzePosition` throws `EngineAbortedError`
3. Pipeline throws `GameAnalysisAbortedError`
4. `engine.stop()` drains the active Stockfish search
5. Engine returns to `ready`; partial results are discarded (position cache is kept for fast re-run)

## Terminal checkmate (Phase 5 fix)

When the board is checkmate, `analyzePosition` returns `{ type: "mate", value: 0 }` with `terminal: "checkmate"` and `winner` set from the side **not** to move (the mated player). `evaluationToCentipawns` uses `winner` to map terminal mate to ±`MATE_SCORE_BASE`, so delivering mate does not produce a spurious huge evaluation loss.

## Known limitations

- No opening book / `"book"` metadata
- No MultiPV equivalent-move detection
- No special handling for sacrifices or "only move" tactics beyond forced-move detection
- Analysis lives in memory only — page refresh clears game analysis (engine position cache also clears)
- Sequential analysis only — one Stockfish search at a time

## Determinism

Same PGN + same depth settings → same classifications. No randomness, no LLM involvement.
