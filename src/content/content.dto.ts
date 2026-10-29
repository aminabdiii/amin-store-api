import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ValidateIf, IsString, IsUUID, Length, Matches } from 'class-validator';
export class ArticleDto {
  @ApiProperty()
  @IsString()
  @Length(1, 250)
  @Matches(/\S/)
  title!: string;
  @ApiProperty()
  @IsString()
  @Length(1, 200000)
  content!: string;
  @ApiPropertyOptional()
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsUUID()
  imageId?: string;
}
export class UpdateArticleDto extends PartialType(ArticleDto, { skipNullProperties: false }) {}
export class FaqDto {
  @ApiProperty()
  @IsString()
  @Length(1, 250)
  @Matches(/\S/)
  title!: string;
  @ApiProperty()
  @IsString()
  @Length(1, 10000)
  description!: string;
}
export class UpdateFaqDto extends PartialType(FaqDto, { skipNullProperties: false }) {}
export class BrandDto {
  @ApiProperty()
  @IsString()
  @Length(1, 250)
  @Matches(/\S/)
  title!: string;
  @ApiPropertyOptional()
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsUUID()
  imageId?: string;
}
export class UpdateBrandDto extends PartialType(BrandDto, { skipNullProperties: false }) {}
export class FeatureDto extends FaqDto {
  @ApiPropertyOptional()
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsUUID()
  imageId?: string;
  @ApiPropertyOptional({ example: '#ffffff' })
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsString()
  @Matches(/^#[a-fA-F0-9]{6}$/)
  shadowColor?: string;
}
export class UpdateFeatureDto extends PartialType(FeatureDto, { skipNullProperties: false }) {}
