import { ApiProperty } from '@nestjs/swagger';
import { Matches, IsBoolean, IsInt, IsString, Length, Max, Min } from 'class-validator';
export class ReviewDto {
  @ApiProperty() @IsInt() @Min(1) productId!: number;
  @ApiProperty() @IsString() @Length(3, 5000) @Matches(/\S/) content!: string;
  @ApiProperty() @IsInt() @Min(1) @Max(5) rating!: number;
}
export class ModerateDto {
  @ApiProperty() @IsBoolean() approved!: boolean;
}
