import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SalesModule } from '../sales/sales.module';

@Module({
    imports: [SalesModule],
    providers: [NotificationsService],
    exports: [NotificationsService],
})
export class NotificationsModule { }
