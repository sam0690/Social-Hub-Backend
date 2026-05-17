import {
    pgTable,
    uuid,
    boolean,
    timestamp,
    pgEnum,
    index,
} from 'drizzle-orm/pg-core';
import { users } from '../auth/users';

export const notificationTypeEnum = pgEnum('notification_type', [
    'LIKE_POST',
    'LIKE_COMMENT',
    'COMMENT_POST',
    'REPLY_COMMENT',
    'FOLLOW',
    'MENTION_POST',
    'MENTION_COMMENT',
]);

export const notificationEntityEnum = pgEnum('notification_entity', [
    'POST',
    'COMMENT',
    'USER',
]);

export const notifications = pgTable(
    'notifications',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        recipientId: uuid('recipient_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        actorId: uuid('actor_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        type: notificationTypeEnum('type').notNull(),
        entityId: uuid('entity_id').notNull(),
        entityType: notificationEntityEnum('entity_type').notNull(),
        isRead: boolean('is_read').notNull().default(false),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => ({
        recipientIdIdx: index('notifications_recipient_id_idx').on(
            table.recipientId,
        ),
        isReadIdx: index('notifications_is_read_idx').on(table.isRead),
        createdAtIdx: index('notifications_created_at_idx').on(table.createdAt),
    }),
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
