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
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('business-profile')
@UseGuards(JwtAuthGuard)
export class BusinessProfileController {
    constructor(private readonly businessProfileService: BusinessProfileService) { }

    @Get()
    async getProfile(@Request() req: any) {
        return this.businessProfileService.getProfile(req.user.id);
    }

    @Put()
    async updateProfile(@Request() req: any, @Body() data: any) {
        console.log('Update Profile Request:', { userId: req.user.id, data });
        try {
            const result = await this.businessProfileService.updateProfile(req.user.id, data);
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
            storage: diskStorage({
                destination: './uploads',
                filename: (req, file, cb) => {
                    const randomName = Array(32)
                        .fill(null)
                        .map(() => Math.round(Math.random() * 16).toString(16))
                        .join('');
                    cb(null, `${randomName}${extname(file.originalname)}`);
                },
            }),
        }),
    )
    async uploadLogo(@Request() req: any, @UploadedFile() file: Express.Multer.File) {
        // The file is served at /uploads/filename
        const logoUrl = `/uploads/${file.filename}`;
        return this.businessProfileService.updateLogo(req.user.id, logoUrl);
    }
}
