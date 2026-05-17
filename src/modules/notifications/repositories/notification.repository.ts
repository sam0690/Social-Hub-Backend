import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, lt, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../../../database/database.module';
import * as schema from '../../../database/schema/index';

@Injectable()
export class NotificationsRepository {
    constructor(
        @Inject(DRIZZLE)
        private db: NodePgDatabase<typeof schema>,
    ) { }

    async createNotification(data: schema.NewNotification) {
        // avoid duplicate notifications (e.g. liking twice)
        const existing = await this.db.query.notifications.findFirst({
            where: and(
                eq(schema.notifications.recipientId, data.recipientId),
                eq(schema.notifications.actorId, data.actorId),
                eq(schema.notifications.type, data.type),
                eq(schema.notifications.entityId, data.entityId),
            ),
        });
        if (existing) return existing;

        const [notification] = await this.db
            .insert(schema.notifications)
            .values(data)
            .returning();
        return notification;
    }

    async getNotifications(
        userId: string,
        limit: number,
        cursor?: string,
        unreadOnly?: boolean,
    ) {
        const cursorDate = cursor
            ? new Date(Buffer.from(cursor, 'base64').toString('utf-8'))
            : undefined;

        return this.db.query.notifications.findMany({
            where: and(
                eq(schema.notifications.recipientId, userId),
                unreadOnly ? eq(schema.notifications.isRead, false) : undefined,
                cursorDate
                    ? lt(schema.notifications.createdAt, cursorDate)
                    : undefined,
            ),
            orderBy: desc(schema.notifications.createdAt),
            limit,
            with: {
                actor: {
                    columns: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                        isVerified: true,
                    },
                },
            },
        });
    }

    async getUnreadCount(userId: string): Promise<number> {
        const result = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(schema.notifications)
            .where(
                and(
                    eq(schema.notifications.recipientId, userId),
                    eq(schema.notifications.isRead, false),
                ),
            );
        return Number(result[0]?.count ?? 0);
    }

    async markAsRead(id: string, userId: string) {
        await this.db
            .update(schema.notifications)
            .set({ isRead: true })
            .where(
                and(
                    eq(schema.notifications.id, id),
                    eq(schema.notifications.recipientId, userId),
                ),
            );
    }

    async markAllAsRead(userId: string) {
        await this.db
            .update(schema.notifications)
            .set({ isRead: true })
            .where(
                and(
                    eq(schema.notifications.recipientId, userId),
                    eq(schema.notifications.isRead, false),
                ),
            );
    }

    async deleteNotification(
        actorId: string,
        type: schema.Notification['type'],
        entityId: string,
    ) {
        await this.db
            .delete(schema.notifications)
            .where(
                and(
                    eq(schema.notifications.actorId, actorId),
                    eq(schema.notifications.type, type),
                    eq(schema.notifications.entityId, entityId),
                ),
            );
    }

    encodeCursor(date: Date): string {
        return Buffer.from(date.toISOString()).toString('base64');
    }
}
