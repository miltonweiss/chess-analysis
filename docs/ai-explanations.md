# AI Explanations (Phase 6)

Phase 6 adds on-demand AI explanations downstream of the deterministic GameReview. Stockfish and the review system remain authoritative — the LLM explains, never classifies.

## Architecture

```text
GameReview + MoveAnalysis
    → Context builder (client, pure)
    → aiClient (fetch + client cache)
    → POST /api/ai/explain-move | summarize-game
    → AI service (validate, verify, rate limit, server cache)
    → Prompt modules (versioned)
    → ChessExplanationProvider
    → OpenAI Responses API (structured output)
    → Grounding check
    → Structured response → UI
```

## Provider

- **Interface:** `ChessExplanationProvider` in `src/lib/ai/providers/types.ts`
- **Implemented:** OpenAI (`OpenAiProvider`) and Mock (`MockProvider` for dev/tests)
- **API:** OpenAI Responses API with `responses.parse()` and `zodTextFormat`
- **Default model:** `gpt-6-luna` (configurable via `OPENAI_MODEL`)
- **Reasoning effort:** `medium` default via `OPENAI_REASONING_EFFORT`

## Configuration

Copy `.env.example` to `.env.local`:

```text
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-6-luna
OPENAI_REASONING_EFFORT=medium
AI_PROVIDER=openai
AI_REQUEST_TIMEOUT_MS=60000
AI_RATE_LIMIT_PER_MINUTE=20
```

For development without an API key: `AI_PROVIDER=mock`

Secrets are server-side only — never prefixed with `NEXT_PUBLIC_`.

## Input schema

Move explanations receive `MoveExplanationContextInput`: perspective, ply, moves (UCI), classifications, evaluations, FENs, engine lines, surrounding moves. No PGN headers or player names.

Game summaries receive `GameSummaryContextInput`: result, accuracies, classification counts, key moments, trajectory sample, optional sanitized opening name.

## Output schema

**MoveExplanation:** `headline`, `summary`, `whyItMatters`, `betterIdea`, `lesson`, `reasonClarity`

**GameSummary:** `headline`, `overview`, `turningPoint`, `mainStrength`, `mainWeakness`, `keyLesson`

No classification or evaluation fields in output — the UI renders those from `MoveAnalysis`.

## Prompt strategy

- Static system instructions (never interpolated with user data)
- User message with labeled JSON blocks: `ENGINE_DATA`, `GAME_DATA`
- PGN metadata only in `UNTRUSTED_GAME_DATA` (JSON-encoded, sanitized)
- Prompt versions: `MOVE_EXPLANATION_PROMPT_VERSION = "v1"`, `GAME_SUMMARY_PROMPT_VERSION = "v1"`

## Grounding check

After model output, a deterministic check extracts SAN move tokens from the text and verifies each appears in the allowed set (played, best, engine lines, surrounding moves). One corrective retry on violation; fails with `ungrounded_output` if still invalid.

Limitation: verifies mentioned moves, not every positional claim.

## Caching

- **Client cache:** LRU in-memory, keyed by `kind:promptVersion:sha256(context)`
- **Server cache:** same key plus model and reasoning effort
- **Regenerate:** bypasses both caches
- Prompt version bump invalidates all cached entries

## Privacy

- PGNs are processed locally until the user clicks Explain or Generate Summary
- Only chess position data, engine lines, and evaluations are sent to the provider
- No player names, events, or browser metadata

## Failure behavior

AI failures never break the review. Error messages are user-friendly with Retry. Cases: missing key, rate limit, timeout, malformed/ungrounded output, abort.

## Trust boundary

The server re-validates all chess data with chess.js (legal moves, FEN consistency, SAN derivation). Engine numbers (evaluations, depth) are client-supplied in this local-first app — the server guarantees chess consistency, not engine truth.

## Known limitations

- Default model tier (`gpt-6-luna`) may misread complex positions
- Grounding check only verifies mentioned moves
- No persistence across server restarts or page reloads
- No streaming
- No chat interface
- No "explain all key moments" batch mode
- In-memory rate limit is per server instance
