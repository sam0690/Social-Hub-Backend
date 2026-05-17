import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { FeedRepository } from '../repositories/feed.repository';
import {
  FeedInboxItem,
  FeedPostWithAuthor,
} from '../repositories/feed.repository';
import { GetFeedDto } from '../dto/get-feed.dto';

type FeedSourceItem = FeedInboxItem | FeedPostWithAuthor;
type FeedResponsePost = FeedPostWithAuthor & {
  isLiked: boolean;
  isBookmarked: boolean;
};
type FeedItem = FeedSourceItem | FeedResponsePost;

export interface PaginatedFeedResponse {
  data: FeedResponsePost[];
  nextCursor: string | null;
  hasMore: boolean;
}

@Injectable()
export class FeedService {
  private readonly FEED_CACHE_TTL = 60;
  private readonly TRENDING_CACHE_TTL = 300;

  constructor(
    private feedRepository: FeedRepository,
    @InjectRedis() private redis: Redis,
  ) { }

  // ── Helpers ────────────────────────────────────────────
  private buildPaginatedResponse<T>(
    items: T[],
    limit: number,
    getCursorValue: (item: T) => Date,
  ): { data: T[]; nextCursor: string | null; hasMore: boolean } {
    const hasMore = items.length > limit;
    const pageItems = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore
      ? this.feedRepository.encodeCursor(
        getCursorValue(pageItems[pageItems.length - 1]),
      )
      : null;
    return { data: pageItems, nextCursor, hasMore };
  }

  private isInboxItem(item: FeedItem): item is FeedInboxItem {
    return 'post' in item && typeof item.post === 'object';
  }

  private getPostId(item: FeedItem): string {
    return this.isInboxItem(item) ? item.post.id : item.id;
  }

  private getCreatedAt(item: FeedItem): Date {
    return this.isInboxItem(item) ? item.post.createdAt : item.createdAt;
  }

  private mergeSortDeduplicate(
    inboxPosts: FeedInboxItem[],
    celebrityPosts: FeedPostWithAuthor[],
  ): FeedSourceItem[] {
    // tag source for debugging
    const tagged: (FeedSourceItem & { _source: string })[] = [
      ...inboxPosts.map((p) => ({ ...p, _source: 'inbox' as const })),
      ...celebrityPosts.map((p) => ({ ...p, _source: 'celebrity' as const })),
    ];

    // deduplicate by post id
    const seen = new Set<string>();
    const unique = tagged.filter((p) => {
      const id = this.getPostId(p);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    // sort by createdAt desc
    unique.sort((a, b) => {
      const aDate = new Date(this.getCreatedAt(a)).getTime();
      const bDate = new Date(this.getCreatedAt(b)).getTime();
      return bDate - aDate;
    });

    return unique;
  }

  private normalizePost(item: FeedItem): FeedResponsePost {
    // inbox items have { post: {...}, createdAt }
    // celebrity/trending items are the post directly
    const post: FeedPostWithAuthor = this.isInboxItem(item) ? item.post : item;
    return {
      ...post,
      isLiked: false,
      isBookmarked: false,
    };
  }

  private async enrichWithStatuses(
    posts: FeedItem[],
    userId: string,
  ): Promise<FeedResponsePost[]> {
    if (posts.length === 0) return [];

    const postIds: string[] = posts.map((p) => this.getPostId(p));

    const [likedSet, bookmarkedSet] = await Promise.all([
      this.feedRepository.getLikedStatuses(userId, postIds),
      this.feedRepository.getBookmarkedStatuses(userId, postIds),
    ]);

    return posts.map((item) => {
      const postId = this.getPostId(item);
      return {
        ...this.normalizePost(item),
        isLiked: likedSet.has(postId),
        isBookmarked: bookmarkedSet.has(postId),
      };
    });
  }

  // ── Fan-out on write (called when user creates a post) ──
  async fanOutPost(postId: string, authorId: string): Promise<void> {
    const isCelebrity = await this.feedRepository.isCelebrity(authorId);

    if (isCelebrity) {
      // celebrities skip write fan-out
      // their posts are fetched at read time
      return;
    }

    // normal users — push to all followers inboxes
    const followerIds = await this.feedRepository.getFollowerIds(authorId);
    await this.feedRepository.fanOutPostToFollowers(
      postId,
      authorId,
      followerIds,
    );

    // invalidate followers feed cache
    await Promise.all(followerIds.map((id) => this.invalidateUserFeed(id)));
  }

  async removeFanOutPost(postId: string, authorId: string): Promise<void> {
    await this.feedRepository.removeFeedItemsForPost(postId);
    const followerIds = await this.feedRepository.getFollowerIds(authorId);
    await Promise.all(followerIds.map((id) => this.invalidateUserFeed(id)));
  }

  // ── Home feed ──────────────────────────────────────────
  async getHomeFeed(
    userId: string,
    dto: GetFeedDto,
  ): Promise<PaginatedFeedResponse> {
    const limit = dto.limit ?? 10;
    const cacheKey = `feed:home:${userId}:${limit}`;

    // serve from cache for first page only
    if (!dto.cursor) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as PaginatedFeedResponse;
      }
    }

    // get following ids
    const followingIds = await this.feedRepository.getFollowingIds(userId);

    // no one followed → fall back to trending
    if (followingIds.length === 0) {
      return this.getTrendingFeed(userId, dto);
    }

    // fetch celebrity following ids
    const celebrityIds =
      await this.feedRepository.getCelebrityFollowingIds(userId);

    // fetch in parallel — inbox + celebrity posts
    const fetchLimit = limit + 10; // fetch extra to account for dedup
    const [inboxItems, celebrityPosts] = await Promise.all([
      this.feedRepository.getFeedInboxPosts(userId, fetchLimit, dto.cursor),
      this.feedRepository.getCelebrityPosts(
        celebrityIds,
        fetchLimit,
        dto.cursor,
      ),
    ]);

    // merge, deduplicate, sort
    const merged = this.mergeSortDeduplicate(inboxItems, celebrityPosts);

    // enrich with like/bookmark status
    const enriched = await this.enrichWithStatuses(merged, userId);
    const response = this.buildPaginatedResponse(
      enriched,
      limit,
      (post) => post.createdAt,
    );

    // cache first page
    if (!dto.cursor) {
      await this.redis.setex(
        cacheKey,
        this.FEED_CACHE_TTL,
        JSON.stringify(response),
      );
    }

    return response;
  }

  // ── Trending feed ──────────────────────────────────────
  async getTrendingFeed(
    userId: string,
    dto: GetFeedDto,
  ): Promise<PaginatedFeedResponse> {
    const limit = dto.limit ?? 10;
    const cacheKey = `feed:trending:${limit}`;

    if (!dto.cursor) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as PaginatedFeedResponse;
        const enriched = await this.enrichWithStatuses(parsed.data, userId);
        return { ...parsed, data: enriched };
      }
    }

    const posts = await this.feedRepository.getTrendingPosts(
      limit + 1,
      dto.cursor,
    );
    const response = this.buildPaginatedResponse(
      posts,
      limit,
      (post) => post.createdAt,
    );

    if (!dto.cursor) {
      await this.redis.setex(
        cacheKey,
        this.TRENDING_CACHE_TTL,
        JSON.stringify(response),
      );
    }

    const enriched = await this.enrichWithStatuses(response.data, userId);
    return {
      ...response,
      data: enriched,
    };
  }

  // ── Cache invalidation ─────────────────────────────────
  async invalidateUserFeed(userId: string): Promise<void> {
    const cacheKeys = await this.redis.keys(`feed:home:${userId}:*`);
    if (cacheKeys.length > 0) {
      await this.redis.del(...cacheKeys);
    }
  }
}
