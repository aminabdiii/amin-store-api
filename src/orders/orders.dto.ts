import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
export class StatusDto {
  @ApiProperty({ enum: ['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] })
  @IsIn(['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
  status!: 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
}
export class CheckoutDto {}
