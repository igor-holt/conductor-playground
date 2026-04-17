# ADR 0001: Monorepo Topology

## Status

Accepted

## Context

Phase 1 needs one source of truth for contracts while still separating deployable surfaces:

- Cloudflare Worker for retraining state and orchestration
- Node CLI for safe operations
- Node MCP server for ChatGPT developer mode
- Next.js dashboard for read-only operator visibility
- Python harness for eta_thermo simulation

## Decision

Use one pnpm workspace plus one Python `uv` subproject:

- Shared contracts live in `packages/contracts`
- All UI surfaces default to the shared seed data until a live worker base URL is configured
- The CLI remains the only supported phase-1 write surface

## Consequences

- Dependency upgrades are centralized
- Type drift is reduced across worker, CLI, MCP app, and dashboard
- Deployments stay separate even though the code is co-located
