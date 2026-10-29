import { EntityIdPipe } from '../common/http';
import { Body, Controller, Get, Headers, Module, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiHeader, ApiTags } from '@nestjs/swagger';
import { Admin, CurrentUser, Principal } from '../auth/auth.guard';
import { fail, PageQuery } from '../common/http';
import { StatusDto } from './orders.dto';
import { OrdersService } from './orders.service';
@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}
  @Post()
  @ApiBody({ schema: { type: 'object', additionalProperties: false } })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Unique per checkout; reuse for safe retries',
  })
  checkout(
    @CurrentUser() u: Principal,
    @Headers('idempotency-key') key: string,
    @Body() body: unknown,
  ) {
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length)
      fail(
        400,
        'INVALID_CHECKOUT_BODY',
        'Checkout requires an empty object; prices and ownership are computed by the server',
      );
    return this.service.checkout(u.id, key);
  }
  @Get() list(@CurrentUser() u: Principal, @Query() q: PageQuery) {
    return this.service.list(q, u.id);
  }
  @Get(':id') detail(@CurrentUser() u: Principal, @Param('id', EntityIdPipe) id: number) {
    return this.service.detail(id, u.id);
  }
}
@ApiTags('Administration · Orders')
@ApiBearerAuth()
@Admin()
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly service: OrdersService) {}
  @Get() list(@Query() q: PageQuery) {
    return this.service.list(q);
  }
  @Get(':id') detail(@Param('id', EntityIdPipe) id: number) {
    return this.service.detail(id);
  }
  @Patch(':id/status') status(
    @CurrentUser() u: Principal,
    @Param('id', EntityIdPipe) id: number,
    @Body() dto: StatusDto,
  ) {
    return this.service.status(id, dto.status, u.id);
  }
}
@Module({ controllers: [OrdersController, AdminOrdersController], providers: [OrdersService] })
export class OrdersModule {}
