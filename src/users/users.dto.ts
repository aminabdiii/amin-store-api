import { ApiPropertyOptional } from '@nestjs/swagger';
import { Matches, IsBoolean, IsIn, ValidateIf, IsString, Length } from 'class-validator';
export class ProfileDto {
  @ApiPropertyOptional()
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsString()
  @Length(1, 200)
  @Matches(/\S/)
  fullName?: string;
}
export class UserAdminDto {
  @ApiPropertyOptional()
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsBoolean()
  active?: boolean;
  @ApiPropertyOptional({ enum: ['CUSTOMER', 'ADMIN'] })
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsIn(['CUSTOMER', 'ADMIN'])
  role?: 'CUSTOMER' | 'ADMIN';
}
