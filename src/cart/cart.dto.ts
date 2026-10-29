import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
export class CartItemDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  variantId!: number;
  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(10000)
  quantity!: number;
}
export class QuantityDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(10000)
  quantity!: number;
}
