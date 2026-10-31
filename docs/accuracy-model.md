# Accuracy Model (Phase 5)

This document describes how the app computes **move accuracy** and **game accuracy**. This is our own transparent model, inspired by [Lichess's published accuracy approach](https://lichess.org/page/accuracy). It is **not** Chess.com's proprietary CAPS algorithm.

## Why win probability?

Raw centipawn loss treats all pawns equally. Win probability is:

- **Bounded** (0–100%)
- **Nonlinear** — `-8 → -9` barely changes chances; `0 → -1` is a visible drop
- **Position-relative** — the same pawn loss means more in equal positions than in already-lost ones

Mate scores are capped to a large centipawn value before the win% step so they cannot blow up the formula.

## Inputs

Per move (from Phase 4 `MoveAnalysis`):

- `evaluationBefore`, `evaluationAfter` — White POV `Evaluation`
- `engineBefore`, `engineAfter` — optional terminal context (`winner` on checkmate)

Accuracy reads **evaluations only**, never classification labels. Classification and accuracy stay independent.

## Win probability

Centipawns (mates capped at ±10,000) map through a sigmoid (White POV):

```text
Win% = 50 + 50 × (2 / (1 + exp(-slope × cp)) − 1)
```

Default `slope = 0.00368208` (Lichess-published constant).

For a player's perspective:

```text
playerWin% = Win%           (White)
playerWin% = 100 − Win%     (Black)
```

Terminal checkmate resolves to 100% / 0% for the winner/loser via `EngineAnalysis.winner`.

## Move accuracy

From the **mover's** win% before and after:

```text
drop = max(0, winBefore − winAfter)

moveAccuracy = A × exp(−K × drop) + B + uncertaintyBonus
```

Defaults (Lichess-published coefficients):

| Constant | Value |
| --- | --- |
| A | 103.1668 |
| K | 0.04354 |
| B | −3.1669 |
| uncertaintyBonus | 1 |

Result clamped to **0..100**. No drop → ~100.

## Game accuracy

For each player, aggregate move accuracies with two means, then average:

1. **Volatility-weighted mean** — sliding window over win% series; window size `clamp(floor(moves/10), 2, 8)`; weight `clamp(stddev(win% in window), 0.5, 12)`
2. **Harmonic mean** of move accuracies

```text
gameAccuracy = (volatilityWeightedMean + harmonicMean) / 2
```

Clamped to 0..100. Empty move list → score 100 with `isEmpty: true` (UI shows "n/a").

## Mate handling

| Case | Behavior |
| --- | --- |
| Mate +N in evaluation | Capped to ±10,000 cp before sigmoid |
| Terminal checkmate on board | `winner` on `EngineAnalysis` → 100% / 0% win |
| Own mate +3 → +1 | Tiny win% drop → accuracy stays ~100 |
| Own mate lost / opponent mate allowed | Large win% drop → low accuracy |

## Edge cases

- **Already winning** (`+8 → +7`): small win% change, small accuracy penalty — by design
- **Extreme inputs**: output always clamped 0..100
- **Short games** (1–2 moves): window size uses minimum of 2
- **Engine depth**: accuracy depends on analysis depth and network strength

## Key moments (related)

Key moments use the same win% mapping with separate thresholds (see `src/lib/review/keyMoments.ts`):

1. Mate missed / allowed
2. Blunder — win% drop ≥ 20 and classification mistake/blunder
3. Missed win — win% before ≥ 75, drop ≥ 15 or after ≤ 65
4. Turning point — lead crosses 50% with swing ≥ 15

## Configuration

All constants live in `src/lib/review/settings.ts` (`DEFAULT_REVIEW_SETTINGS`).

## Known limitations

- Accuracy is a **review metric**, not a player rating
- Depends on engine depth and the lite Stockfish network
- No MultiPV — "best move" highlights are heuristic
- No opening book
- Analysis lives in memory only
- Full games at depth 15+ can take minutes in single-threaded WASM

## Determinism

Same `MoveAnalysis[]` + same settings → same accuracy and key moments. No randomness.
