import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis as UpstashRedis } from '@upstash/redis';
import Redis from 'ioredis';

export const UPSTASH_REDIS = Symbol('UPSTASH_REDIS');

@Global()
@Module({
  providers: [
    {
      provide: UPSTASH_REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('redis.url');
        const token = config.get<string>('redis.token');

        if (url && token) {
          return new UpstashRedis({ url, token });
        }

        return new Redis({
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
        });
      },
    },
  ],
  exports: [UPSTASH_REDIS],
})
export class CacheModule {}
