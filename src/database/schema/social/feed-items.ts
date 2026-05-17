import { pgTable, uuid, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from '../auth/users';
import { posts } from '../posts/posts';

export const feedItems = pgTable(
  'feed_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    postAuthorId: uuid('post_author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('feed_items_user_id_idx').on(table.userId),
    createdAtIdx: index('feed_items_created_at_idx').on(table.createdAt),
  }),
);

export type FeedItem = typeof feedItems.$inferSelect;
export type NewFeedItem = typeof feedItems.$inferInsert;
