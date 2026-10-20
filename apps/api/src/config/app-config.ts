import { envSchema, type Env } from './env.schema.js';

/** Thrown at start-up when the environment is invalid, listing every problem at once. */
export class InvalidConfigError extends Error {
  constructor(problems: readonly string[]) {
    super(`Invalid environment configuration:\n  - ${problems.join('\n  - ')}`);
    this.name = 'InvalidConfigError';
  }
}

/**
 * Typed, validated configuration. Built once from the environment; every other
 * class receives it through dependency injection instead of reading
 * `process.env` (CLAUDE.md section 7).
 */
export class AppConfig {
  readonly env: Env['NODE_ENV'];
  readonly appEnv: Env['APP_ENV'];
  readonly logLevel: Env['LOG_LEVEL'];
  readonly http: {
    port: number;
    corsOrigins: readonly string[];
    trustProxy: boolean;
    swaggerEnabled: boolean;
  };
  readonly database: { url: string };
  readonly redis: { url: string };
  readonly auth: {
    accessSecret: string;
    accessTtlSeconds: number;
    refreshTtlDays: number;
    cookieSecure: boolean;
    demoMode: boolean;
  };
  readonly connectors: {
    sgHr: { baseUrl: string; apiKey: string };
    cnHq: { baseUrl: string; username: string; password: string };
    oa: { baseUrl: string; apiToken: string; webhookSecret: string };
  };
  readonly llm: {
    provider: Env['LLM_PROVIDER'];
    model: string;
    bedrockRegion: string;
    openAiApiKey: string | undefined;
    priceInputPer1kUsd: number;
    priceOutputPer1kUsd: number;
  };
  readonly bootstrapSync: boolean;

  private constructor(env: Env) {
    this.env = env.NODE_ENV;
    this.appEnv = env.APP_ENV;
    this.logLevel = env.LOG_LEVEL;
    this.http = {
      port: env.PORT,
      corsOrigins: env.CORS_ORIGINS,
      trustProxy: env.TRUST_PROXY,
      swaggerEnabled: env.SWAGGER_ENABLED,
    };
    this.database = { url: env.DATABASE_URL };
    this.redis = { url: env.REDIS_URL };
    this.auth = {
      accessSecret: env.JWT_ACCESS_SECRET,
      accessTtlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
      refreshTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
      cookieSecure: env.COOKIE_SECURE,
      demoMode: env.DEMO_MODE,
    };
    this.connectors = {
      sgHr: { baseUrl: env.SG_HR_BASE_URL, apiKey: env.SG_HR_API_KEY },
      cnHq: {
        baseUrl: env.CN_HQ_BASE_URL,
        username: env.CN_HQ_USERNAME,
        password: env.CN_HQ_PASSWORD,
      },
      oa: {
        baseUrl: env.OA_BASE_URL,
        apiToken: env.OA_API_TOKEN,
        webhookSecret: env.OA_WEBHOOK_SECRET,
      },
    };
    this.llm = {
      provider: env.LLM_PROVIDER,
      model: env.LLM_MODEL ?? 'huitong-mock-1',
      bedrockRegion: env.BEDROCK_REGION,
      openAiApiKey: env.OPENAI_API_KEY,
      priceInputPer1kUsd: env.AI_PRICE_INPUT_PER_1K_USD,
      priceOutputPer1kUsd: env.AI_PRICE_OUTPUT_PER_1K_USD,
    };
    this.bootstrapSync = env.BOOTSTRAP_SYNC;
  }

  /** Validates the raw environment; throws {@link InvalidConfigError} with every problem found. */
  static fromEnv(raw: Readonly<Record<string, string | undefined>>): AppConfig {
    const parsed = envSchema.safeParse(raw);
    if (!parsed.success) {
      throw new InvalidConfigError(
        parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
      );
    }
    return new AppConfig(parsed.data);
  }
}
