import { EntityIdPipe } from '../common/http';
import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Admin, CurrentUser, Principal } from '../auth/auth.guard';
import { PageQuery } from '../common/http';
import { StatusDto } from './orders.dto';
import { OrdersService } from './orders.service';
@ApiTags('Administration · Orders')
@ApiBearerAuth()
@Admin()
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly service: OrdersService) {}
  @Get()
  list(@Query() q: PageQuery) {
    return this.service.list(q);
  }
  @Get(':id')
  detail(@Param('id', EntityIdPipe) id: number) {
    return this.service.detail(id);
  }
  @Patch(':id/status')
  status(
    @CurrentUser() u: Principal,
    @Param('id', EntityIdPipe) id: number,
    @Body() dto: StatusDto,
  ) {
    return this.service.status(id, dto.status, u.id);
  }
}
