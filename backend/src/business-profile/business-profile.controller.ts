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
    BadRequestException,
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

    @Post('save-upi')
    async saveUpiString(@Request() req: any, @Body('paymentUpiString') paymentUpiString: string | null) {
        if (paymentUpiString !== null && typeof paymentUpiString !== 'string') {
            throw new BadRequestException('Invalid paymentUpiString');
        }
        return this.businessProfileService.updatePaymentUpiString(
            req.user.userId,
            req.user.tenantId,
            paymentUpiString ?? null,
        );
    }

    @Post('upload-qr')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            limits: { fileSize: 1024 * 1024 }, // 1 MB max — QR images can be larger
            fileFilter: (_req, file, cb) => {
                if (!file.mimetype.startsWith('image/')) {
                    return cb(new Error('Only image files are allowed'), false);
                }
                cb(null, true);
            },
        }),
    )
    async uploadPaymentQr(@Request() req: any, @UploadedFile() file: any) {
        if (!file) throw new Error('No file uploaded');
        const base64Image = file.buffer.toString('base64');
        const paymentQrUrl = `data:${file.mimetype};base64,${base64Image}`;
        return this.businessProfileService.updatePaymentQr(req.user.userId, req.user.tenantId, paymentQrUrl);
    }
}
