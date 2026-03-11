import { Body, Controller, Delete, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Post('subscribe')
    async subscribe(
        @Request() req: any,
        @Body() body: {
            endpoint: string;
            keys: {
                p256dh: string;
                auth: string;
            };
        },
    ) {
        return this.notificationsService.savePushSubscription(req.user.userId, req.user.tenantId, body);
    }

    @Delete('subscribe')
    async unsubscribe(@Request() req: any, @Body('endpoint') endpoint: string) {
        await this.notificationsService.removePushSubscription(req.user.userId, endpoint);
        return { success: true };
    }
}
