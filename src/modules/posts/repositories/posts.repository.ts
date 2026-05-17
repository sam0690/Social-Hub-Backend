import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, lt, desc, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../../database/database.module';
import * as schema from '../../../database/schema/index';

@Injectable()
export class PostsRepository {
  constructor(
    @Inject(DRIZZLE)
    private db: NodePgDatabase<typeof schema>,
  ) { }

  // ── Posts ──────────────────────────────────────────────
  async createPost(data: schema.NewPost) {
    const [post] = await this.db.insert(schema.posts).values(data).returning();
    return post;
  }

  async findPostById(id: string) {
    return this.db.query.posts.findFirst({
      where: and(eq(schema.posts.id, id), isNull(schema.posts.deletedAt)),
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
  }

  async getUserPosts(userId: string, limit: number, cursor?: string) {
    return this.db.query.posts.findMany({
      where: and(
        eq(schema.posts.authorId, userId),
        isNull(schema.posts.deletedAt),
        cursor
          ? lt(schema.posts.createdAt, this.getCursorDate(cursor))
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
  }

  async updatePost(id: string, data: Partial<schema.NewPost>) {
    const [post] = await this.db
      .update(schema.posts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.posts.id, id))
      .returning();
    return post;
  }

  async deletePost(id: string) {
    await this.db
      .update(schema.posts)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.posts.id, id));
  }

  // ── Likes ──────────────────────────────────────────────
  async likePost(userId: string, postId: string) {
    await this.db
      .insert(schema.likes)
      .values({ userId, postId, targetType: 'POST' })
      .onConflictDoNothing();

    await this.db
      .update(schema.posts)
      .set({ likeCount: sql`${schema.posts.likeCount} + 1` })
      .where(eq(schema.posts.id, postId));
  }

  async unlikePost(userId: string, postId: string) {
    const result = await this.db
      .delete(schema.likes)
      .where(
        and(
          eq(schema.likes.userId, userId),
          eq(schema.likes.postId, postId),
          eq(schema.likes.targetType, 'POST'),
        ),
      )
      .returning();

    if (result.length > 0) {
      await this.db
        .update(schema.posts)
        .set({ likeCount: sql`GREATEST(${schema.posts.likeCount} - 1, 0)` })
        .where(eq(schema.posts.id, postId));
    }
  }

  async isLiked(userId: string, postId: string) {
    const result = await this.db.query.likes.findFirst({
      where: and(
        eq(schema.likes.userId, userId),
        eq(schema.likes.postId, postId),
        eq(schema.likes.targetType, 'POST'),
      ),
    });
    return !!result;
  }

  async getPostLikes(postId: string, limit: number, cursor?: string) {
    return this.db.query.likes.findMany({
      where: and(
        eq(schema.likes.postId, postId),
        eq(schema.likes.targetType, 'POST'),
        cursor
          ? lt(schema.likes.createdAt, this.getCursorDate(cursor))
          : undefined,
      ),
      orderBy: desc(schema.likes.createdAt),
      limit,
      with: {
        user: {
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
  }

  async likeComment(userId: string, commentId: string) {
    await this.db
      .insert(schema.likes)
      .values({ userId, commentId, targetType: 'COMMENT' })
      .onConflictDoNothing();

    await this.db
      .update(schema.comments)
      .set({ likeCount: sql`${schema.comments.likeCount} + 1` })
      .where(eq(schema.comments.id, commentId));
  }

  async unlikeComment(userId: string, commentId: string) {
    const result = await this.db
      .delete(schema.likes)
      .where(
        and(
          eq(schema.likes.userId, userId),
          eq(schema.likes.commentId, commentId),
          eq(schema.likes.targetType, 'COMMENT'),
        ),
      )
      .returning();

    if (result.length > 0) {
      await this.db
        .update(schema.comments)
        .set({ likeCount: sql`GREATEST(${schema.comments.likeCount} - 1, 0)` })
        .where(eq(schema.comments.id, commentId));
    }
  }

  // ── Comments ───────────────────────────────────────────
  async createComment(data: schema.NewComment) {
    const [comment] = await this.db
      .insert(schema.comments)
      .values(data)
      .returning();

    await this.db
      .update(schema.posts)
      .set({ commentCount: sql`${schema.posts.commentCount} + 1` })
      .where(eq(schema.posts.id, data.postId));

    if (data.parentCommentId) {
      await this.db
        .update(schema.comments)
        .set({ replyCount: sql`${schema.comments.replyCount} + 1` })
        .where(eq(schema.comments.id, data.parentCommentId));
    }

    return comment;
  }

  async getPostComments(postId: string, limit: number, cursor?: string) {
    return this.db.query.comments.findMany({
      where: and(
        eq(schema.comments.postId, postId),
        isNull(schema.comments.parentCommentId),
        isNull(schema.comments.deletedAt),
        cursor
          ? lt(schema.comments.createdAt, this.getCursorDate(cursor))
          : undefined,
      ),
      orderBy: desc(schema.comments.createdAt),
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
  }

  async getCommentReplies(commentId: string, limit: number, cursor?: string) {
    return this.db.query.comments.findMany({
      where: and(
        eq(schema.comments.parentCommentId, commentId),
        isNull(schema.comments.deletedAt),
        cursor
          ? lt(schema.comments.createdAt, this.getCursorDate(cursor))
          : undefined,
      ),
      orderBy: desc(schema.comments.createdAt),
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
  }

  async deleteComment(id: string, postId: string) {
    await this.db
      .update(schema.comments)
      .set({ deletedAt: new Date() })
      .where(eq(schema.comments.id, id));

    await this.db
      .update(schema.posts)
      .set({ commentCount: sql`GREATEST(${schema.posts.commentCount} - 1, 0)` })
      .where(eq(schema.posts.id, postId));
  }

  async findCommentById(id: string) {
    return this.db.query.comments.findFirst({
      where: and(eq(schema.comments.id, id), isNull(schema.comments.deletedAt)),
    });
  }

  // ── Bookmarks ──────────────────────────────────────────
  async bookmarkPost(userId: string, postId: string) {
    await this.db
      .insert(schema.bookmarks)
      .values({ userId, postId })
      .onConflictDoNothing();
  }

  async unbookmarkPost(userId: string, postId: string) {
    await this.db
      .delete(schema.bookmarks)
      .where(
        and(
          eq(schema.bookmarks.userId, userId),
          eq(schema.bookmarks.postId, postId),
        ),
      );
  }

  async isBookmarked(userId: string, postId: string) {
    const result = await this.db.query.bookmarks.findFirst({
      where: and(
        eq(schema.bookmarks.userId, userId),
        eq(schema.bookmarks.postId, postId),
      ),
    });
    return !!result;
  }

  async getUserBookmarks(userId: string, limit: number, cursor?: string) {
    return this.db.query.bookmarks.findMany({
      where: and(
        eq(schema.bookmarks.userId, userId),
        cursor
          ? lt(schema.bookmarks.createdAt, this.getCursorDate(cursor))
          : undefined,
      ),
      orderBy: desc(schema.bookmarks.createdAt),
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
  }

  async getPostsByHashtag(hashtagName: string, limit: number, cursor?: string) {
    const hashtag = await this.db.query.hashtags.findFirst({
      where: eq(schema.hashtags.name, hashtagName.toLowerCase()),
    });

    if (!hashtag) {
      return [];
    }

    return this.db.query.postHashtags.findMany({
      where: and(
        eq(schema.postHashtags.hashtagId, hashtag.id),
        cursor
          ? lt(schema.postHashtags.createdAt, this.getCursorDate(cursor))
          : undefined,
      ),
      orderBy: desc(schema.postHashtags.createdAt),
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
  }

  // ── Hashtags ───────────────────────────────────────────
  async upsertHashtag(name: string) {
    const [hashtag] = await this.db
      .insert(schema.hashtags)
      .values({ name: name.toLowerCase() })
      .onConflictDoUpdate({
        target: schema.hashtags.name,
        set: { postCount: sql`${schema.hashtags.postCount} + 1` },
      })
      .returning();
    return hashtag;
  }

  async linkHashtagToPost(postId: string, hashtagId: string) {
    await this.db
      .insert(schema.postHashtags)
      .values({ postId, hashtagId })
      .onConflictDoNothing();
  }

  // ── Mentions ───────────────────────────────────────────
  async createMention(postId: string, mentionedUserId: string) {
    await this.db
      .insert(schema.mentions)
      .values({ postId, mentionedUserId })
      .onConflictDoNothing();
  }

  // ── Helpers ────────────────────────────────────────────
  private getCursorDate(cursor: string): Date {
    return new Date(Buffer.from(cursor, 'base64url').toString('utf-8'));
  }

  encodeCursor(date: Date): string {
    return Buffer.from(date.toISOString()).toString('base64url');
  }
}
