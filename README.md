# Genesis Conductor Monorepo

Integrated phase-1 delivery for:

- A Cloudflare retraining worker with prompt ledger state, proposer/watchdog logic, and rollback audit.
- A typed CLI (`genesis-conductor`) that is the only phase-1 write surface.
- A read-only ChatGPT MCP app and Next.js operator dashboard built on the same contracts.
- A sim-first eta_thermo harness with hash-only artifact emission.
- Local docs, notebooks, CI, and deployment scaffolding.

## Workspace Layout

- `apps/operator-web`: Next.js 16 operator dashboard
- `apps/chatgpt-mcp`: Node MCP server for ChatGPT developer mode
- `packages/contracts`: shared Zod schemas and seeded mock data
- `packages/retraining-worker`: Cloudflare Worker + D1 migrations + tests
- `packages/genesis-cli`: composable CLI for read paths and dry-run writes
- `packages/puf-harness`: Python eta_thermo sim harness
- `docs`: ADRs, threat model, deployment plan, and local mirrors of Notion outputs
- `notebooks`: versioned research notebooks generated from the Jupyter skill helper

## Development

```bash
pnpm install
pnpm verify
```

Useful loops:

```bash
pnpm dev:operator-web
pnpm dev:chatgpt-mcp
pnpm dev:worker
pnpm --filter @genesis/genesis-cli install-local
```

Python harness:

```bash
uv run --project packages/puf-harness pytest packages/puf-harness/tests
```

Notebook generation:

```bash
python3 scripts/build_notebooks.py
python3 scripts/check_notebooks.py
```
