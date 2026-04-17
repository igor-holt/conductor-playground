---
name: genesis-conductor-ops
description: Use when operating the Genesis Conductor monorepo through the local genesis-conductor CLI, especially for prompt ledger inspection, dry-run replay or rollback validation, harness runs, and notebook generation.
---

# Genesis Conductor Ops

Start here:

```bash
command -v genesis-conductor
genesis-conductor --json doctor
```

If the CLI is not on `PATH`, install it from the repo:

```bash
pnpm --filter @genesis/genesis-cli install-local
```

## Safe order

1. Read the current state first.
2. Use dry-run write commands before any live mutation.
3. Keep the MCP app and operator web read-only in phase 1.
4. Run the PUF harness through the CLI wrappers, not ad hoc Python commands.
5. Use the raw request command only for read-only GET paths.

## Read path

```bash
genesis-conductor --json prompts active
genesis-conductor --json promotions list
genesis-conductor --json cycles list
genesis-conductor --json quota burn
```

## Dry-run write path

```bash
genesis-conductor --json cycles replay cycle-2026-04-17-001 --dry-run
genesis-conductor --json ledger rollback --dry-run
```

Do not issue live writes unless the user explicitly asks and `GENESIS_ADMIN_WRITE_TOKEN` is configured.

## Harness path

```bash
genesis-conductor --json puf bench run --out tmp/puf-bench
genesis-conductor --json puf probe verify --out tmp/puf-probe
```

## Notebook path

```bash
genesis-conductor --json notebooks build
python3 scripts/check_notebooks.py
```

## Raw escape hatch

```bash
genesis-conductor --json request get /prompts/active
```

Use only GET paths unless the user explicitly asks for a live write and the safer high-level command is missing.
