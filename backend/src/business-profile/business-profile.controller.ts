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
        return this.businessProfileService.getProfile(req.user.userId);
    }

    @Put()
    async updateProfile(@Request() req: any, @Body() data: any) {
        console.log('Update Profile Request:', { userId: req.user.userId, data });
        try {
            const result = await this.businessProfileService.updateProfile(req.user.userId, data);
            console.log('Update Result:', result);
            return result;
        } catch (error) {
            console.error('Update Profile Error:', error);
            throw error;
        }
    }

    @Post('upload-logo')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
        }),
    )
    async uploadLogo(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
        // Convert buffer to base64 data URI
        const base64Image = file.buffer.toString('base64');
        const logoUrl = `data:${file.mimetype};base64,${base64Image}`;
        return this.businessProfileService.updateLogo(req.user.userId, logoUrl);
    }
}
