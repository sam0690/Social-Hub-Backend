import { pgTable, uuid, timestamp } from 'drizzle-orm/pg-core';
import { users } from '../auth/users';

export const mutedUsers = pgTable('muted_users', {
  muterId: uuid('muter_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  mutedId: uuid('muted_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type MutedUser = typeof mutedUsers.$inferSelect;
export type NewMutedUser = typeof mutedUsers.$inferInsert;
