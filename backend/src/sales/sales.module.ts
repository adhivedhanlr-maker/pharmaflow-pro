import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { SalesGateway } from './sales.gateway';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [NotificationsModule],
    providers: [SalesService, SalesGateway],
    controllers: [SalesController],
    exports: [SalesService, SalesGateway],
})
export class SalesModule { }
