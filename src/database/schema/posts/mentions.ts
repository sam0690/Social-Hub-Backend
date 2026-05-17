import { pgTable, uuid, timestamp } from 'drizzle-orm/pg-core';
import { users } from '../auth/users';
import { posts } from './posts';

export const mentions = pgTable('mentions', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  mentionedUserId: uuid('mentioned_user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Mention = typeof mentions.$inferSelect;
export type NewMention = typeof mentions.$inferInsert;
