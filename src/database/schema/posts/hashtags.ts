import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';
import { posts } from './posts';

export const hashtags = pgTable('hashtags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  postCount: integer('post_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const postHashtags = pgTable('post_hashtags', {
  postId: uuid('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  hashtagId: uuid('hashtag_id')
    .notNull()
    .references(() => hashtags.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Hashtag = typeof hashtags.$inferSelect;
export type NewHashtag = typeof hashtags.$inferInsert;
export type PostHashtag = typeof postHashtags.$inferSelect;
