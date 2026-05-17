import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FeedService } from '../services/feed.service';
import { GetFeedDto } from '../dto/get-feed.dto';
import { ApiAuthEndpoint } from '../../../common/decorators/swagger.decorators';

type AuthRequest<TUser = { id: string }> = Request & {
    user: TUser;
};

@ApiTags('Feed')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/feed')
export class FeedController {
    constructor(private feedService: FeedService) { }

    @Get()
    @ApiAuthEndpoint('Get home feed', {
        ok: 'Paginated hybrid feed — inbox + celebrity posts merged',
    })
    getHomeFeed(@Query() dto: GetFeedDto, @Req() req: AuthRequest) {
        return this.feedService.getHomeFeed(req.user.id, dto);
    }

    @Get('following')
    @ApiAuthEndpoint('Get chronological following feed', {
        ok: 'Paginated posts from followed users in chronological order',
    })
    getFollowingFeed(@Query() dto: GetFeedDto, @Req() req: AuthRequest) {
        return this.feedService.getFollowingFeed(req.user.id, dto);
    }

    @Get('trending')
    @ApiAuthEndpoint('Get trending feed', {
        ok: 'Paginated trending posts by engagement score',
    })
    getTrendingFeed(@Query() dto: GetFeedDto, @Req() req: AuthRequest) {
        return this.feedService.getTrendingFeed(req.user.id, dto);
    }
}
