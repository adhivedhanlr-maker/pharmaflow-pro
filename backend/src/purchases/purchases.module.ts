import { Module } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { AuditLogModule } from '../audit/audit-log.module';

@Module({
    imports: [AuditLogModule],
    providers: [PurchasesService],
    controllers: [PurchasesController],
    exports: [PurchasesService],
})
export class PurchasesModule { }
