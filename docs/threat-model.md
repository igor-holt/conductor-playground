# Threat Model

## Assets

- Prompt ledger state in D1
- Promotion candidates and grader feedback
- Rollback audit signatures
- eta_thermo harness artifacts
- Operator credentials and webhook endpoints

## Trust Boundaries

- Cloudflare Worker boundary around D1, KV, and scheduled execution
- Cloud Run boundary around the ChatGPT MCP server and operator web UI
- Local operator machine boundary around the CLI and Python harness
- External OpenAI and Slack boundaries for model calls and alert delivery

## Primary Threats

- Unauthorized prompt rollback or replay
- Prompt injection through MCP or UI surfaces
- Leakage of raw harness material or signing keys
- Silent alert failures during rollback incidents
- Drift between CLI, UI, and worker contract interpretations

## Mitigations

- Write actions default to dry-run and require explicit admin token for live execution
- MCP app and operator web remain read-only in phase 1
- Harness artifacts are hash-only and tests reject blocked secret-shaped fields
- Slack webhook is required by the provision gate
- Shared contracts package defines canonical payload shapes across all surfaces
