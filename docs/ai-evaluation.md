# AI Explanation Quality Evaluation

Manual evaluation harness for Phase 6 AI explanations.

## Fixtures

Curated positions in `src/lib/ai/eval/fixtures.ts`:

| Category | Description |
| --- | --- |
| tactical-blunder | Scholar's mate attempt (Qh5?) |
| good-move | Standard opening e4 |

Each fixture includes engine-backed context that passes server verification.

## Checklist

For each generated explanation, evaluate:

1. Factually correct given the position
2. References the actual position
3. Correctly describes the supplied engine line
4. Does not invent tactics
5. Explains cause and effect
6. Gives a useful lesson
7. Avoids unnecessary verbosity

A convincing wrong explanation is worse than no explanation.

## Running the harness

Requires `OPENAI_API_KEY` in `.env.local`:

```bash
node scripts/ai-eval.mjs
```

Prints each fixture's generated explanation beside the checklist.

## CI

Fixture validity (context passes server verification) is tested in `src/lib/ai/eval/fixtures.test.ts`. Real model quality is manual only.
