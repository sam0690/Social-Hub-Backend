import { pgTable, uuid, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { users } from '../auth/users';
import { posts } from './posts';
import { comments } from './comments';

export const likeTargetEnum = pgEnum('like_target', ['POST', 'COMMENT']);

export const likes = pgTable('likes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  postId: uuid('post_id').references(() => posts.id, { onDelete: 'cascade' }),
  commentId: uuid('comment_id').references(() => comments.id, {
    onDelete: 'cascade',
  }),
  targetType: likeTargetEnum('target_type').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Like = typeof likes.$inferSelect;
export type NewLike = typeof likes.$inferInsert;
