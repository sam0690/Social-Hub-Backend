import { registerAs } from '@nestjs/config';
import { getRequiredEnv } from './env';

export default registerAs('database', () => ({
  url: getRequiredEnv('DATABASE_URL'),
}));
