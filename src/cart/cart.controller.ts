import { EntityIdPipe } from '../common/http';
import { Body, Controller, Delete, Get, Module, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Principal } from '../auth/auth.guard';
import { CartService } from './cart.service';
import { CartItemDto, QuantityDto } from './cart.dto';
@ApiTags('Cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly service: CartService) {}
  @Get() get(@CurrentUser() u: Principal) {
    return this.service.get(u.id);
  }
  @Post('items') add(@CurrentUser() u: Principal, @Body() dto: CartItemDto) {
    return this.service.add(u.id, dto);
  }
  @Patch('items/:variantId') update(
    @CurrentUser() u: Principal,
    @Param('variantId', EntityIdPipe) id: number,
    @Body() dto: QuantityDto,
  ) {
    return this.service.change(u.id, id, dto.quantity);
  }
  @Delete('items/:variantId') remove(
    @CurrentUser() u: Principal,
    @Param('variantId', EntityIdPipe) id: number,
  ) {
    return this.service.remove(u.id, id);
  }
  @Delete() clear(@CurrentUser() u: Principal) {
    return this.service.remove(u.id);
  }
}
@Module({ controllers: [CartController], providers: [CartService] })
export class CartModule {}
