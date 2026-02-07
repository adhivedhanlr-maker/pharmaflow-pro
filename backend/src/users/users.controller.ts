import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post('duty')
    @Roles(Role.SALES_REP)
    toggleDuty(@Body() body: { isOnDuty: boolean }, @Request() req: any) {
        return this.usersService.update(req.user.userId, { isOnDuty: body.isOnDuty });
    }

    @Get('me')
    getProfile(@Request() req: any) {
        return this.usersService.findOne(req.user.userId);
    }

    @Get('attendance')
    @Roles(Role.ADMIN)
    getAttendance() {
        return this.usersService.getAttendance();
    }

    @Roles(Role.ADMIN)
    @Get()
    findAll() {
        return this.usersService.findAll();
    }

    @Post()
    create(@Body() data: any) {
        return this.usersService.create(data);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() data: any) {
        return this.usersService.update(id, data);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.usersService.remove(id);
    }
}
