import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard)
export class AuditLogController {
    constructor(private auditLogService: AuditLogService) { }

    @Get()
    async getLogs(
        @Req() req: any,
        @Query('userId') userId?: string,
        @Query('action') action?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        // Only admins can view all logs
        const user = req.user;
        if (user.role !== 'ADMIN' && userId && userId !== user.userId) {
            return { logs: [], total: 0 };
        }

        return this.auditLogService.getLogs({
            userId: userId || (user.role !== 'ADMIN' ? user.userId : undefined),
            action,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
        });
    }

    @Get('recent')
    async getRecentActivity(@Req() req: any) {
        return this.auditLogService.getRecentActivity(req.user.userId);
    }
}
