import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SalesModule } from '../sales/sales.module';
import { AuditLogModule } from '../audit/audit-log.module';

import { NotificationsService } from '../notifications/notifications.service';

@Module({
    imports: [PrismaModule, SalesModule, AuditLogModule],
    controllers: [UsersController],
    providers: [UsersService, NotificationsService],
    exports: [UsersService],
})
export class UsersModule { }
