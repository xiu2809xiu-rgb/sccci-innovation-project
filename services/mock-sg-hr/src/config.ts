import { z } from 'zod';

const configSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4101),
  SG_HR_API_KEY: z.string().min(8).default('sg-hr-local-key'),
});

export interface SgHrConfig {
  port: number;
  apiKey: string;
}

/** Reads and validates the environment once at start-up; invalid values stop the service. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): SgHrConfig {
  const parsed = configSchema.parse(env);
  return { port: parsed.PORT, apiKey: parsed.SG_HR_API_KEY };
}
