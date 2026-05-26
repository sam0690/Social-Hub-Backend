type EnvValue = string | undefined;

function readEnvValue(value: unknown): EnvValue {
  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getRequiredEnv(name: string): string {
  const value = readEnvValue(process.env[name]);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getOptionalEnv(name: string, fallback: string): string {
  return readEnvValue(process.env[name]) ?? fallback;
}

export function validateEnv(config: Record<string, unknown>) {
  const missing = [
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    // 'UPSTASH_REDIS_REST_URL',
    // 'UPSTASH_REDIS_REST_TOKEN',
  ].filter((name) => !readEnvValue(config[name]));

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  return {
    ...config,
    NODE_ENV: readEnvValue(config.NODE_ENV) ?? 'development',
    PORT: readEnvValue(config.PORT) ?? '3000',
    JWT_ACCESS_EXPIRES_IN: readEnvValue(config.JWT_ACCESS_EXPIRES_IN) ?? '15m',
    JWT_REFRESH_EXPIRES_IN: readEnvValue(config.JWT_REFRESH_EXPIRES_IN) ?? '7d',
  };
}
