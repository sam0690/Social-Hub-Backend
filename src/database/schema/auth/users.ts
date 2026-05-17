import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['USER', 'MODERATOR', 'ADMIN']);

export const userStatusEnum = pgEnum('user_status', [
  'ACTIVE',
  'BANNED',
  'SUSPENDED',
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 30 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash'),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  bannerUrl: text('banner_url'),
  isVerified: boolean('is_verified').notNull().default(false),
  isPrivate: boolean('is_private').notNull().default(false),
  role: userRoleEnum('role').notNull().default('USER'),
  status: userStatusEnum('status').notNull().default('ACTIVE'),
  lastSeenAt: timestamp('last_seen_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
