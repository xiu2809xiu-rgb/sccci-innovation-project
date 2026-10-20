import { z } from 'zod';

const configSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4102),
  CN_HQ_USERNAME: z.string().min(3).default('huitong_rfc'),
  CN_HQ_PASSWORD: z.string().min(8).default('cn-hq-local-pass'),
});

export interface CnHqConfig {
  port: number;
  username: string;
  password: string;
}

/** Reads and validates the environment once at start-up; invalid values stop the service. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): CnHqConfig {
  const parsed = configSchema.parse(env);
  return { port: parsed.PORT, username: parsed.CN_HQ_USERNAME, password: parsed.CN_HQ_PASSWORD };
}
