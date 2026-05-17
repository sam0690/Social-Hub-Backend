import { Injectable } from '@nestjs/common';
import { NotificationsRepository } from '../repositories/notification.repository';
import { GetNotificationsDto } from '../dto/get-notifications.dto';

@Injectable()
export class NotificationsService {
    constructor(
        private notificationsRepository: NotificationsRepository,
    ) { }

    // ── Create notifications (called from other modules) ───
    async notifyLikePost(
        actorId: string,
        recipientId: string,
        postId: string,
    ) {
        if (actorId === recipientId) return; // don't notify yourself
        await this.notificationsRepository.createNotification({
            recipientId,
            actorId,
            type: 'LIKE_POST',
            entityId: postId,
            entityType: 'POST',
        });
    }

    async notifyUnlikePost(actorId: string, postId: string) {
        await this.notificationsRepository.deleteNotification(
            actorId,
            'LIKE_POST',
            postId,
        );
    }

    async notifyLikeComment(
        actorId: string,
        recipientId: string,
        commentId: string,
    ) {
        if (actorId === recipientId) return;
        await this.notificationsRepository.createNotification({
            recipientId,
            actorId,
            type: 'LIKE_COMMENT',
            entityId: commentId,
            entityType: 'COMMENT',
        });
    }

    async notifyUnlikeComment(actorId: string, commentId: string) {
        await this.notificationsRepository.deleteNotification(
            actorId,
            'LIKE_COMMENT',
            commentId,
        );
    }


    async notifyComment(
        actorId: string,
        recipientId: string,
        postId: string,
    ) {
        if (actorId === recipientId) return;
        await this.notificationsRepository.createNotification({
            recipientId,
            actorId,
            type: 'COMMENT_POST',
            entityId: postId,
            entityType: 'POST',
        });
    }

    async notifyReply(
        actorId: string,
        recipientId: string,
        commentId: string,
    ) {
        if (actorId === recipientId) return;
        await this.notificationsRepository.createNotification({
            recipientId,
            actorId,
            type: 'REPLY_COMMENT',
            entityId: commentId,
            entityType: 'COMMENT',
        });
    }

    async notifyFollow(actorId: string, recipientId: string) {
        if (actorId === recipientId) return;
        await this.notificationsRepository.createNotification({
            recipientId,
            actorId,
            type: 'FOLLOW',
            entityId: recipientId,
            entityType: 'USER',
        });
    }

    async notifyMention(
        actorId: string,
        recipientId: string,
        postId: string,
    ) {
        if (actorId === recipientId) return;
        await this.notificationsRepository.createNotification({
            recipientId,
            actorId,
            type: 'MENTION_POST',
            entityId: postId,
            entityType: 'POST',
        });
    }

    // ── Read notifications ─────────────────────────────────
    async getNotifications(userId: string, dto: GetNotificationsDto) {
        const limit = dto.limit ?? 10;
        const notifications =
            await this.notificationsRepository.getNotifications(
                userId,
                limit,
                dto.cursor,
                dto.unreadOnly,
            );

        const hasMore = notifications.length === limit;
        const nextCursor = hasMore
            ? this.notificationsRepository.encodeCursor(
                notifications[notifications.length - 1].createdAt,
            )
            : null;

        return { data: notifications, nextCursor, hasMore };
    }

    async getUnreadCount(userId: string) {
        const count =
            await this.notificationsRepository.getUnreadCount(userId);
        return { count };
    }

    async markAsRead(id: string, userId: string) {
        await this.notificationsRepository.markAsRead(id, userId);
        return { message: 'Notification marked as read' };
    }

    async markAllAsRead(userId: string) {
        await this.notificationsRepository.markAllAsRead(userId);
        return { message: 'All notifications marked as read' };
    }
}
