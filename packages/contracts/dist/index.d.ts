import { z } from 'zod';

declare const promptStatusSchema: z.ZodEnum<["ACTIVE", "SUPERSEDED", "ROLLED_BACK"]>;
declare const promotionStateSchema: z.ZodEnum<["PENDING", "EVALUATING", "PROMOTED", "REJECTED"]>;
declare const cycleStatusSchema: z.ZodEnum<["PASSED", "FAILED", "ROLLED_BACK"]>;
declare const promptVersionSchema: z.ZodObject<{
    versionId: z.ZodString;
    status: z.ZodEnum<["ACTIVE", "SUPERSEDED", "ROLLED_BACK"]>;
    promptText: z.ZodString;
    promotedAt: z.ZodNumber;
    proposerHash: z.ZodString;
    model: z.ZodString;
}, "strip", z.ZodTypeAny, {
    versionId: string;
    status: "ACTIVE" | "SUPERSEDED" | "ROLLED_BACK";
    promptText: string;
    promotedAt: number;
    proposerHash: string;
    model: string;
}, {
    versionId: string;
    status: "ACTIVE" | "SUPERSEDED" | "ROLLED_BACK";
    promptText: string;
    promotedAt: number;
    proposerHash: string;
    model: string;
}>;
declare const promotionCandidateSchema: z.ZodObject<{
    candidateId: z.ZodString;
    proposerHash: z.ZodString;
    promptText: z.ZodString;
    model: z.ZodString;
    sourceFeedback: z.ZodArray<z.ZodString, "many">;
    state: z.ZodEnum<["PENDING", "EVALUATING", "PROMOTED", "REJECTED"]>;
    scorePrior: z.ZodNumber;
    createdAt: z.ZodNumber;
    ttlCycles: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    promptText: string;
    proposerHash: string;
    model: string;
    candidateId: string;
    sourceFeedback: string[];
    state: "PENDING" | "EVALUATING" | "PROMOTED" | "REJECTED";
    scorePrior: number;
    createdAt: number;
    ttlCycles: number;
}, {
    promptText: string;
    proposerHash: string;
    model: string;
    candidateId: string;
    sourceFeedback: string[];
    state: "PENDING" | "EVALUATING" | "PROMOTED" | "REJECTED";
    scorePrior: number;
    createdAt: number;
    ttlCycles: number;
}>;
declare const graderFeedbackSchema: z.ZodObject<{
    id: z.ZodNumber;
    cycleId: z.ZodString;
    sectionId: z.ZodString;
    grader: z.ZodString;
    score: z.ZodNumber;
    reasoning: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: number;
    cycleId: string;
    sectionId: string;
    grader: string;
    score: number;
    reasoning: string;
}, {
    id: number;
    cycleId: string;
    sectionId: string;
    grader: string;
    score: number;
    reasoning: string;
}>;
declare const cycleTelemetrySchema: z.ZodObject<{
    cycleId: z.ZodString;
    status: z.ZodEnum<["PASSED", "FAILED", "ROLLED_BACK"]>;
    executedAt: z.ZodNumber;
    totalTokens: z.ZodNumber;
    computeMs: z.ZodNumber;
    sectionId: z.ZodString;
    summary: z.ZodString;
    averageScore: z.ZodNumber;
    residualDrift: z.ZodDefault<z.ZodNumber>;
    graderFeedback: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        cycleId: z.ZodString;
        sectionId: z.ZodString;
        grader: z.ZodString;
        score: z.ZodNumber;
        reasoning: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: number;
        cycleId: string;
        sectionId: string;
        grader: string;
        score: number;
        reasoning: string;
    }, {
        id: number;
        cycleId: string;
        sectionId: string;
        grader: string;
        score: number;
        reasoning: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    status: "ROLLED_BACK" | "PASSED" | "FAILED";
    cycleId: string;
    sectionId: string;
    executedAt: number;
    totalTokens: number;
    computeMs: number;
    summary: string;
    averageScore: number;
    residualDrift: number;
    graderFeedback: {
        id: number;
        cycleId: string;
        sectionId: string;
        grader: string;
        score: number;
        reasoning: string;
    }[];
}, {
    status: "ROLLED_BACK" | "PASSED" | "FAILED";
    cycleId: string;
    sectionId: string;
    executedAt: number;
    totalTokens: number;
    computeMs: number;
    summary: string;
    averageScore: number;
    graderFeedback: {
        id: number;
        cycleId: string;
        sectionId: string;
        grader: string;
        score: number;
        reasoning: string;
    }[];
    residualDrift?: number | undefined;
}>;
declare const rollbackAuditSchema: z.ZodObject<{
    id: z.ZodNumber;
    auditBlob: z.ZodObject<{
        reason: z.ZodString;
        from: z.ZodString;
        to: z.ZodString;
        ts: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        reason: string;
        from: string;
        to: string;
        ts: number;
    }, {
        reason: string;
        from: string;
        to: string;
        ts: number;
    }>;
    signature: z.ZodString;
    createdAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    createdAt: number;
    id: number;
    auditBlob: {
        reason: string;
        from: string;
        to: string;
        ts: number;
    };
    signature: string;
}, {
    createdAt: number;
    id: number;
    auditBlob: {
        reason: string;
        from: string;
        to: string;
        ts: number;
    };
    signature: string;
}>;
declare const quotaSnapshotSchema: z.ZodObject<{
    dailyTokenLimit: z.ZodNumber;
    tokensUsedToday: z.ZodNumber;
    burnRatio: z.ZodNumber;
    remainingTokens: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    dailyTokenLimit: number;
    tokensUsedToday: number;
    burnRatio: number;
    remainingTokens: number;
}, {
    dailyTokenLimit: number;
    tokensUsedToday: number;
    burnRatio: number;
    remainingTokens: number;
}>;
declare const apiKeyRecordSchema: z.ZodObject<{
    keyId: z.ZodString;
    label: z.ZodString;
    tokenHash: z.ZodString;
    scopes: z.ZodArray<z.ZodString, "many">;
    rateLimitPerMinute: z.ZodNumber;
    meterEventName: z.ZodString;
    active: z.ZodBoolean;
    createdAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    createdAt: number;
    keyId: string;
    label: string;
    tokenHash: string;
    scopes: string[];
    rateLimitPerMinute: number;
    meterEventName: string;
    active: boolean;
}, {
    createdAt: number;
    keyId: string;
    label: string;
    tokenHash: string;
    scopes: string[];
    rateLimitPerMinute: number;
    meterEventName: string;
    active: boolean;
}>;
declare const capsuleEventSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodNumber>;
    eventType: z.ZodEnum<["billable.response", "deploy.completed", "rollback.completed"]>;
    source: z.ZodEnum<["worker", "ci", "watchdog"]>;
    route: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    statusCode: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    actorKeyId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    requestFingerprint: z.ZodString;
    scrubbedPayload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    createdAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    createdAt: number;
    eventType: "billable.response" | "deploy.completed" | "rollback.completed";
    source: "worker" | "ci" | "watchdog";
    requestFingerprint: string;
    scrubbedPayload: Record<string, unknown>;
    id?: number | undefined;
    route?: string | null | undefined;
    statusCode?: number | null | undefined;
    actorKeyId?: string | null | undefined;
}, {
    createdAt: number;
    eventType: "billable.response" | "deploy.completed" | "rollback.completed";
    source: "worker" | "ci" | "watchdog";
    requestFingerprint: string;
    scrubbedPayload: Record<string, unknown>;
    id?: number | undefined;
    route?: string | null | undefined;
    statusCode?: number | null | undefined;
    actorKeyId?: string | null | undefined;
}>;
declare const meterEventSchema: z.ZodObject<{
    idempotencyKey: z.ZodString;
    meterEventName: z.ZodString;
    tokenHash: z.ZodString;
    route: z.ZodString;
    units: z.ZodNumber;
    duplicate: z.ZodBoolean;
    createdAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    createdAt: number;
    tokenHash: string;
    meterEventName: string;
    route: string;
    idempotencyKey: string;
    units: number;
    duplicate: boolean;
}, {
    createdAt: number;
    tokenHash: string;
    meterEventName: string;
    route: string;
    idempotencyKey: string;
    units: number;
    duplicate: boolean;
}>;
declare const a2aRequestSchema: z.ZodEffects<z.ZodObject<{
    requestId: z.ZodString;
    model: z.ZodOptional<z.ZodString>;
    messages: z.ZodOptional<z.ZodArray<z.ZodObject<{
        role: z.ZodEnum<["system", "user", "assistant"]>;
        content: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        role: "system" | "user" | "assistant";
        content: string;
    }, {
        role: "system" | "user" | "assistant";
        content: string;
    }>, "many">>;
    prompt: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    requestId: string;
    model?: string | undefined;
    messages?: {
        role: "system" | "user" | "assistant";
        content: string;
    }[] | undefined;
    prompt?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    requestId: string;
    model?: string | undefined;
    messages?: {
        role: "system" | "user" | "assistant";
        content: string;
    }[] | undefined;
    prompt?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>, {
    requestId: string;
    model?: string | undefined;
    messages?: {
        role: "system" | "user" | "assistant";
        content: string;
    }[] | undefined;
    prompt?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    requestId: string;
    model?: string | undefined;
    messages?: {
        role: "system" | "user" | "assistant";
        content: string;
    }[] | undefined;
    prompt?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
declare const inferRequestSchema: z.ZodObject<{
    requestId: z.ZodString;
    model: z.ZodOptional<z.ZodString>;
    input: z.ZodString;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    requestId: string;
    input: string;
    model?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    requestId: string;
    input: string;
    model?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
declare const billableResponseSchema: z.ZodObject<{
    requestId: z.ZodString;
    route: z.ZodEnum<["/a2a", "/v1/infer"]>;
    provider: z.ZodString;
    model: z.ZodString;
    output: z.ZodString;
    usage: z.ZodObject<{
        prompt_tokens: z.ZodNumber;
        completion_tokens: z.ZodNumber;
        total_tokens: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    }, {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    }>;
    duplicateMeterEvent: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    model: string;
    route: "/a2a" | "/v1/infer";
    requestId: string;
    provider: string;
    output: string;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    duplicateMeterEvent: boolean;
}, {
    model: string;
    route: "/a2a" | "/v1/infer";
    requestId: string;
    provider: string;
    output: string;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    duplicateMeterEvent: boolean;
}>;
declare const pufBenchResultSchema: z.ZodObject<{
    runId: z.ZodString;
    challengeSize: z.ZodNumber;
    helperHash: z.ZodString;
    etaThermoSignature: z.ZodString;
    driftScore: z.ZodNumber;
    intruderRejected: z.ZodBoolean;
    createdAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    createdAt: number;
    runId: string;
    challengeSize: number;
    helperHash: string;
    etaThermoSignature: string;
    driftScore: number;
    intruderRejected: boolean;
}, {
    createdAt: number;
    runId: string;
    challengeSize: number;
    helperHash: string;
    etaThermoSignature: string;
    driftScore: number;
    intruderRejected: boolean;
}>;
declare const pufProbeStatusSchema: z.ZodObject<{
    deviceId: z.ZodString;
    state: z.ZodEnum<["SIM_READY", "SIM_DRIFT_OK", "SIM_DRIFT_ALERT"]>;
    lastVerifiedAt: z.ZodNumber;
    notes: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    state: "SIM_READY" | "SIM_DRIFT_OK" | "SIM_DRIFT_ALERT";
    deviceId: string;
    lastVerifiedAt: number;
    notes: string[];
}, {
    state: "SIM_READY" | "SIM_DRIFT_OK" | "SIM_DRIFT_ALERT";
    deviceId: string;
    lastVerifiedAt: number;
    notes: string[];
}>;
declare const operatorAlertSchema: z.ZodObject<{
    id: z.ZodString;
    severity: z.ZodEnum<["P0", "P1", "P2"]>;
    title: z.ZodString;
    summary: z.ZodString;
    createdAt: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    createdAt: number;
    id: string;
    summary: string;
    severity: "P0" | "P1" | "P2";
    title: string;
}, {
    createdAt: number;
    id: string;
    summary: string;
    severity: "P0" | "P1" | "P2";
    title: string;
}>;
declare const operatorSnapshotSchema: z.ZodObject<{
    promptVersions: z.ZodArray<z.ZodObject<{
        versionId: z.ZodString;
        status: z.ZodEnum<["ACTIVE", "SUPERSEDED", "ROLLED_BACK"]>;
        promptText: z.ZodString;
        promotedAt: z.ZodNumber;
        proposerHash: z.ZodString;
        model: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        versionId: string;
        status: "ACTIVE" | "SUPERSEDED" | "ROLLED_BACK";
        promptText: string;
        promotedAt: number;
        proposerHash: string;
        model: string;
    }, {
        versionId: string;
        status: "ACTIVE" | "SUPERSEDED" | "ROLLED_BACK";
        promptText: string;
        promotedAt: number;
        proposerHash: string;
        model: string;
    }>, "many">;
    promotions: z.ZodArray<z.ZodObject<{
        candidateId: z.ZodString;
        proposerHash: z.ZodString;
        promptText: z.ZodString;
        model: z.ZodString;
        sourceFeedback: z.ZodArray<z.ZodString, "many">;
        state: z.ZodEnum<["PENDING", "EVALUATING", "PROMOTED", "REJECTED"]>;
        scorePrior: z.ZodNumber;
        createdAt: z.ZodNumber;
        ttlCycles: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        promptText: string;
        proposerHash: string;
        model: string;
        candidateId: string;
        sourceFeedback: string[];
        state: "PENDING" | "EVALUATING" | "PROMOTED" | "REJECTED";
        scorePrior: number;
        createdAt: number;
        ttlCycles: number;
    }, {
        promptText: string;
        proposerHash: string;
        model: string;
        candidateId: string;
        sourceFeedback: string[];
        state: "PENDING" | "EVALUATING" | "PROMOTED" | "REJECTED";
        scorePrior: number;
        createdAt: number;
        ttlCycles: number;
    }>, "many">;
    cycles: z.ZodArray<z.ZodObject<{
        cycleId: z.ZodString;
        status: z.ZodEnum<["PASSED", "FAILED", "ROLLED_BACK"]>;
        executedAt: z.ZodNumber;
        totalTokens: z.ZodNumber;
        computeMs: z.ZodNumber;
        sectionId: z.ZodString;
        summary: z.ZodString;
        averageScore: z.ZodNumber;
        residualDrift: z.ZodDefault<z.ZodNumber>;
        graderFeedback: z.ZodArray<z.ZodObject<{
            id: z.ZodNumber;
            cycleId: z.ZodString;
            sectionId: z.ZodString;
            grader: z.ZodString;
            score: z.ZodNumber;
            reasoning: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            id: number;
            cycleId: string;
            sectionId: string;
            grader: string;
            score: number;
            reasoning: string;
        }, {
            id: number;
            cycleId: string;
            sectionId: string;
            grader: string;
            score: number;
            reasoning: string;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        status: "ROLLED_BACK" | "PASSED" | "FAILED";
        cycleId: string;
        sectionId: string;
        executedAt: number;
        totalTokens: number;
        computeMs: number;
        summary: string;
        averageScore: number;
        residualDrift: number;
        graderFeedback: {
            id: number;
            cycleId: string;
            sectionId: string;
            grader: string;
            score: number;
            reasoning: string;
        }[];
    }, {
        status: "ROLLED_BACK" | "PASSED" | "FAILED";
        cycleId: string;
        sectionId: string;
        executedAt: number;
        totalTokens: number;
        computeMs: number;
        summary: string;
        averageScore: number;
        graderFeedback: {
            id: number;
            cycleId: string;
            sectionId: string;
            grader: string;
            score: number;
            reasoning: string;
        }[];
        residualDrift?: number | undefined;
    }>, "many">;
    quota: z.ZodObject<{
        dailyTokenLimit: z.ZodNumber;
        tokensUsedToday: z.ZodNumber;
        burnRatio: z.ZodNumber;
        remainingTokens: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        dailyTokenLimit: number;
        tokensUsedToday: number;
        burnRatio: number;
        remainingTokens: number;
    }, {
        dailyTokenLimit: number;
        tokensUsedToday: number;
        burnRatio: number;
        remainingTokens: number;
    }>;
    rollbackAudit: z.ZodArray<z.ZodObject<{
        id: z.ZodNumber;
        auditBlob: z.ZodObject<{
            reason: z.ZodString;
            from: z.ZodString;
            to: z.ZodString;
            ts: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            reason: string;
            from: string;
            to: string;
            ts: number;
        }, {
            reason: string;
            from: string;
            to: string;
            ts: number;
        }>;
        signature: z.ZodString;
        createdAt: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        createdAt: number;
        id: number;
        auditBlob: {
            reason: string;
            from: string;
            to: string;
            ts: number;
        };
        signature: string;
    }, {
        createdAt: number;
        id: number;
        auditBlob: {
            reason: string;
            from: string;
            to: string;
            ts: number;
        };
        signature: string;
    }>, "many">;
    pufBench: z.ZodObject<{
        runId: z.ZodString;
        challengeSize: z.ZodNumber;
        helperHash: z.ZodString;
        etaThermoSignature: z.ZodString;
        driftScore: z.ZodNumber;
        intruderRejected: z.ZodBoolean;
        createdAt: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        createdAt: number;
        runId: string;
        challengeSize: number;
        helperHash: string;
        etaThermoSignature: string;
        driftScore: number;
        intruderRejected: boolean;
    }, {
        createdAt: number;
        runId: string;
        challengeSize: number;
        helperHash: string;
        etaThermoSignature: string;
        driftScore: number;
        intruderRejected: boolean;
    }>;
    pufProbe: z.ZodObject<{
        deviceId: z.ZodString;
        state: z.ZodEnum<["SIM_READY", "SIM_DRIFT_OK", "SIM_DRIFT_ALERT"]>;
        lastVerifiedAt: z.ZodNumber;
        notes: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        state: "SIM_READY" | "SIM_DRIFT_OK" | "SIM_DRIFT_ALERT";
        deviceId: string;
        lastVerifiedAt: number;
        notes: string[];
    }, {
        state: "SIM_READY" | "SIM_DRIFT_OK" | "SIM_DRIFT_ALERT";
        deviceId: string;
        lastVerifiedAt: number;
        notes: string[];
    }>;
    alerts: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        severity: z.ZodEnum<["P0", "P1", "P2"]>;
        title: z.ZodString;
        summary: z.ZodString;
        createdAt: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        createdAt: number;
        id: string;
        summary: string;
        severity: "P0" | "P1" | "P2";
        title: string;
    }, {
        createdAt: number;
        id: string;
        summary: string;
        severity: "P0" | "P1" | "P2";
        title: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    promptVersions: {
        versionId: string;
        status: "ACTIVE" | "SUPERSEDED" | "ROLLED_BACK";
        promptText: string;
        promotedAt: number;
        proposerHash: string;
        model: string;
    }[];
    promotions: {
        promptText: string;
        proposerHash: string;
        model: string;
        candidateId: string;
        sourceFeedback: string[];
        state: "PENDING" | "EVALUATING" | "PROMOTED" | "REJECTED";
        scorePrior: number;
        createdAt: number;
        ttlCycles: number;
    }[];
    cycles: {
        status: "ROLLED_BACK" | "PASSED" | "FAILED";
        cycleId: string;
        sectionId: string;
        executedAt: number;
        totalTokens: number;
        computeMs: number;
        summary: string;
        averageScore: number;
        residualDrift: number;
        graderFeedback: {
            id: number;
            cycleId: string;
            sectionId: string;
            grader: string;
            score: number;
            reasoning: string;
        }[];
    }[];
    quota: {
        dailyTokenLimit: number;
        tokensUsedToday: number;
        burnRatio: number;
        remainingTokens: number;
    };
    rollbackAudit: {
        createdAt: number;
        id: number;
        auditBlob: {
            reason: string;
            from: string;
            to: string;
            ts: number;
        };
        signature: string;
    }[];
    pufBench: {
        createdAt: number;
        runId: string;
        challengeSize: number;
        helperHash: string;
        etaThermoSignature: string;
        driftScore: number;
        intruderRejected: boolean;
    };
    pufProbe: {
        state: "SIM_READY" | "SIM_DRIFT_OK" | "SIM_DRIFT_ALERT";
        deviceId: string;
        lastVerifiedAt: number;
        notes: string[];
    };
    alerts: {
        createdAt: number;
        id: string;
        summary: string;
        severity: "P0" | "P1" | "P2";
        title: string;
    }[];
}, {
    promptVersions: {
        versionId: string;
        status: "ACTIVE" | "SUPERSEDED" | "ROLLED_BACK";
        promptText: string;
        promotedAt: number;
        proposerHash: string;
        model: string;
    }[];
    promotions: {
        promptText: string;
        proposerHash: string;
        model: string;
        candidateId: string;
        sourceFeedback: string[];
        state: "PENDING" | "EVALUATING" | "PROMOTED" | "REJECTED";
        scorePrior: number;
        createdAt: number;
        ttlCycles: number;
    }[];
    cycles: {
        status: "ROLLED_BACK" | "PASSED" | "FAILED";
        cycleId: string;
        sectionId: string;
        executedAt: number;
        totalTokens: number;
        computeMs: number;
        summary: string;
        averageScore: number;
        graderFeedback: {
            id: number;
            cycleId: string;
            sectionId: string;
            grader: string;
            score: number;
            reasoning: string;
        }[];
        residualDrift?: number | undefined;
    }[];
    quota: {
        dailyTokenLimit: number;
        tokensUsedToday: number;
        burnRatio: number;
        remainingTokens: number;
    };
    rollbackAudit: {
        createdAt: number;
        id: number;
        auditBlob: {
            reason: string;
            from: string;
            to: string;
            ts: number;
        };
        signature: string;
    }[];
    pufBench: {
        createdAt: number;
        runId: string;
        challengeSize: number;
        helperHash: string;
        etaThermoSignature: string;
        driftScore: number;
        intruderRejected: boolean;
    };
    pufProbe: {
        state: "SIM_READY" | "SIM_DRIFT_OK" | "SIM_DRIFT_ALERT";
        deviceId: string;
        lastVerifiedAt: number;
        notes: string[];
    };
    alerts: {
        createdAt: number;
        id: string;
        summary: string;
        severity: "P0" | "P1" | "P2";
        title: string;
    }[];
}>;
declare const operatorErrorSchema: z.ZodObject<{
    code: z.ZodString;
    message: z.ZodString;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    code: string;
    message: string;
    details?: Record<string, unknown> | undefined;
}, {
    code: string;
    message: string;
    details?: Record<string, unknown> | undefined;
}>;
declare const searchResultSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    kind: z.ZodEnum<["prompt", "promotion", "cycle", "alert", "document"]>;
    summary: z.ZodString;
    url: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    summary: string;
    title: string;
    kind: "prompt" | "promotion" | "cycle" | "alert" | "document";
    url: string;
}, {
    id: string;
    summary: string;
    title: string;
    kind: "prompt" | "promotion" | "cycle" | "alert" | "document";
    url: string;
}>;
declare const fetchDocumentSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    text: z.ZodString;
    url: z.ZodString;
    metadata: z.ZodRecord<z.ZodString, z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    metadata: Record<string, string>;
    title: string;
    url: string;
    text: string;
}, {
    id: string;
    metadata: Record<string, string>;
    title: string;
    url: string;
    text: string;
}>;
type PromptVersion = z.infer<typeof promptVersionSchema>;
type PromotionCandidate = z.infer<typeof promotionCandidateSchema>;
type CycleTelemetry = z.infer<typeof cycleTelemetrySchema>;
type GraderFeedback = z.infer<typeof graderFeedbackSchema>;
type RollbackAudit = z.infer<typeof rollbackAuditSchema>;
type QuotaSnapshot = z.infer<typeof quotaSnapshotSchema>;
type ApiKeyRecord = z.infer<typeof apiKeyRecordSchema>;
type CapsuleEvent = z.infer<typeof capsuleEventSchema>;
type MeterEvent = z.infer<typeof meterEventSchema>;
type PufBenchResult = z.infer<typeof pufBenchResultSchema>;
type PufProbeStatus = z.infer<typeof pufProbeStatusSchema>;
type OperatorAlert = z.infer<typeof operatorAlertSchema>;
type OperatorSnapshot = z.infer<typeof operatorSnapshotSchema>;
type OperatorError = z.infer<typeof operatorErrorSchema>;
type SearchResult = z.infer<typeof searchResultSchema>;
type FetchDocument = z.infer<typeof fetchDocumentSchema>;
type A2ARequest = z.infer<typeof a2aRequestSchema>;
type InferRequest = z.infer<typeof inferRequestSchema>;
type BillableResponse = z.infer<typeof billableResponseSchema>;
declare const seedOperatorSnapshot: OperatorSnapshot;
declare function listReferenceDocuments(): FetchDocument[];
declare function findReferenceDocument(id: string): FetchDocument | undefined;
declare function createSearchIndex(snapshot?: OperatorSnapshot): SearchResult[];
declare function searchOperatorData(query: string, snapshot?: OperatorSnapshot): SearchResult[];
declare function getCycleById(cycleId: string, snapshot?: OperatorSnapshot): CycleTelemetry | undefined;
declare function getPromptById(versionId: string, snapshot?: OperatorSnapshot): PromptVersion | undefined;

export { type A2ARequest, type ApiKeyRecord, type BillableResponse, type CapsuleEvent, type CycleTelemetry, type FetchDocument, type GraderFeedback, type InferRequest, type MeterEvent, type OperatorAlert, type OperatorError, type OperatorSnapshot, type PromotionCandidate, type PromptVersion, type PufBenchResult, type PufProbeStatus, type QuotaSnapshot, type RollbackAudit, type SearchResult, a2aRequestSchema, apiKeyRecordSchema, billableResponseSchema, capsuleEventSchema, createSearchIndex, cycleStatusSchema, cycleTelemetrySchema, fetchDocumentSchema, findReferenceDocument, getCycleById, getPromptById, graderFeedbackSchema, inferRequestSchema, listReferenceDocuments, meterEventSchema, operatorAlertSchema, operatorErrorSchema, operatorSnapshotSchema, promotionCandidateSchema, promotionStateSchema, promptStatusSchema, promptVersionSchema, pufBenchResultSchema, pufProbeStatusSchema, quotaSnapshotSchema, rollbackAuditSchema, searchOperatorData, searchResultSchema, seedOperatorSnapshot };
