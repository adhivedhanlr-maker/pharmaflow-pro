import { Module } from '@nestjs/common';
import { StockService } from './stock.service';
import { StockController } from './stock.controller';
import { AuditLogModule } from '../audit/audit-log.module';

@Module({
    imports: [AuditLogModule],
    providers: [StockService],
    controllers: [StockController],
    exports: [StockService],
})
export class StockModule { }
