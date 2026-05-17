import { Module, forwardRef } from '@nestjs/common';
import { FeedController } from './controllers/feed.controller';
import { FeedService } from './services/feed.service';
import { FeedRepository } from './repositories/feed.repository';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [forwardRef(() => UsersModule)],
    controllers: [FeedController],
    providers: [FeedService, FeedRepository],
    exports: [FeedService],
})
export class FeedModule { }

