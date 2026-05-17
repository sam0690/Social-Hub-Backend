import { Module } from '@nestjs/common';
import { FeedController } from './controllers/feed.controller';
import { FeedService } from './services/feed.service';
import { FeedRepository } from './repositories/feed.repository';

@Module({
    controllers: [FeedController],
    providers: [FeedService, FeedRepository],
    exports: [FeedService],
})
export class FeedModule { }
