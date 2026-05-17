import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, isNull, lt, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../../database/database.module';
import * as schema from '../../../database/schema/index';

const CELEBRITY_THRESHOLD = 1000;

/** Author shape returned by all feed queries (5 specific columns). */
export interface FeedAuthor {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
}

/** Post with embedded author — returned by getCelebrityPosts / getTrendingPosts. */
export interface FeedPostWithAuthor {
  id: string;
  authorId: string;
  content: string;
  visibility: 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';
  likeCount: number;
  commentCount: number;
  shareCount: number;
  mediaCount: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  author: FeedAuthor;
}

/** Minimal post row returned by getUserPostIds for backfill. */
export interface PostIdRow {
  id: string;
  createdAt: Date;
  authorId: string;
}

/** Feed inbox item with nested post — returned by getFeedInboxPosts. */
export interface FeedInboxItem {
  id: string;
  userId: string;
  postId: string;
  postAuthorId: string;
  createdAt: Date;
  post: FeedPostWithAuthor;
}

@Injectable()
export class FeedRepository {
  constructor(
    @Inject(DRIZZLE)
    private db: NodePgDatabase<typeof schema>,
  ) { }

  // ── Helpers ────────────────────────────────────────────
  encodeCursor(date: Date): string {
    return Buffer.from(date.toISOString()).toString('base64url');
  }

  decodeCursor(cursor: string): Date {
    return new Date(Buffer.from(cursor, 'base64url').toString('utf-8'));
  }

  // ── Celebrity check ────────────────────────────────────
  async isCelebrity(userId: string): Promise<boolean> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.follows)
      .where(eq(schema.follows.followingId, userId));
    return Number(result[0]?.count ?? 0) > CELEBRITY_THRESHOLD;
  }

  // ── Following helpers ──────────────────────────────────
  async getFollowerIds(userId: string): Promise<string[]> {
    const results = await this.db.query.follows.findMany({
      where: eq(schema.follows.followingId, userId),
      columns: { followerId: true },
    });
    return results.map((r) => r.followerId);
  }

  async getFollowingIds(userId: string): Promise<string[]> {
    const results = await this.db.query.follows.findMany({
      where: eq(schema.follows.followerId, userId),
      columns: { followingId: true },
    });
    return results.map((r) => r.followingId);
  }

  async getCelebrityFollowingIds(userId: string): Promise<string[]> {
    const following = await this.db.query.follows.findMany({
      where: eq(schema.follows.followerId, userId),
      columns: { followingId: true },
    });

    const celebrities: string[] = [];
    for (const { followingId } of following) {
      const isCeleb = await this.isCelebrity(followingId);
      if (isCeleb) celebrities.push(followingId);
    }
    return celebrities;
  }

  // ── Fan-out on write ───────────────────────────────────
  async fanOutPostToFollowers(
    postId: string,
    authorId: string,
    followerIds: string[],
  ) {
    if (followerIds.length === 0) return;

    const values = followerIds.map((followerId) => ({
      userId: followerId,
      postId,
      postAuthorId: authorId,
    }));

    // batch insert in chunks of 500 to avoid query size limits
    const chunkSize = 500;
    for (let i = 0; i < values.length; i += chunkSize) {
      const chunk = values.slice(i, i + chunkSize);
      await this.db
        .insert(schema.feedItems)
        .values(chunk)
        .onConflictDoNothing();
    }
  }

  async removeFeedItemsForPost(postId: string) {
    await this.db
      .delete(schema.feedItems)
      .where(eq(schema.feedItems.postId, postId));
  }

  /**
   * Returns the last `limit` public, non-deleted posts by `authorId`.
   * Used to backfill a new follower's inbox.
   */
  async getUserPostIds(authorId: string, limit: number): Promise<PostIdRow[]> {
    const results = await this.db.query.posts.findMany({
      where: and(
        eq(schema.posts.authorId, authorId),
        isNull(schema.posts.deletedAt),
        eq(schema.posts.visibility, 'PUBLIC'),
      ),
      orderBy: desc(schema.posts.createdAt),
      limit,
      columns: { id: true, createdAt: true, authorId: true },
    });
    return results;
  }

  /**
   * Deletes all feed_items belonging to `userId` that were posted by `authorId`.
   * Called when a user unfollows someone.
   */
  async removeFeedItemsForAuthor(userId: string, authorId: string): Promise<void> {
    await this.db
      .delete(schema.feedItems)
      .where(
        and(
          eq(schema.feedItems.userId, userId),
          eq(schema.feedItems.postAuthorId, authorId),
        ),
      );
  }

  /**
   * Queries posts directly from people the user follows (chronological order).
   * Used for the `/following` feed tab — always fresh, no cache.
   */
  async getFollowingPostsChronological(
    followingIds: string[],
    limit: number,
    cursor?: string,
  ): Promise<FeedPostWithAuthor[]> {
    if (followingIds.length === 0) return [];

    const results = await this.db.query.posts.findMany({
      where: and(
        inArray(schema.posts.authorId, followingIds),
        isNull(schema.posts.deletedAt),
        eq(schema.posts.visibility, 'PUBLIC'),
        cursor
          ? lt(schema.posts.createdAt, this.decodeCursor(cursor))
          : undefined,
      ),
      orderBy: desc(schema.posts.createdAt),
      limit,
      with: {
        author: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
    });
    return results;
  }

  // ── Feed inbox (pre-built items) ───────────────────────
  async getFeedInboxPosts(
    userId: string,
    limit: number,
    cursor?: string,
  ): Promise<FeedInboxItem[]> {
    const results = await this.db.query.feedItems.findMany({
      where: and(
        eq(schema.feedItems.userId, userId),
        cursor
          ? lt(schema.feedItems.createdAt, this.decodeCursor(cursor))
          : undefined,
      ),
      orderBy: desc(schema.feedItems.createdAt),
      limit,
      with: {
        post: {
          with: {
            author: {
              columns: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                isVerified: true,
              },
            },
          },
        },
      },
    });
    return results;
  }

  // ── Celebrity posts (fetched at read time) ─────────────
  async getCelebrityPosts(
    celebrityIds: string[],
    limit: number,
    cursor?: string,
  ): Promise<FeedPostWithAuthor[]> {
    if (celebrityIds.length === 0) return [] as FeedPostWithAuthor[];

    const results = await this.db.query.posts.findMany({
      where: and(
        inArray(schema.posts.authorId, celebrityIds),
        isNull(schema.posts.deletedAt),
        eq(schema.posts.visibility, 'PUBLIC'),
        cursor
          ? lt(schema.posts.createdAt, this.decodeCursor(cursor))
          : undefined,
      ),
      orderBy: desc(schema.posts.createdAt),
      limit,
      with: {
        author: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
    });
    return results;
  }

  // ── Trending posts ─────────────────────────────────────
  async getTrendingPosts(
    limit: number,
    cursor?: string,
  ): Promise<FeedPostWithAuthor[]> {
    const results = await this.db.query.posts.findMany({
      where: and(
        isNull(schema.posts.deletedAt),
        eq(schema.posts.visibility, 'PUBLIC'),
        cursor
          ? lt(schema.posts.createdAt, this.decodeCursor(cursor))
          : undefined,
      ),
      orderBy: [
        desc(
          sql`(${schema.posts.likeCount} * 3 + ${schema.posts.commentCount} * 2 + ${schema.posts.shareCount})`,
        ),
        desc(schema.posts.createdAt),
      ],
      limit,
      with: {
        author: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
    });
    return results;
  }

  // ── Like/bookmark status enrichment ───────────────────
  async getLikedStatuses(
    userId: string,
    postIds: string[],
  ): Promise<Set<string>> {
    if (postIds.length === 0) return new Set();
    const results = await this.db.query.likes.findMany({
      where: and(
        eq(schema.likes.userId, userId),
        inArray(schema.likes.postId, postIds),
        eq(schema.likes.targetType, 'POST'),
      ),
      columns: { postId: true },
    });
    return new Set(results.map((r) => r.postId!));
  }

  async getBookmarkedStatuses(
    userId: string,
    postIds: string[],
  ): Promise<Set<string>> {
    if (postIds.length === 0) return new Set();
    const results = await this.db.query.bookmarks.findMany({
      where: and(
        eq(schema.bookmarks.userId, userId),
        inArray(schema.bookmarks.postId, postIds),
      ),
      columns: { postId: true },
    });
    return new Set(results.map((r) => r.postId));
  }
}
