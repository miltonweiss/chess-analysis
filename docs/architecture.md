# Chess Analysis Architecture

Phase 1 established the local-first foundation. Phase 2 adds PGN import, deterministic position timelines, and full game replay. Phase 3 adds a working local Stockfish analysis pipeline. Phase 4 adds move-level analysis: evaluation loss, deterministic classification, and full-game sequential analysis. Phase 5 adds a pure review layer (accuracy, key moments, evaluation timeline, `GameReview` aggregate) and a dashboard UI with a custom SVG evaluation graph — still without LLM.

## 1. Technology stack

| Package | Version | Purpose |
| --- | --- | --- |
| next | 16.3.8 | App Router, routing, bundling |
| react | 19.2.8 | UI rendering |
| react-dom | 19.2.8 | DOM rendering |
| typescript | ^5 | Static typing |
| tailwindcss | ^4 | Utility styling |
| chess.js | 1.4.0 | Rules, FEN, PGN, move validation |
| react-chessboard | 5.12.1 | Interactive chessboard UI |
| stockfish | 19.0.0 | Stockfish 19 WASM engine binaries |
| vitest | 4.1.11 | Unit tests for pure domain/engine parsing logic |

No state-management library, database, authentication, or API framework is included in Phase 1.

## 2. Why each dependency exists

- **chess.js**: canonical source of truth for legal moves, FEN, PGN, and game termination.
- **react-chessboard**: production-ready drag-and-drop board with orientation, square highlights, and future arrow support.
- **stockfish**: official Chess.com/nmrugg WASM build of Stockfish 19. Only the lite-single flavor is copied to `public/engine/` for browser use.
- **vitest**: fast unit testing for pure modules without browser overhead.

## 3. Folder structure

```text
src/
  app/                     Next.js routes
  components/
    analysis/              Workspace shell
    review/                Game review dashboard, evaluation graph
    ai/                    Move explanation and game summary cards
    chess/                 Board, move list, replay controls, PGN import, metadata
    ui/                    Shared UI primitives
  hooks/                   React hooks bridging UI to domain/engine
  lib/
    chess/                 Game state, PGN helpers, types
    engine/                Engine abstraction, UCI parsing, cache, analyzePosition, registry
    analysis/              Move analysis, classification, game pipeline
    review/                Accuracy, key moments, GameReview aggregate
    ai/                    LLM explanations, providers, prompts, cache
scripts/
  copy-stockfish.mjs       Copies engine binaries to public/engine/
docs/
  architecture.md          This document
public/
  engine/                  Generated Stockfish worker + wasm (gitignored)
```

Types live next to their modules instead of a global `types/` folder to avoid premature abstraction.

## 4. Client/server boundaries

### Client

- Chessboard rendering and interaction
- Game state and move replay cursor
- Stockfish Web Worker and WASM
- On-demand position analysis (`AnalysisPanel` + `useChessEngine`)
- In-memory analysis cache (LRU, keyed by FEN + settings)

### Server

- Static/dynamic route rendering (`/`, `/analyze`, `/games`, `/games/[id]`)
- AI route handlers only (`/api/ai/*`) — no game data backend

### Future server responsibilities

- LLM explanation proxy (keeps API keys off the client)
- User accounts and persistent game history
- Optional cloud analysis or analytics

Game data stays client-side (IndexedDB). Chess.com import uses the public API directly from the browser.

## 5. Chess state architecture

### Source of truth (stored)

```ts
{
  initialFen: string
  moves: ChessMove[]
  cursor: number        // current ply (0 = starting position)
  metadata: GameMetadata
  mode: "play" | "replay"
  pgn?: string
}
```

### Derived (never stored)

```ts
timeline = buildTimeline(initialFen, moves)  // length = moves.length + 1
currentPosition = timeline[cursor]
currentFen = currentPosition.fen
```

The timeline is memoized in `useChessGame` and rebuilt only when `moves` or `initialFen` change. Replay navigation is O(1) array access.

Each `GamePosition` references an existing `ChessMove` (or `null` at ply 0) instead of duplicating SAN/UCI fields.

### Modes

| Mode | Entered by | Board interaction |
| --- | --- | --- |
| `play` | default / New board | dragging allowed, moves mutate state |
| `replay` | PGN import (`LOAD_GAME`) | read-only, dragging disabled |

Future: `analysis` mode for editing variations (not implemented).

### PGN data flow

```text
PGN text
  -> parsePgn() -> PgnParseResult
  -> LoadedGame { initialFen, moves, metadata, pgn }
  -> gameReducer(LOAD_GAME)
  -> GameState (mode: replay)
  -> buildTimeline()
```

`LoadedGame` is serializable and designed for future URL/persistence layers (`/analyze?game=<id>`, `/games/[id]`) without changing the reducer.

### Navigation actions

`FIRST`, `PREVIOUS`, `NEXT`, `LAST`, `GOTO { ply }` only change `cursor`. Moves are never deleted during replay.

In `play` mode, `MAKE_MOVE` after navigating backward truncates the future line (standard chess app behavior).

### Draw detection

Position status is computed from the current FEN via chess.js. Threefold repetition is detected by counting matching position keys (first four FEN fields) in the timeline up to the current ply.

Each `ChessMove` stores `fenBefore`, `fenAfter`, SAN, UCI, ply, and color so Phase 3 engine analysis can attach results keyed by ply.

## 6. Stockfish architecture

```text
AnalysisPanel (React)
  -> useChessEngine()
  -> engineRegistry (ref-counted singleton)
  -> analyzePosition()
  -> ChessEngine interface
  -> StockfishEngine (UCI dispatch + parsing)
  -> uci.ts (pure parser)
  -> Web Worker (/engine/stockfish-19-lite-single.js)
  -> WASM (/engine/stockfish-19-lite-single.wasm)
```

React components never talk to Stockfish or raw UCI directly.

### Deliberate deviation: worker vs parser placement

The Stockfish npm build **is** the Web Worker — it detects worker scope, installs its own `onmessage`, accepts UCI strings via `postMessage`, and returns each output line the same way. A separate wrapper worker is **not** used.

UCI parsing and evaluation normalization live in the **engine service layer** on the main thread (`StockfishEngine`, `uci.ts`, `analyzePosition.ts`). This is cheap string processing; React only sees structured `EngineAnalysis` objects. Rationale: fewer moving parts, no double-worker indirection, and the minified Stockfish script already handles WASM loading and search queuing internally.

### Selected build

**`stockfish-19-lite-single`**

- JS loader: ~21 KB
- WASM: ~1.79 MB
- Single-threaded, no COOP/COEP headers required
- Recommended by the package author for most browser projects
- Still far stronger than any human

### Alternatives considered

| Flavor | Size | Notes |
| --- | --- | --- |
| full multi-thread | ~99 MB WASM | Strongest, requires cross-origin isolation headers |
| full single-thread | ~99 MB WASM | Strong, slow initial load |
| lite multi-thread | ~1.6 MB WASM | Needs COOP/COEP |
| asm.js fallback | ~3 MB JS | Slowest, compatibility fallback only |

To upgrade later, copy a different flavor in `scripts/copy-stockfish.mjs` and optionally add headers in `next.config.ts`.

## 7. Web Worker and UCI lifecycle

Per-search sequence (after one-time init):

1. `ucinewgame` (first analysis only)
2. `position fen <fen>`
3. `isready` -> wait for `readyok`
4. `go depth N` or `go movetime T`
5. parse `info` lines during search (once per line, once per new depth for progress)
6. parse `bestmove`
7. `stop` cancels active search; wait for discarded `bestmove` before starting the next search

Init sequence (once per worker):

1. `uci` -> wait for `uciok`, capture `id name` / `id author`
2. `isready` -> wait for `readyok`

Teardown: `quit` + `worker.terminate()` on destroy.

### Lifecycle and race handling

- **`engineRegistry`**: ref-counted singleton engine + shared `AnalysisCache`. `acquireEngine()` / `releaseEngine()` with a 250 ms delayed destroy on last release. React Strict Mode mount/unmount/remount therefore reuses **one** worker — no spurious "Engine destroyed" init error.
- **Single message dispatcher** in `StockfishEngine`: each incoming line is routed once; the Phase 1 double-parse bug is fixed.
- **Cancel A, run B**: a new `analyze()` call (or `AbortSignal`) stops search A, drains A's `bestmove`, rejects A with `EngineAbortedError`, clears pending command waits, then starts B.
- **Navigation cancellation**: `useChessEngine(currentFen)` stops a running search when FEN changes; results apply only if `result.fen === currentFen`.
- **Progress throttling**: `onProgress` fires once per new depth (~15–25 React updates per search), not on every `info` line.
- Initialization and command waits have timeouts (30 s init, 60 s search).

## 8. Analysis pipeline (Phase 3)

### Settings

Centralized in `src/lib/engine/settings.ts`:

- `DEFAULT_ANALYSIS_SETTINGS = { depth: 15 }`
- `DEPTH_OPTIONS = [10, 15, 20, 24]`
- `analysisCacheKey(fen, settings)` — the only places depth defaults are defined

### Evaluation convention

Raw UCI scores (`UciScore`) stay **side-to-move relative** and in **centipawns** inside the engine layer only.

Public `Evaluation` (White's perspective):

| Type | Meaning | Example display |
| --- | --- | --- |
| `{ type: "cp", value: number }` | Pawns; positive = White better | `+0.43`, `-1.30` |
| `{ type: "mate", value: number }` | Mate in N; positive = White mates | `M3`, `-M2`, `#` (mate on board) |

`normalizeEvaluation(score, sideToMove)` converts cp/100 and flips sign when Black is to move. `formatEvaluation()` renders UI strings.

### Terminal positions (no engine call)

Detected with chess.js in `analyzePosition()` before Stockfish runs:

| Position | `evaluation` | `terminal` | `bestMove` |
| --- | --- | --- | --- |
| Checkmate | `{ type: "mate", value: 0 }` + `winner` | `"checkmate"` | `null` |
| Stalemate | `{ type: "cp", value: 0 }` | `"stalemate"` | `null` |

### `analyzePosition()` flow

1. Validate FEN
2. Return cached result if present (`source: "cache"`)
3. Return terminal result if checkmate/stalemate (`source: "terminal"`)
4. Call `engine.analyze()`, normalize to White POV (`source: "engine"`)
5. Cache completed, non-aborted results only

### Cache

`AnalysisCache` — in-memory LRU (`Map`), max 500 entries, key = FEN + depth/movetime. Owned by `engineRegistry`, shared across hook instances in one session.

### UI

`AnalysisPanel` (replaces Phase 1 `EngineStatus`): engine status, position label, depth select, Analyze/Stop, live progress, result (eval, best move, PV, cached badge). No automatic analysis — user clicks **Analyze position**.

## 9. Current routes

| Route | Status | Purpose |
| --- | --- | --- |
| `/` | Implemented | Landing page with link to workspace |
| `/analyze` | Implemented | Main analysis workspace |
| `/api/ai/explain-move` | Implemented | AI move explanation (POST) |
| `/api/ai/summarize-game` | Implemented | AI game summary (POST) |
| `/api/ai/status` | Implemented | AI configuration status (GET) |
| `/games` | Implemented | Chess.com import + saved game library |
| `/games/[id]` | Implemented | Individual saved game review |
| `/settings` | Implemented | Preferences, engine options, AI status, clear local data |

## 10. Move analysis pipeline (Phase 4)

See also [docs/analysis-model.md](analysis-model.md) for classifier details.

```text
PGN → timeline → analyzeGame()
  for each move:
    engineBefore = analyzePosition(fenBefore)  // cache
    engineAfter  = analyzePosition(fenAfter)   // cache; overlaps next move
    evaluationLoss = compareEvaluations(before, after, color)
    classification = classifyMove(...)
  → GameAnalysis { moves[], settings }
  → buildGameReview() → GameReview
```

### Evaluation perspective

All evaluations are White-POV (`Evaluation`). Loss from the moving player:

```text
White: loss = before − after
Black: loss = after − before
```

Mate scores map to centipawn-equivalent sort keys — not treated as ordinary pawns.

### Classification

Configurable thresholds in `src/lib/analysis/settings.ts`. Labels: `forced`, `best`, `excellent`, `good`, `inaccuracy`, `mistake`, `blunder`. Opening `"book"` is reserved for future metadata.

### UI (Phase 4)

- **Analyze game** — sequential pipeline with progress bar and cancel
- **Move detail** — eval before/after, loss, best move SAN when a classified move is selected

## 11. Game review (Phase 5)

See [docs/accuracy-model.md](accuracy-model.md) for formulas.

```text
GameAnalysis.moves
  → winProbability (White POV, mate caps)
  → calculatePlayerAccuracy (per player)
  → detectKeyMoments
  → buildEvaluationTimeline
  → buildGameReview
  → useGameReview (React memo)
  → ReviewSummary / KeyMomentsList / EvaluationGraph / MoveList
```

### GameReview model

`GameReview` = metadata, white/black `PlayerReview` (accuracy + counts), key moments, evaluation timeline, biggest mistake/missed opportunity/best move highlight, biggest swing, higher accuracy.

`PlayerReview` replaces Phase 4's removed `PlayerAnalysis` — single representation, no duplicate stats.

### Accuracy

Win-probability-based model inspired by Lichess published formulas. **Not** Chess.com CAPS. Configurable in `src/lib/review/settings.ts`.

### Key moments

Deterministic heuristics on win% swing (mate, blunder, missed win, turning point). At most one moment per move, priority-ordered.

### Evaluation graph

Custom responsive SVG (`EvaluationGraph.tsx`) — no chart library. Y-axis via win%, mate clamping, hover tooltip, click → `goToPly`. Max ~250 points.

### UI layout

- **Left:** board, replay controls, evaluation graph
- **Right:** review header (accuracies), tabs [Summary | Key Moments | Moves], selected move panel
- **Collapsed:** Phase 3 single-position `AnalysisPanel` under "Engine"
- **Single cursor:** `game.state.cursor` — graph, move list, key moments, board all read/write via `goToPly`

### Cancellation policy

Cancel discards partial game analysis results. Shared `AnalysisCache` is kept — re-run resumes almost instantly from cached positions.

## 12. AI explanations (Phase 6)

See [docs/ai-explanations.md](ai-explanations.md) for full details.

```text
GameReview → Context builder → aiClient → API route → AI service
  → Prompt modules → ChessExplanationProvider → OpenAI Responses API
  → Grounding check → MoveExplanationCard / GameSummaryCard
```

- LLM is downstream of objective analysis — never classifies moves
- OpenAI Responses API with structured outputs (`zodTextFormat`)
- Default model: `gpt-6-luna` (configurable)
- Mock provider for dev/tests (`AI_PROVIDER=mock`)
- Client + server LRU cache, rate limiting, grounding check
- Perspective selector: White / Black / Neither

## 13. Game library (Phases 7 + 8)

See [docs/game-library.md](game-library.md).

```text
Chess.com API → importChessComGames → gameRepository → IndexedDB
/games → list/filter/sort StoredGame (PGNs in separate store)
/games/[id] → AnalysisWorkspace(initialGame, initialAnalysis, gameId)
Analysis complete → saveAnalysis(AnalysisVersion + summary)
```

### Phase 9+ (not implemented)

- Incremental Chess.com sync, batch analysis queue
- Dashboard, conversational coach

## 14. Important technical decisions

- **`src/` layout** keeps application code separate from repo config.
- **Reducer-based game state** avoids premature global state libraries and matches PGN replay needs.
- **Engine abstraction (`ChessEngine`)** makes Stockfish replaceable.
- **Static engine assets in `public/engine/`** avoids fragile bundling of emscripten worker scripts.
- **Auto-queen promotion** simplifies board interaction in play mode; promotion picker comes later.
- **Timeline derived from moves** avoids redundant FEN storage and keeps replay fast.
- **Result-based PGN parsing** (`PgnParseResult`) keeps UI free of try/catch and enables friendly error messages.
- **Keyboard replay** via `useReplayKeyboard`, disabled while focus is in form fields.
- **Vitest in node environment** tests pure logic with injected `FakeWorker` factories; real Stockfish is verified manually in the browser.
- **Ref-counted engine registry** avoids Strict Mode double-worker bugs without global mutable singletons in React.
- **Terminal position short-circuit** avoids pointless WASM round trips for mate/stalemate.

## 15. Known limitations

- Play mode supports underpromotion via an on-board picker; replay remains read-only.
- Main line only: PGN comments and variations are ignored by chess.js.
- One game per import; multi-game PGN files are not supported.
- Library games and analysis persist in IndexedDB; ad-hoc `/analyze` sessions are ephemeral until saved.
- Full-game analysis is sequential; persisted analysis reloads without re-running Stockfish.
- Accuracy depends on engine depth; it is a review metric, not a rating.
- Full games at depth 15+ can take minutes in WASM — progress and cancel are required.
- Pure eval-loss classifier — limitations in already-winning positions (see analysis-model.md).
- One Stockfish worker instance per app session (shared via registry).
- Lite network is weaker than the full Stockfish 19 network.

## 16. Keyboard controls

| Key | Action |
| --- | --- |
| Left arrow | Previous move |
| Right arrow | Next move |
| Home | First position |
| End | Last position |

Disabled when focus is inside inputs/textareas (e.g. PGN paste field).

## 17. PGN error codes

| Code | Meaning |
| --- | --- |
| `empty` | No text pasted |
| `syntax` | Invalid PGN syntax |
| `illegal-move` | Move illegal in context |
| `invalid-fen` | Bad FEN header |
| `no-moves` | No moves found |

## 18. Stockfish licensing implications

Stockfish.js 19 is licensed under **GPL-3.0** (see `public/engine/Copying.txt` after install).

Implications:

- The engine is distributed as a separate WASM program invoked through the UCI text protocol.
- Source and license text must remain available when distributing the engine binary.
- If this project is distributed commercially as closed source, consult legal counsel about GPL compliance options (source release, separate distribution, alternative engine, etc.).

Official source: [https://github.com/nmrugg/stockfish.js](https://github.com/nmrugg/stockfish.js)

## Testing strategy

Current tests (155+):

- openings: ECO lookup, book ply streaks

- game library: gameId, filters, chess.com client/import/normalize, IndexedDB repository

- legal/illegal move handling, replay navigation, PGN parse/round-trip, position timeline
- UCI parsing, `AnalysisCache`, `analyzePosition`, `StockfishEngine`, `engineRegistry`
- evaluation loss (White/Black, cp/mate), classification thresholds, UCI→SAN
- `analyzeGame`: full PGN pipeline, cache reuse across moves
- review layer: win probability, accuracy, key moments, evaluation timeline, `buildGameReview`
- terminal checkmate winner/sign fix
- AI layer: context builders, schemas, prompts, grounding, mock provider, service, eval fixtures

Future tests:

- browser E2E for game analysis and worker readiness

Run tests:

```bash
npm run test:run
```
