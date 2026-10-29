import {
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Database } from '../common/database';
import { fail, PageQuery, pageResult, skip } from '../common/http';
import { presentUser, userSelect } from '../common/presenters';
import { Admin, CurrentUser, Principal } from '../auth/auth.guard';
import { ProfileDto, UserAdminDto } from './users.dto';
@Injectable()
export class UsersService {
  constructor(private readonly db: Database) {}
  async me(id: string) {
    return presentUser(await this.db.user.findUniqueOrThrow({ where: { id }, select: userSelect }));
  }
  async profile(id: string, dto: ProfileDto) {
    return presentUser(
      await this.db.user.update({
        where: { id },
        data: { fullName: dto.fullName?.trim() },
        select: userSelect,
      }),
    );
  }
  async list(q: PageQuery) {
    const [users, total] = await this.db.$transaction([
      this.db.user.findMany({
        select: userSelect,
        orderBy: { id: 'asc' },
        skip: skip(q),
        take: q.limit,
      }),
      this.db.user.count(),
    ]);
    return pageResult(users.map(presentUser), total, q);
  }
  async manage(id: string, dto: UserAdminDto) {
    return this.db.transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE role='ADMIN' ORDER BY id FOR UPDATE`;
      const target = await tx.user.findUniqueOrThrow({ where: { id } });
      if (
        target.role === 'ADMIN' &&
        target.active &&
        (dto.role === 'CUSTOMER' || dto.active === false) &&
        (await tx.user.count({ where: { role: 'ADMIN', active: true } })) <= 1
      )
        fail(409, 'LAST_ADMIN', 'The last active administrator cannot be disabled or demoted');
      const user = await tx.user.update({ where: { id }, data: dto, select: userSelect });
      if (dto.active === false || dto.role !== undefined)
        await tx.session.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      return presentUser(user);
    });
  }
}
@ApiTags('Users')
@ApiBearerAuth()
@Controller('users/me')
export class UsersController {
  constructor(private readonly service: UsersService) {}
  @Get() me(@CurrentUser() u: Principal) {
    return this.service.me(u.id);
  }
  @Patch() profile(@CurrentUser() u: Principal, @Body() dto: ProfileDto) {
    return this.service.profile(u.id, dto);
  }
}
@ApiTags('Administration · Users')
@ApiBearerAuth()
@Admin()
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly service: UsersService) {}
  @Get() list(@Query() q: PageQuery) {
    return this.service.list(q);
  }
  @Patch(':id') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UserAdminDto) {
    return this.service.manage(id, dto);
  }
}
@Module({ controllers: [UsersController, AdminUsersController], providers: [UsersService] })
export class UsersModule {}
