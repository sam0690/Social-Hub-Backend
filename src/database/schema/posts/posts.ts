import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { users } from '../auth/users';

export const visibilityEnum = pgEnum('visibility', [
  'PUBLIC',
  'FOLLOWERS',
  'PRIVATE',
]);

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  visibility: visibilityEnum('visibility').notNull().default('PUBLIC'),
  likeCount: integer('like_count').notNull().default(0),
  commentCount: integer('comment_count').notNull().default(0),
  shareCount: integer('share_count').notNull().default(0),
  mediaCount: integer('media_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
