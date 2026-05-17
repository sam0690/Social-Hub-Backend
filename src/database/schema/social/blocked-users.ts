import { pgTable, uuid, timestamp } from 'drizzle-orm/pg-core';
import { users } from '../auth/users';

export const blockedUsers = pgTable('blocked_users', {
  blockerId: uuid('blocker_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  blockedId: uuid('blocked_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type BlockedUser = typeof blockedUsers.$inferSelect;
export type NewBlockedUser = typeof blockedUsers.$inferInsert;
