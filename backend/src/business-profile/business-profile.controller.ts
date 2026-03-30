import {
    Controller,
    Get,
    Put,
    Post,
    Body,
    UseGuards,
    Request,
    UseInterceptors,
    UploadedFile,
} from '@nestjs/common';
import { BusinessProfileService } from './business-profile.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Controller('business-profile')
@UseGuards(JwtAuthGuard)
export class BusinessProfileController {
    constructor(private readonly businessProfileService: BusinessProfileService) { }

    @Get()
    async getProfile(@Request() req: any) {
        return this.businessProfileService.getProfile(req.user.userId, req.user.tenantId);
    }

    @Put()
    async updateProfile(@Request() req: any, @Body() data: any) {
        return this.businessProfileService.updateProfile(req.user.userId, req.user.tenantId, data);
    }

    @Post('upload-logo')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            limits: { fileSize: 500 * 1024 }, // 500 KB max
            fileFilter: (_req, file, cb) => {
                if (!file.mimetype.startsWith('image/')) {
                    return cb(new Error('Only image files are allowed'), false);
                }
                cb(null, true);
            },
        }),
    )
    async uploadLogo(@Request() req: any, @UploadedFile() file: any) {
        if (!file) throw new Error('No file uploaded');
        const base64Image = file.buffer.toString('base64');
        const logoUrl = `data:${file.mimetype};base64,${base64Image}`;
        return this.businessProfileService.updateLogo(req.user.userId, req.user.tenantId, logoUrl);
    }
}
