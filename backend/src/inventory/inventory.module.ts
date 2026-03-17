import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { OCRService } from './ocr.service';

@Module({
    providers: [InventoryService, OCRService],
    controllers: [InventoryController],
    exports: [InventoryService, OCRService],
})
export class InventoryModule { }
