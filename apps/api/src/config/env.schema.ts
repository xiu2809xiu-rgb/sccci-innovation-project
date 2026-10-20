import { z } from 'zod';

/** The placeholder secret in `.env.example`; production refuses to start with it. */
export const EXAMPLE_JWT_SECRET = 'change-me-local-dev-only-32-characters-min';

const booleanish = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const commaList = z.string().transform((value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0),
);

/** Every environment variable the API reads (documented in `.env.example`). */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    /** What kind of deployment this is; the safety rules below apply to production only. */
    APP_ENV: z.enum(['local', 'demo', 'production']).default('local'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, 'must be a postgresql:// URL'),
    REDIS_URL: z.string().regex(/^rediss?:\/\//, 'must be a redis:// URL'),
    CORS_ORIGINS: commaList.default(['http://localhost:5173', 'http://localhost:8080']),
    TRUST_PROXY: booleanish.default(false),
    SWAGGER_ENABLED: booleanish.default(true),
    JWT_ACCESS_SECRET: z.string().min(32, 'must be at least 32 characters'),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
    COOKIE_SECURE: booleanish.default(true),
    DEMO_MODE: booleanish.default(false),
    SG_HR_BASE_URL: z.url().default('http://localhost:4101'),
    SG_HR_API_KEY: z.string().min(8).default('sg-hr-local-key'),
    CN_HQ_BASE_URL: z.url().default('http://localhost:4102'),
    CN_HQ_USERNAME: z.string().min(3).default('huitong_rfc'),
    CN_HQ_PASSWORD: z.string().min(8).default('cn-hq-local-pass'),
    OA_BASE_URL: z.url().default('http://localhost:4103'),
    OA_API_TOKEN: z.string().min(8).default('oa-local-token'),
    OA_WEBHOOK_SECRET: z.string().min(16).default('oa-local-webhook-secret'),
    LLM_PROVIDER: z.enum(['mock', 'bedrock', 'openai']).default('mock'),
    LLM_MODEL: z.string().min(1).optional(),
    BEDROCK_REGION: z.string().default('ap-southeast-1'),
    OPENAI_API_KEY: z.string().min(1).optional(),
    AI_PRICE_INPUT_PER_1K_USD: z.coerce.number().min(0).default(0.003),
    AI_PRICE_OUTPUT_PER_1K_USD: z.coerce.number().min(0).default(0.015),
    BOOTSTRAP_SYNC: booleanish.default(false),
  })
  .superRefine((env, ctx) => {
    if (env.APP_ENV === 'production') {
      if (env.DEMO_MODE) {
        ctx.addIssue({
          code: 'custom',
          path: ['DEMO_MODE'],
          message: 'must be false in production',
        });
      }
      if (!env.COOKIE_SECURE) {
        ctx.addIssue({
          code: 'custom',
          path: ['COOKIE_SECURE'],
          message: 'must be true in production',
        });
      }
      if (env.JWT_ACCESS_SECRET === EXAMPLE_JWT_SECRET) {
        ctx.addIssue({
          code: 'custom',
          path: ['JWT_ACCESS_SECRET'],
          message: 'must not be the example value in production',
        });
      }
    }
    if (env.LLM_PROVIDER !== 'mock' && !env.LLM_MODEL) {
      ctx.addIssue({
        code: 'custom',
        path: ['LLM_MODEL'],
        message: `is required when LLM_PROVIDER is ${env.LLM_PROVIDER}`,
      });
    }
    if (env.LLM_PROVIDER === 'openai' && !env.OPENAI_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['OPENAI_API_KEY'],
        message: 'is required when LLM_PROVIDER is openai',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;
