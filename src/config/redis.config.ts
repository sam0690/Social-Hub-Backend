import { registerAs } from '@nestjs/config';
import { getOptionalEnv } from './env';

export default registerAs('redis', () => ({
  url: getOptionalEnv('UPSTASH_REDIS_REST_URL', ''),
  token: getOptionalEnv('UPSTASH_REDIS_REST_TOKEN', ''),
  host: getOptionalEnv('REDIS_HOST', 'localhost'),
  port: parseInt(getOptionalEnv('REDIS_PORT', '6379'), 10),
}));
