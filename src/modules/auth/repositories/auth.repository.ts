import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../../database/database.module';
import { users, type NewUser } from '../../../database/schema/users';
import { sessions, type NewSession } from '../../../database/schema/sessions';
import {
  emailVerifications,
  type NewEmailVerification,
} from '../../../database/schema/email-verifications';
import {
  passwordResets,
  type NewPasswordReset,
} from '../../../database/schema/password-resets';

type AuthSchema = {
  users: typeof users;
  sessions: typeof sessions;
  emailVerifications: typeof emailVerifications;
  passwordResets: typeof passwordResets;
};

@Injectable()
export class AuthRepository {
  constructor(
    @Inject(DRIZZLE)
    private db: NodePgDatabase<AuthSchema>,
  ) {}

  // ── Users ──────────────────────────────────────────────
  async findUserByEmail(email: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return user;
  }

  async findUserById(id: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return user;
  }

  async findUserByUsername(username: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return user;
  }

  async createUser(data: NewUser) {
    const [user] = await this.db.insert(users).values(data).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<NewUser>) {
    const [user] = await this.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // ── Sessions ───────────────────────────────────────────
  async createSession(data: NewSession) {
    const [session] = await this.db.insert(sessions).values(data).returning();
    return session;
  }

  async findSessionByUserId(userId: string) {
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
      .limit(1);
    return session;
  }

  async revokeSession(id: string) {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.id, id));
  }

  async revokeAllUserSessions(userId: string) {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
  }

  // ── Email verification ─────────────────────────────────
  async createEmailVerification(data: NewEmailVerification) {
    const [verification] = await this.db
      .insert(emailVerifications)
      .values(data)
      .returning();
    return verification;
  }

  async findEmailVerification(userId: string, tokenHash: string) {
    const [verification] = await this.db
      .select()
      .from(emailVerifications)
      .where(
        and(
          eq(emailVerifications.userId, userId),
          eq(emailVerifications.tokenHash, tokenHash),
          isNull(emailVerifications.usedAt),
          gt(emailVerifications.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return verification;
  }

  async markEmailVerificationUsed(id: string) {
    await this.db
      .update(emailVerifications)
      .set({ usedAt: new Date() })
      .where(eq(emailVerifications.id, id));
  }

  // ── Password reset ─────────────────────────────────────
  async createPasswordReset(data: NewPasswordReset) {
    const [reset] = await this.db
      .insert(passwordResets)
      .values(data)
      .returning();
    return reset;
  }

  async findPasswordReset(tokenHash: string) {
    const [reset] = await this.db
      .select()
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.tokenHash, tokenHash),
          isNull(passwordResets.usedAt),
          gt(passwordResets.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return reset;
  }

  async markPasswordResetUsed(id: string) {
    await this.db
      .update(passwordResets)
      .set({ usedAt: new Date() })
      .where(eq(passwordResets.id, id));
  }
}
