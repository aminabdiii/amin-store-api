import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, Matches } from 'class-validator';
export class RegisterDto {
  @ApiProperty() @IsEmail() @Length(3, 254) email!: string;
  @ApiProperty() @IsString() @Length(3, 100) @Matches(/^[a-zA-Z0-9_.-]+$/) username!: string;
  @ApiProperty() @IsString() @Length(1, 200) @Matches(/\S/) fullName!: string;
  @ApiProperty({ minLength: 12, writeOnly: true }) @IsString() @Length(12, 128) password!: string;
}
export class LoginDto {
  @ApiProperty() @IsEmail() @Length(3, 254) email!: string;
  @ApiProperty({ writeOnly: true }) @IsString() @Length(1, 128) password!: string;
}
export class RefreshDto {
  @ApiProperty({ writeOnly: true }) @IsString() @Length(40, 100) refreshToken!: string;
}
export class PasswordDto {
  @ApiProperty({ writeOnly: true }) @IsString() @Length(1, 128) currentPassword!: string;
  @ApiProperty({ minLength: 12, writeOnly: true }) @IsString() @Length(12, 128) password!: string;
}
