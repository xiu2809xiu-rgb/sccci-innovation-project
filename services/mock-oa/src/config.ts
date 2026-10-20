import { z } from 'zod';

const configSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4103),
  OA_API_TOKEN: z.string().min(8).default('oa-local-token'),
  OA_WEBHOOK_SECRET: z.string().min(16).default('oa-local-webhook-secret'),
  OA_WEBHOOK_URL: z.url().optional(),
});

export interface OaConfig {
  port: number;
  apiToken: string;
  webhookSecret: string;
  /** Static subscriber for `approval.completed` (docker compose points it at the API). */
  webhookUrl: string | undefined;
  /** Delays before the second and third delivery attempts. */
  retryDelaysMs: readonly number[];
}

/** Reads and validates the environment once at start-up; invalid values stop the service. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): OaConfig {
  const parsed = configSchema.parse(env);
  return {
    port: parsed.PORT,
    apiToken: parsed.OA_API_TOKEN,
    webhookSecret: parsed.OA_WEBHOOK_SECRET,
    webhookUrl: parsed.OA_WEBHOOK_URL,
    retryDelaysMs: [1000, 4000],
  };
}
