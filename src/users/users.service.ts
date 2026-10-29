import { Injectable } from '@nestjs/common';
import { Database } from '../common/database.service';
import { fail, PageQuery, pageResult, skip } from '../common/http';
import { presentUser, userSelect } from '../common/presenters';
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
