import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SalesModule } from '../sales/sales.module';

@Module({
    imports: [PrismaModule, SalesModule],
    controllers: [OrdersController],
    providers: [OrdersService],
    exports: [OrdersService]
})
export class OrdersModule { }
