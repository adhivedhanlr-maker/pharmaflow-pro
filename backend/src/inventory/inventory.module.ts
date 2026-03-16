import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { OCRService } from './ocr.service';
import { OCRController } from './ocr.controller';

@Module({
    providers: [InventoryService, OCRService],
    controllers: [InventoryController, OCRController],
    exports: [InventoryService, OCRService],
})
export class InventoryModule { }
