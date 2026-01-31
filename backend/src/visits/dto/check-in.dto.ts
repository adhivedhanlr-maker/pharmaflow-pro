import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CheckInDto {
    @IsNotEmpty()
    @IsString()
    customerId: string;

    @IsNotEmpty()
    @IsNumber()
    latitude: number;

    @IsNotEmpty()
    @IsNumber()
    longitude: number;

    @IsOptional()
    @IsNumber()
    distance?: number;

    @IsNotEmpty()
    @IsString()
    status: string; // "VERIFIED" or "MISMATCH"
}
