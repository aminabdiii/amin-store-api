import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PageQuery } from '../common/http';
import { Admin } from '../auth/auth.guard';
import { UserAdminDto } from './users.dto';
import { UsersService } from './users.service';
@ApiTags('Administration · Users')
@ApiBearerAuth()
@Admin()
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly service: UsersService) {}
  @Get()
  list(@Query() q: PageQuery) {
    return this.service.list(q);
  }
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UserAdminDto) {
    return this.service.manage(id, dto);
  }
}
