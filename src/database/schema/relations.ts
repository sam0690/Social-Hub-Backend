import { relations } from 'drizzle-orm';
import { bookmarks } from './posts/bookmarks';
import { comments } from './posts/comments';
import { hashtags, postHashtags } from './posts/hashtags';
import { likes } from './posts/likes';
import { mentions } from './posts/mentions';
import { posts } from './posts/posts';
import { blockedUsers } from './social/blocked-users';
import { follows } from './social/follows';
import { mutedUsers } from './social/muted-users';
import { sessions } from './auth/sessions';
import { users } from './auth/users';
import { feedItems } from './social/feed-items';

export const usersRelations = relations(users, ({ many }) => ({
  followers: many(follows, { relationName: 'following' }),
  following: many(follows, { relationName: 'follower' }),
  blockedUsers: many(blockedUsers, { relationName: 'blocker' }),
  mutedUsers: many(mutedUsers, { relationName: 'muter' }),
  sessions: many(sessions),
  posts: many(posts),
  likes: many(likes),
  bookmarks: many(bookmarks),
  mentions: many(mentions),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: 'follower',
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: 'following',
  }),
}));

export const blockedUsersRelations = relations(blockedUsers, ({ one }) => ({
  blocker: one(users, {
    fields: [blockedUsers.blockerId],
    references: [users.id],
    relationName: 'blocker',
  }),
  blocked: one(users, {
    fields: [blockedUsers.blockedId],
    references: [users.id],
    relationName: 'blocked',
  }),
}));

export const mutedUsersRelations = relations(mutedUsers, ({ one }) => ({
  muter: one(users, {
    fields: [mutedUsers.muterId],
    references: [users.id],
    relationName: 'muter',
  }),
  muted: one(users, {
    fields: [mutedUsers.mutedId],
    references: [users.id],
    relationName: 'muted',
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  comments: many(comments),
  likes: many(likes),
  bookmarks: many(bookmarks),
  mentions: many(mentions),
  hashtags: many(postHashtags),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
  replies: many(comments, { relationName: 'replies' }),
  parent: one(comments, {
    fields: [comments.parentCommentId],
    references: [comments.id],
    relationName: 'replies',
  }),
  likes: many(likes),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [likes.postId],
    references: [posts.id],
  }),
  comment: one(comments, {
    fields: [likes.commentId],
    references: [comments.id],
  }),
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(users, {
    fields: [bookmarks.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [bookmarks.postId],
    references: [posts.id],
  }),
}));

export const mentionsRelations = relations(mentions, ({ one }) => ({
  post: one(posts, {
    fields: [mentions.postId],
    references: [posts.id],
  }),
  mentionedUser: one(users, {
    fields: [mentions.mentionedUserId],
    references: [users.id],
  }),
}));

export const hashtagsRelations = relations(hashtags, ({ many }) => ({
  posts: many(postHashtags),
}));

export const postHashtagsRelations = relations(postHashtags, ({ one }) => ({
  post: one(posts, {
    fields: [postHashtags.postId],
    references: [posts.id],
  }),
  hashtag: one(hashtags, {
    fields: [postHashtags.hashtagId],
    references: [hashtags.id],
  }),
}));

export const feedItemsRelations = relations(feedItems, ({ one }) => ({
  user: one(users, {
    fields: [feedItems.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [feedItems.postId],
    references: [posts.id],
    relationName: 'feedPost',
  }),
  postAuthor: one(users, {
    fields: [feedItems.postAuthorId],
    references: [users.id],
    relationName: 'feedPostAuthor',
  }),
}));
