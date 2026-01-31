import { Module } from '@nestjs/common';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { SalesGateway } from './sales.gateway';

@Module({
    providers: [SalesService, SalesGateway],
    controllers: [SalesController],
    exports: [SalesService],
})
export class SalesModule { }
