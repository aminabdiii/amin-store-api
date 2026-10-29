import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Principal } from '../auth/auth.guard';
import { ProfileDto } from './users.dto';
import { UsersService } from './users.service';
@ApiTags('Users')
@ApiBearerAuth()
@Controller('users/me')
export class UsersController {
  constructor(private readonly service: UsersService) {}
  @Get()
  me(@CurrentUser() u: Principal) {
    return this.service.me(u.id);
  }
  @Patch()
  profile(@CurrentUser() u: Principal, @Body() dto: ProfileDto) {
    return this.service.profile(u.id, dto);
  }
}
