import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { users } from '../auth/users';
import { posts } from './posts';

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id')
    .notNull()
    .references(() => posts.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  parentCommentId: uuid('parent_comment_id'),
  content: text('content').notNull(),
  likeCount: integer('like_count').notNull().default(0),
  replyCount: integer('reply_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
