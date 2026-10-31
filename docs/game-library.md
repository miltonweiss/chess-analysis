# Game Library (Phases 7 + 8)

Local-first game storage and Chess.com import.

## Overview

```text
Chess.com API (browser fetch, serial)
  → normalize + dedupe
  → IndexedDB (games, pgns, analyses, sync)
  → /games library UI
  → /games/[id] review (AnalysisWorkspace)
```

## Storage

| Store | Contents |
| --- | --- |
| `games` | Light list records (`StoredGame`) with denormalized analysis summary |
| `pgns` | Full PGN text keyed by `gameId` |
| `analyses` | Full `GameAnalysis` + `AnalysisVersion` + summary |
| `sync` | Chess.com sync metadata (archives, ETags) for Phase 9 |

Preferences (`localStorage`): Chess.com username, library filter/sort state.

## Game IDs

- **Chess.com:** `chess.com:live:{id}` or `chess.com:daily:{id}` from game URL
- **PGN / manual:** `pgn:{sha256}` from headers + main-line UCI moves

Re-import is idempotent — same id is never duplicated.

## Chess.com import

- Public API called directly from the browser (`access-control-allow-origin: *`)
- Requests are **serialized** (Chess.com rate-limits parallel requests)
- 429 responses retry with exponential backoff
- Monthly archives fetched **newest first**
- Incremental sync uses `lastSyncedAt`: only months from that month through today are requested (a fetch last week hits the current month; one from 3 months ago hits those three plus the current month)
- The current month is always fetched without ETag so newly finished games are not missed
- Older months in the window still use ETag / 304
- Variants (`rules !== "chess"`) and invalid PGNs are skipped with counts
- Import is cancellable via `AbortSignal`
- Sync record stores `lastSyncedAt` plus per-archive ETag/Last-Modified

## Analysis persistence

When reviewing a library game (`/games/[id]`):

1. Existing analysis loads from IndexedDB into `useGameAnalysis`
2. New analysis runs through Stockfish as usual
3. On completion, analysis is saved with `AnalysisVersion` (`classifier-v1`, `accuracy-v1`, engine name, depth)
4. Summary (accuracies, classification counts) is denormalized onto `StoredGame` for list sorting

## Routes

| Route | Purpose |
| --- | --- |
| `/games` | Import form + searchable/filterable library |
| `/games/[id]` | Full game review for a stored game |
| `/analyze` | Ad-hoc PGN analysis + **Save to library** |

## Privacy

- Imported games and analysis stay in IndexedDB on your device
- Only Chess.com public API calls leave the browser (plus explicit AI requests when you click Explain/Summary)

## Deferred (Phase 9+)

- Batch analysis queue
- Export / import backup
- Dashboard aggregations
