import { registerAs } from '@nestjs/config';
import { getOptionalEnv } from './env';

export default registerAs('redis', () => ({
  host: getOptionalEnv('REDIS_HOST', 'localhost'),
  port: parseInt(getOptionalEnv('REDIS_PORT', '6379'), 10),
}));
