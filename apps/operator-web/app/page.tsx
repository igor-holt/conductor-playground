import React from "react";
import { getOperatorSnapshot } from "./data";

function formatTime(value: number) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function severityStyles(severity: "P0" | "P1" | "P2") {
  if (severity === "P0") {
    return "bg-[color:var(--signal-red)]/10 text-[color:var(--signal-red)]";
  }
  if (severity === "P1") {
    return "bg-[color:var(--signal-amber)]/15 text-[color:var(--signal-amber)]";
  }
  return "bg-[color:var(--signal-blue)]/12 text-[color:var(--signal-blue)]";
}

export default async function Home() {
  const snapshot = await getOperatorSnapshot();
  const activePrompt = snapshot.promptVersions.find((entry) => entry.status === "ACTIVE");
  const failingCycles = snapshot.cycles.filter((cycle) => cycle.status === "FAILED");
  const rollbackCreatedAt = snapshot.rollbackAudit[0]?.createdAt ?? snapshot.alerts[0]?.createdAt ?? 0;

  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6 shadow-[0_24px_90px_rgba(24,42,33,0.08)] backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="font-mono text-xs uppercase tracking-[0.32em] text-[color:var(--signal-green)]">
                Genesis Conductor
              </p>
              <h1 className="text-4xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)] sm:text-5xl">
                Retraining worker, prompt ledger, and eta_thermo status in one operator surface.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-[color:var(--foreground)]/72 sm:text-base">
                This dashboard stays read-only by design. Phase-1 mutations still route through
                the CLI so rollback, replay, and evaluation requests remain explicit and auditable.
              </p>
            </div>
            <div className="grid gap-3 rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel-strong)] p-4 text-sm text-[color:var(--foreground)]/75">
              <span className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal-blue)]">
                {snapshot.dataSource === "seed" || snapshot.dataSource === "seed-fallback" ? "Seeded ops view" : "Live staging view"}
              </span>
              <p>Active prompt: {activePrompt?.versionId}</p>
              <p>Pending candidates: {snapshot.promotions.length}</p>
              <p>Quota burn: {(snapshot.quota.burnRatio * 100).toFixed(1)}%</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <article className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal-green)]">
                  Prompt Ledger
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Current promotion surface</h2>
              </div>
              <code className="rounded-full bg-[color:var(--signal-green)]/10 px-3 py-1 font-mono text-xs text-[color:var(--signal-green)]">
                genesis-conductor --json prompts active
              </code>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {snapshot.promptVersions.map((prompt) => (
                <div
                  key={prompt.versionId}
                  className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel-strong)] p-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{prompt.versionId}</h3>
                    <span className="rounded-full bg-[color:var(--signal-blue)]/10 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-[color:var(--signal-blue)]">
                      {prompt.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--foreground)]/72">
                    {prompt.promptText}
                  </p>
                  <p className="mt-3 font-mono text-xs text-[color:var(--foreground)]/52">
                    Promoted {formatTime(prompt.promotedAt)} via {prompt.model}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal-blue)]">
              Quota and rollback
            </p>
            <div className="mt-4 space-y-4">
              <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel-strong)] p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Daily burn</h3>
                  <span className="font-mono text-sm text-[color:var(--signal-blue)]">
                    {(snapshot.quota.burnRatio * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="mt-4 h-3 rounded-full bg-[color:var(--signal-blue)]/10">
                  <div
                    className="h-full rounded-full bg-[color:var(--signal-blue)]"
                    style={{ width: `${snapshot.quota.burnRatio * 100}%` }}
                  />
                </div>
                <p className="mt-3 text-sm text-[color:var(--foreground)]/72">
                  {snapshot.quota.tokensUsedToday.toLocaleString()} /{" "}
                  {snapshot.quota.dailyTokenLimit.toLocaleString()} tokens consumed in the last 24 hours.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel-strong)] p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Latest rollback audit</h3>
                  <code className="font-mono text-xs text-[color:var(--signal-amber)]">
                    genesis-conductor --json ledger rollback --dry-run
                  </code>
                </div>
                <p className="mt-3 text-sm leading-6 text-[color:var(--foreground)]/72">
                  {snapshot.rollbackAudit[0]?.auditBlob.reason} from {snapshot.rollbackAudit[0]?.auditBlob.from} to{" "}
                  {snapshot.rollbackAudit[0]?.auditBlob.to}.
                </p>
                <p className="mt-3 font-mono text-xs text-[color:var(--foreground)]/52">
                  {formatTime(rollbackCreatedAt)}
                </p>
              </div>
            </div>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_1fr_0.9fr]">
          <article className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal-red)]">
                  Failing cycles
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Regression window</h2>
              </div>
              <code className="rounded-full bg-[color:var(--signal-red)]/10 px-3 py-1 font-mono text-xs text-[color:var(--signal-red)]">
                genesis-conductor --json cycles list
              </code>
            </div>
            <div className="mt-5 space-y-3">
              {failingCycles.map((cycle) => (
                <div
                  key={cycle.cycleId}
                  className="rounded-[1.4rem] border border-[color:var(--border)] bg-[color:var(--panel-strong)] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">{cycle.cycleId}</h3>
                    <span className="font-mono text-xs text-[color:var(--signal-red)]">
                      avg {cycle.averageScore.toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--foreground)]/72">{cycle.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {cycle.graderFeedback.map((feedback) => (
                      <span
                        key={`${cycle.cycleId}-${feedback.id}`}
                        className="rounded-full bg-[color:var(--signal-red)]/8 px-2 py-1 font-mono text-[11px] text-[color:var(--signal-red)]"
                      >
                        {feedback.grader}:{feedback.score.toFixed(2)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal-blue)]">
              Promotion queue
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Pending candidate review</h2>
            <div className="mt-5 space-y-3">
              {snapshot.promotions.map((promotion) => (
                <div
                  key={promotion.candidateId}
                  className="rounded-[1.4rem] border border-[color:var(--border)] bg-[color:var(--panel-strong)] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">{promotion.candidateId}</h3>
                    <span className="rounded-full bg-[color:var(--signal-blue)]/10 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-[color:var(--signal-blue)]">
                      {promotion.state}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[color:var(--foreground)]/72">
                    {promotion.promptText}
                  </p>
                  <p className="mt-3 font-mono text-xs text-[color:var(--foreground)]/52">
                    Prior {promotion.scorePrior.toFixed(2)} · TTL {promotion.ttlCycles} cycles
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal-green)]">
              eta_thermo
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Sim harness status</h2>
            <div className="mt-5 space-y-3">
              <div className="rounded-[1.4rem] border border-[color:var(--border)] bg-[color:var(--panel-strong)] p-4">
                <p className="text-sm font-semibold">Bench artifact</p>
                {snapshot.pufBench ? (
                  <>
                    <p className="mt-2 text-sm text-[color:var(--foreground)]/72">
                      Run {snapshot.pufBench.runId} emitted helper hash {snapshot.pufBench.helperHash.slice(0, 16)}...
                    </p>
                    <p className="mt-3 font-mono text-xs text-[color:var(--foreground)]/52">
                      Drift {snapshot.pufBench.driftScore.toExponential(2)}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-[color:var(--foreground)]/72">
                    No live eta_thermo bench artifact has been ingested into staging yet.
                  </p>
                )}
              </div>

              <div className="rounded-[1.4rem] border border-[color:var(--border)] bg-[color:var(--panel-strong)] p-4">
                <p className="text-sm font-semibold">Probe verification</p>
                {snapshot.pufProbe ? (
                  <>
                    <p className="mt-2 text-sm text-[color:var(--foreground)]/72">
                      {snapshot.pufProbe.state} on {snapshot.pufProbe.deviceId}
                    </p>
                    <ul className="mt-3 space-y-2 text-sm text-[color:var(--foreground)]/72">
                      {snapshot.pufProbe.notes.map((note) => (
                        <li key={note}>• {note}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-[color:var(--foreground)]/72">
                    Probe status will appear after the first staging verification run.
                  </p>
                )}
              </div>
            </div>
          </article>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <article className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal-amber)]">
              Alert rail
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Recent operator alerts</h2>
            <div className="mt-5 space-y-3">
              {snapshot.alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-[1.4rem] border border-[color:var(--border)] bg-[color:var(--panel-strong)] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">{alert.title}</h3>
                    <span className={`rounded-full px-2 py-1 font-mono text-[11px] uppercase tracking-[0.16em] ${severityStyles(alert.severity)}`}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[color:var(--foreground)]/72">{alert.summary}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-6">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[color:var(--signal-blue)]">
              CLI handoff
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Safe write path</h2>
            <div className="mt-5 rounded-[1.4rem] border border-[color:var(--border)] bg-[#0f1b16] p-4 text-sm text-[#d5e5db]">
              <pre className="overflow-x-auto font-mono text-xs leading-6 sm:text-sm">
                {`genesis-conductor --json doctor
genesis-conductor --json cycles replay cycle-2026-04-17-001 --dry-run
genesis-conductor --json ledger rollback --dry-run
genesis-conductor --json puf bench run --out tmp/puf-bench`}
              </pre>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
