import { AppConfig, InvalidConfigError } from './app-config.js';
import { EXAMPLE_JWT_SECRET } from './env.schema.js';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'x'.repeat(40),
};

describe('AppConfig', () => {
  it('applies documented defaults', () => {
    const config = AppConfig.fromEnv(base);
    expect(config.http.port).toBe(3000);
    expect(config.auth.accessTtlSeconds).toBe(900);
    expect(config.auth.demoMode).toBe(false);
    expect(config.http.corsOrigins).toEqual(['http://localhost:5173', 'http://localhost:8080']);
    expect(config.llm.provider).toBe('mock');
  });

  it('fails at start-up with every problem listed when variables are missing', () => {
    expect(() => AppConfig.fromEnv({})).toThrow(InvalidConfigError);
    try {
      AppConfig.fromEnv({});
    } catch (error) {
      expect(String(error)).toContain('DATABASE_URL');
      expect(String(error)).toContain('JWT_ACCESS_SECRET');
    }
  });

  it('refuses unsafe production settings', () => {
    expect(() =>
      AppConfig.fromEnv({
        ...base,
        APP_ENV: 'production',
        DEMO_MODE: 'true',
        COOKIE_SECURE: 'false',
        JWT_ACCESS_SECRET: EXAMPLE_JWT_SECRET,
      }),
    ).toThrow(/DEMO_MODE[\s\S]*COOKIE_SECURE[\s\S]*JWT_ACCESS_SECRET/);
  });

  it('allows demo settings outside production deployments', () => {
    const config = AppConfig.fromEnv({
      ...base,
      NODE_ENV: 'production',
      APP_ENV: 'demo',
      DEMO_MODE: 'true',
    });
    expect(config.auth.demoMode).toBe(true);
  });

  it('requires a model name for a real LLM provider', () => {
    expect(() => AppConfig.fromEnv({ ...base, LLM_PROVIDER: 'bedrock' })).toThrow(/LLM_MODEL/);
  });
});
