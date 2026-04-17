export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

export interface D1DatabaseLike {
  prepare(sql: string): D1PreparedStatementLike;
  batch(statements: D1PreparedStatementLike[]): Promise<unknown[]>;
}

export interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

export interface GenesisEnv {
  genesis_seismic_log: D1DatabaseLike;
  prompt_ledger_kv?: KVNamespaceLike;
  API_KEYS?: KVNamespaceLike;
  METER_CURSOR?: KVNamespaceLike;
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  CODEOWNER_SIGNING_KEY?: string;
  SLACK_WEBHOOK_URL?: string;
  STRIPE_API_KEY?: string;
  STRIPE_METER_EVENT_NAME?: string;
  ROUTER_MODEL?: string;
  ENVIRONMENT?: string;
  ADMIN_WRITE_TOKEN?: string;
}

export interface ChatCompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenAIClient {
  chatCompletion(input: {
    model: string;
    messages: Array<{ role: "system" | "user"; content: string }>;
    temperature?: number;
    maxTokens?: number;
    responseFormat?: { type: "json_object" };
  }): Promise<{ content: string; usage: ChatCompletionUsage }>;
  embedding(input: { model: string; text: string }): Promise<number[]>;
}
