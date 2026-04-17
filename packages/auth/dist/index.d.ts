import { ApiKeyRecord } from '@genesis/contracts';

interface HeaderLike {
    get(name: string): string | null;
}
interface ApiKeyStore {
    get(key: string): Promise<string | null>;
    put?(key: string, value: string): Promise<void>;
}
interface AuthSuccess {
    ok: true;
    rawToken: string;
    tokenHash: string;
    record: ApiKeyRecord;
}
interface AuthFailure {
    ok: false;
    status: number;
    code: string;
    message: string;
}
declare function sha256Hex(input: string): Promise<string>;
declare function extractBearerToken(headers: HeaderLike): string | null;
declare function persistApiKeyRecord(store: ApiKeyStore, input: Omit<ApiKeyRecord, "tokenHash"> & {
    rawToken: string;
}): Promise<ApiKeyRecord>;
declare function authenticateBearerToken(headers: HeaderLike, store?: ApiKeyStore): Promise<AuthSuccess | AuthFailure>;

export { type ApiKeyStore, type AuthFailure, type AuthSuccess, type HeaderLike, authenticateBearerToken, extractBearerToken, persistApiKeyRecord, sha256Hex };
