import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  ValidateIf,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PageQuery } from '../common/http';
export class OptionDto {
  @ApiProperty({ example: 'color' })
  @IsString()
  @Length(1, 100)
  @Matches(/^[a-z][a-z0-9_]*$/)
  name!: string;
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsString({ each: true })
  @Length(1, 150, { each: true })
  values!: string[];
}
export class CreateProductDto {
  @ApiProperty() @IsString() @Length(1, 250) @Matches(/\S/) title!: string;
  @ApiPropertyOptional()
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsString()
  @Length(0, 50000)
  description?: string;
  @ApiProperty() @IsInt() @Min(1) categoryId!: number;
  @ApiProperty({ example: '19.99', type: String })
  @IsString()
  @Matches(/^(0|[1-9]\d{0,17})(\.\d{1,2})?$/)
  price!: string;
  @ApiPropertyOptional({ default: 0 })
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(99)
  discount?: number;
  @ApiPropertyOptional({ default: 1 })
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(365)
  shippingLeadDays?: number;
  @ApiPropertyOptional()
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsBoolean()
  isPreSale?: boolean;
  @ApiPropertyOptional()
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsBoolean()
  saleEnabled?: boolean;
  @ApiPropertyOptional({ type: [OptionDto] })
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options?: OptionDto[];
  @ApiPropertyOptional({ type: [String] })
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  imageIds?: string[];
}
export class UpdateProductDto extends PartialType(CreateProductDto, {
  skipNullProperties: false,
}) {}
export class CategoryDto {
  @ApiProperty() @IsString() @Length(1, 200) @Matches(/\S/) title!: string;
  @ApiProperty() @IsString() @Length(1, 200) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) slug!: string;
  @ApiPropertyOptional()
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsUUID()
  imageId?: string;
}
export class UpdateCategoryDto extends PartialType(CategoryDto, { skipNullProperties: false }) {}
export class ProductQuery extends PageQuery {
  @ApiPropertyOptional()
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsString()
  @Length(1, 200)
  category?: string;
  @ApiPropertyOptional()
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsString()
  @Length(1, 200)
  search?: string;
  @ApiPropertyOptional({
    enum: [
      'default',
      'newest',
      'cheapest',
      'most-expensive',
      'rate',
      'most-view',
      'fastest-shipping',
    ],
  })
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsIn([
    'default',
    'newest',
    'cheapest',
    'most-expensive',
    'rate',
    'most-view',
    'fastest-shipping',
  ])
  sort?: string;
  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsIn(['true', 'false'])
  available?: string;
  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsIn(['true', 'false'])
  preSale?: string;
  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @ValidateIf((_o, value: unknown) => value !== undefined)
  @IsIn(['true', 'false'])
  discounted?: string;
}
export class InventoryDto {
  @ApiProperty({ description: 'Signed adjustment to stock; cannot result in negative stock' })
  @IsInt()
  @Min(-1000000)
  @Max(1000000)
  delta!: number;
  @ApiProperty() @IsString() @Length(3, 500) reason!: string;
}
