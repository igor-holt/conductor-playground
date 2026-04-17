# Deployment Plan

## Services

- `packages/retraining-worker`: Cloudflare Workers + D1
- `apps/chatgpt-mcp`: Cloud Run service exposing `/mcp`
- `apps/operator-web`: Cloud Run service exposing the internal dashboard

## Sequence

1. Apply D1 migrations.
2. Seed the prompt ledger with `packages/retraining-worker/scripts/bootstrap_ledger.mjs`.
3. Run `packages/retraining-worker/scripts/provision-and-check.mjs`.
4. Deploy the worker.
5. Build and deploy `apps/chatgpt-mcp`.
6. Build and deploy `apps/operator-web`.
7. Run `packages/retraining-worker/monitoring/status_check.sh`.

## Secrets

- Cloudflare Worker: `OPENAI_API_KEY`, `CODEOWNER_SIGNING_KEY`, `SLACK_WEBHOOK_URL`
- Cloud Run services: `GENESIS_API_BASE_URL`, optional `GENESIS_ADMIN_WRITE_TOKEN`
- GCP Secret Manager is the source of truth for Cloud Run runtime secrets

## Local ChatGPT App Testing

1. Start `apps/chatgpt-mcp`.
2. Expose it with `ngrok http 2091`.
3. Point ChatGPT developer mode at `https://<subdomain>.ngrok.app/mcp`.
4. Refresh the app after any metadata or widget change.
