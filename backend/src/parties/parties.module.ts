import { Module } from '@nestjs/common';
import { PartiesService } from './parties.service';
import { PartiesController } from './parties.controller';
import { AuditLogModule } from '../audit/audit-log.module';

@Module({
    imports: [AuditLogModule],
    providers: [PartiesService],
    controllers: [PartiesController],
    exports: [PartiesService],
})
export class PartiesModule { }
