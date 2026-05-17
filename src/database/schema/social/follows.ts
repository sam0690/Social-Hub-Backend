import { pgTable, uuid, timestamp } from 'drizzle-orm/pg-core';
import { users } from '../auth/users';

export const follows = pgTable('follows', {
  followerId: uuid('follower_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  followingId: uuid('following_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Follow = typeof follows.$inferSelect;
export type NewFollow = typeof follows.$inferInsert;
