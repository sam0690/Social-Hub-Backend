import { Inject, Injectable } from '@nestjs/common';
import { and, eq, ilike, isNull, ne, not, inArray, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../../database/database.module';
import * as schema from '../../../database/schema/index';

@Injectable()
export class UsersRepository {
  constructor(
    @Inject(DRIZZLE)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  // ── Find users ─────────────────────────────────────────
  async findById(id: string) {
    return this.db.query.users.findFirst({
      where: and(eq(schema.users.id, id), isNull(schema.users.deletedAt)),
    });
  }

  async findByUsername(username: string) {
    return this.db.query.users.findFirst({
      where: and(
        eq(schema.users.username, username),
        isNull(schema.users.deletedAt),
      ),
    });
  }

  async searchUsers(
    q: string,
    limit: number,
    offset: number,
    currentUserId: string,
  ) {
    const blockedIds = await this.getBlockedIds(currentUserId);

    return this.db.query.users.findMany({
      where: and(
        isNull(schema.users.deletedAt),
        ne(schema.users.id, currentUserId),
        ilike(schema.users.username, `%${q}%`),
        blockedIds.length > 0
          ? not(inArray(schema.users.id, blockedIds))
          : undefined,
      ),
      limit,
      offset,
      columns: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isVerified: true,
        isPrivate: true,
        bio: true,
      },
    });
  }

  // ── Update ─────────────────────────────────────────────
  async updateUser(id: string, data: Partial<schema.NewUser>) {
    const [user] = await this.db
      .update(schema.users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string) {
    await this.db
      .update(schema.users)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.users.id, id));
  }

  // ── Follows ────────────────────────────────────────────
  async follow(followerId: string, followingId: string) {
    await this.db
      .insert(schema.follows)
      .values({ followerId, followingId })
      .onConflictDoNothing();
  }

  async unfollow(followerId: string, followingId: string) {
    await this.db
      .delete(schema.follows)
      .where(
        and(
          eq(schema.follows.followerId, followerId),
          eq(schema.follows.followingId, followingId),
        ),
      );
  }

  async isFollowing(followerId: string, followingId: string) {
    const result = await this.db.query.follows.findFirst({
      where: and(
        eq(schema.follows.followerId, followerId),
        eq(schema.follows.followingId, followingId),
      ),
    });
    return !!result;
  }

  async getFollowers(userId: string, limit: number, offset: number) {
    return this.db.query.follows.findMany({
      where: eq(schema.follows.followingId, userId),
      limit,
      offset,
      with: {
        follower: {
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

  async getFollowing(userId: string, limit: number, offset: number) {
    return this.db.query.follows.findMany({
      where: eq(schema.follows.followerId, userId),
      limit,
      offset,
      with: {
        following: {
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

  async getFollowerCount(userId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.follows)
      .where(eq(schema.follows.followingId, userId));
    return Number(result[0]?.count ?? 0);
  }

  async getFollowingCount(userId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.follows)
      .where(eq(schema.follows.followerId, userId));
    return Number(result[0]?.count ?? 0);
  }

  // ── Block ──────────────────────────────────────────────
  async blockUser(blockerId: string, blockedId: string) {
    await this.db
      .insert(schema.blockedUsers)
      .values({ blockerId, blockedId })
      .onConflictDoNothing();

    // auto unfollow both ways on block
    await this.unfollow(blockerId, blockedId);
    await this.unfollow(blockedId, blockerId);
  }

  async unblockUser(blockerId: string, blockedId: string) {
    await this.db
      .delete(schema.blockedUsers)
      .where(
        and(
          eq(schema.blockedUsers.blockerId, blockerId),
          eq(schema.blockedUsers.blockedId, blockedId),
        ),
      );
  }

  async isBlocked(blockerId: string, blockedId: string) {
    const result = await this.db.query.blockedUsers.findFirst({
      where: and(
        eq(schema.blockedUsers.blockerId, blockerId),
        eq(schema.blockedUsers.blockedId, blockedId),
      ),
    });
    return !!result;
  }

  async getBlockedIds(userId: string): Promise<string[]> {
    const results = await this.db.query.blockedUsers.findMany({
      where: eq(schema.blockedUsers.blockerId, userId),
      columns: { blockedId: true },
    });
    return results.map((r) => r.blockedId);
  }

  async getBlockedUsers(userId: string) {
    return this.db.query.blockedUsers.findMany({
      where: eq(schema.blockedUsers.blockerId, userId),
      with: {
        blocked: {
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

  // ── Mute ───────────────────────────────────────────────
  async muteUser(muterId: string, mutedId: string) {
    await this.db
      .insert(schema.mutedUsers)
      .values({ muterId, mutedId })
      .onConflictDoNothing();
  }

  async unmuteUser(muterId: string, mutedId: string) {
    await this.db
      .delete(schema.mutedUsers)
      .where(
        and(
          eq(schema.mutedUsers.muterId, muterId),
          eq(schema.mutedUsers.mutedId, mutedId),
        ),
      );
  }

  async isMuted(muterId: string, mutedId: string) {
    const result = await this.db.query.mutedUsers.findFirst({
      where: and(
        eq(schema.mutedUsers.muterId, muterId),
        eq(schema.mutedUsers.mutedId, mutedId),
      ),
    });
    return !!result;
  }

  async getMutedUsers(userId: string) {
    return this.db.query.mutedUsers.findMany({
      where: eq(schema.mutedUsers.muterId, userId),
      with: {
        muted: {
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
}
