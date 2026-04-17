import { CapsuleEvent } from '@genesis/contracts';

interface D1PreparedStatementLike {
    bind(...values: unknown[]): D1PreparedStatementLike;
    run(): Promise<unknown>;
}
interface D1DatabaseLike {
    prepare(sql: string): D1PreparedStatementLike;
}
declare function sha256Hex(input: string): Promise<string>;
declare function scrubSecrets(value: unknown): unknown;
declare function createRequestFingerprint(input: {
    route: string;
    requestId: string;
    tokenHash?: string;
}): Promise<string>;
declare function appendCapsuleEvent(db: D1DatabaseLike, event: Omit<CapsuleEvent, "id"> & {
    id?: number;
}): Promise<CapsuleEvent>;

export { type D1DatabaseLike, type D1PreparedStatementLike, appendCapsuleEvent, createRequestFingerprint, scrubSecrets, sha256Hex };
