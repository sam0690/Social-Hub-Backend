import { registerAs } from '@nestjs/config';
import { getOptionalEnv, getRequiredEnv } from './env';

export default registerAs('auth', () => ({
  jwtAccessSecret: getRequiredEnv('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: getRequiredEnv('JWT_REFRESH_SECRET'),
  jwtAccessExpiresIn: getOptionalEnv('JWT_ACCESS_EXPIRES_IN', '15m'),
  jwtRefreshExpiresIn: getOptionalEnv('JWT_REFRESH_EXPIRES_IN', '30d'),
}));
