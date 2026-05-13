import { registerAs } from '@nestjs/config';
import { getOptionalEnv } from './env';

export default registerAs('app', () => ({
  nodeEnv: getOptionalEnv('NODE_ENV', 'development'),
  port: parseInt(getOptionalEnv('PORT', '3000'), 10),
}));
