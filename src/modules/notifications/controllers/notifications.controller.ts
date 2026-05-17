import {
    Controller,
    Get,
    Patch,
    Param,
    Query,
    UseGuards,
    Req,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { NotificationsService } from '../services/notifications.service';
import { GetNotificationsDto } from '../dto/get-notifications.dto';
import { ApiAuthEndpoint } from '../../../common/decorators/swagger.decorators';

@ApiTags('Notifications')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/notifications')
export class NotificationsController {
    constructor(private notificationsService: NotificationsService) { }

    @Get()
    @ApiAuthEndpoint('Get my notifications', {
        ok: 'Paginated notifications',
    })
    async getNotifications(
        @Query() dto: GetNotificationsDto,
        @Req() req: any,
    ) {
        return this.notificationsService.getNotifications(req.user.id, dto);
    }

    @Get('unread-count')
    @ApiAuthEndpoint('Get unread notification count', {
        ok: 'Unread count',
    })
    async getUnreadCount(@Req() req: any) {
        return this.notificationsService.getUnreadCount(req.user.id);
    }

    @Patch(':id/read')
    @HttpCode(HttpStatus.OK)
    @ApiAuthEndpoint('Mark notification as read', {
        ok: 'Marked as read',
        notFound: 'Notification not found',
    })
    async markAsRead(@Param('id') id: string, @Req() req: any) {
        return this.notificationsService.markAsRead(id, req.user.id);
    }

    @Patch('read-all')
    @HttpCode(HttpStatus.OK)
    @ApiAuthEndpoint('Mark all notifications as read', {
        ok: 'All marked as read',
    })
    async markAllAsRead(@Req() req: any) {
        return this.notificationsService.markAllAsRead(req.user.id);
    }
}