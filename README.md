# Chess Analysis

Local-first chess analysis app built with Next.js, chess.js, react-chessboard, and Stockfish 19 (WASM).

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000/games](http://localhost:3000/games) to import Chess.com games, or [http://localhost:3000/analyze](http://localhost:3000/analyze) to paste a PGN.

Stockfish worker files are copied to `public/engine/` automatically on install and before dev via `scripts/copy-stockfish.mjs`.

### AI explanations (optional)

Copy `.env.example` to `.env.local` and set `OPENAI_API_KEY`. For development without a key, use `AI_PROVIDER=mock`.

See [docs/ai-explanations.md](docs/ai-explanations.md) for provider architecture and configuration.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start development server |
| `npm run start` | Start production server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest in watch mode |
| `npm run test:run` | Run Vitest once |

## Architecture

See [docs/architecture.md](docs/architecture.md) for stack decisions, folder layout, PGN/replay design, engine worker architecture, and the Phase 3+ roadmap.

## Current scope

**Polish (current)**

- Promotion picker (Q/R/B/N) in play mode
- `/settings` for default depth, MultiPV, Chess.com username, board orientation, AI status, clear local data
- Opening book labels from bundled lichess ECO dataset (`classifier-v2`)
- Opt-in MultiPV 2 equivalent-move detection during game analysis

**Phase 7 + 8**

- Chess.com username import (browser-direct, serialized, cancellable)
- IndexedDB game library at `/games` with search, filters, and sort
- Direct game review at `/games/[id]` with persisted analysis
- Save ad-hoc PGNs from `/analyze` to the library
- Deterministic game IDs and analysis versioning

See [docs/game-library.md](docs/game-library.md).

**Phase 6**


- AI-powered move explanations (on-demand, server-side OpenAI)
- AI game summary from deterministic review data
- Provider abstraction (OpenAI + mock for dev)
- Structured outputs with grounding check
- Perspective selector (White / Black / Neither)
- Client + server caching, rate limiting

**Phase 5**

- Game review dashboard: accuracy per player, classification counts, key moments
- Win-probability-based accuracy model (inspired by Lichess; not Chess.com CAPS)
- Custom SVG evaluation graph (click/hover to navigate)
- Review tabs: Summary, Key Moments, Moves
- Truthful analysis progress (positions + engine depth), cancel and retry
- Terminal checkmate evaluation fix (signed winner on mate positions)

**Phase 4**

- Full-game analysis with move classification (best → blunder)
- Evaluation loss from the moving player's perspective (White/Black correct)
- Classified move list with click-to-inspect move details
- Analyze game progress bar and cancellation
- Reuses Stockfish position cache (no duplicate engine calls for shared FENs)

**Phase 3**

- On-demand Stockfish position analysis (depth 10/15/20/24, default 15)
- Evaluation from White's perspective (+0.43, M3, # for mate on board)
- Best move and principal variation display
- In-memory analysis cache (navigate away and back shows cached result)
- Cancel running analysis; auto-stop on position change
- Terminal checkmate/stalemate handled without engine call

**Phase 2**

- Paste and load PGN locally
- Full game replay with first/previous/next/last controls
- Keyboard navigation (arrow keys, Home, End)
- Move list with click-to-navigate and current-move highlight
- Game metadata display (players, result, event, opening, etc.)
- Read-only board in replay mode; free play on new board

**Phase 1 foundation**

- Interactive chessboard (play mode)
- Stockfish worker + WASM in browser
- Domain types for move analysis (Phase 4 prep)

**Not yet implemented:** incremental Chess.com sync, batch analysis, dashboard, conversational coach, accounts, PGN variations/comments, multi-game PGN import.

See [docs/analysis-model.md](docs/analysis-model.md) for move classification, [docs/accuracy-model.md](docs/accuracy-model.md) for accuracy scoring, [docs/ai-explanations.md](docs/ai-explanations.md) for AI explanations, and [docs/game-library.md](docs/game-library.md) for import and storage.
