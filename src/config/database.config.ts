import { registerAs } from '@nestjs/config';
import { getOptionalEnv } from './env';

function buildDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const databaseHost = process.env.DATABASE_HOST?.trim();
  const databasePort = process.env.DATABASE_PORT?.trim();
  const databaseUser = process.env.DATABASE_USER?.trim();
  const databasePassword = process.env.DATABASE_PASSWORD?.trim();
  const databaseName = process.env.DATABASE_NAME?.trim();

  const postgresUser = process.env.POSTGRES_USER?.trim();
  const postgresPassword = process.env.POSTGRES_PASSWORD?.trim();
  const postgresName = process.env.POSTGRES_DB?.trim();

  if (databaseUrl) {
    return databaseUrl;
  }

  const hasExplicitDatabaseFields =
    Boolean(databaseHost) ||
    Boolean(databasePort) ||
    Boolean(databaseUser) ||
    Boolean(databasePassword) ||
    Boolean(databaseName) ||
    Boolean(postgresUser) ||
    Boolean(postgresPassword) ||
    Boolean(postgresName);

  if (hasExplicitDatabaseFields) {
    const host = databaseHost ?? 'localhost';
    const port = databasePort ?? '5433';
    const user = databaseUser ?? postgresUser ?? 'postgres';
    const password = databasePassword ?? postgresPassword ?? '';
    const name = databaseName ?? postgresName ?? 'socialhub_dev';

    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${name}`;
  }

  throw new Error('Missing database connection settings');
}

export default registerAs('database', () => ({
  url: buildDatabaseUrl(),
  host: getOptionalEnv('DATABASE_HOST', 'localhost'),
  port: parseInt(getOptionalEnv('DATABASE_PORT', '5433'), 10),
}));
