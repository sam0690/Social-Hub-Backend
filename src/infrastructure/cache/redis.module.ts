import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';

@Global()
@Module({
  imports: [
    RedisModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        type: 'single',
        url: `redis://${config.get<string>('REDIS_HOST') ?? 'localhost'}:${config.get<string>('REDIS_PORT') ?? '6379'}`,
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [RedisModule],
})
export class CacheModule {}
