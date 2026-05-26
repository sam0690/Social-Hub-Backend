// src/database/schema/chat.schema.ts
import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const conversationTypeEnum = pgEnum('conversation_type', ['direct', 'group']);
export const messageTypeEnum = pgEnum('message_type', ['text', 'media']);

export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: conversationTypeEnum('type').default('direct'),
  createdBy: uuid('created_by').notNull(),
  lastMessageAt: timestamp('last_message_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const participants = pgTable('participants', {
  conversationId: uuid('conversation_id').notNull(),
  userId: uuid('user_id').notNull(),
  joinedAt: timestamp('joined_at').defaultNow(),
  lastReadMessageId: uuid('last_read_message_id'),
});

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').notNull(),
  senderId: uuid('sender_id').notNull(),
  content: text('content').notNull(),
  type: messageTypeEnum('type').default('text'),
  createdAt: timestamp('created_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
});