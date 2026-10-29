import { Injectable } from '@nestjs/common';
import { Database } from '../common/database.service';
import { fail, PageQuery, pageResult, skip } from '../common/http';
import { mediaUrl } from '../common/presenters';
import { ReviewDto } from './reviews.dto';
@Injectable()
export class ReviewsService {
  constructor(private readonly db: Database) {}
  async list(q: PageQuery, productId?: number) {
    const where =
      productId !== undefined ? { productId, approved: true, product: { archivedAt: null } } : {};
    const [rows, total] = await this.db.$transaction([
      this.db.review.findMany({
        where,
        include: {
          user: { select: { id: true, fullName: true, avatar: { select: { filename: true } } } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: skip(q),
        take: q.limit,
      }),
      this.db.review.count({ where }),
    ]);
    return pageResult(
      rows.map(({ user, ...r }) => ({
        ...r,
        user: {
          id: user.id,
          fullName: user.fullName,
          avatarUrl: user.avatar ? mediaUrl(user.avatar.filename) : null,
        },
      })),
      total,
      q,
    );
  }
  async create(userId: string, dto: ReviewDto) {
    if (!(await this.db.product.count({ where: { id: dto.productId, archivedAt: null } })))
      fail(404, 'NOT_FOUND', 'Product not found');
    return this.db.review.create({ data: { ...dto, userId, content: dto.content.trim() } });
  }
  async moderate(id: number, approved?: boolean) {
    return this.db.transaction(async (tx) => {
      const review = await tx.review.findUniqueOrThrow({ where: { id } });
      await tx.$queryRaw`SELECT id FROM "Product" WHERE id=${review.productId} FOR UPDATE`;
      const result =
        approved === undefined
          ? await tx.review.delete({ where: { id } })
          : await tx.review.update({ where: { id }, data: { approved } });
      const aggregate = await tx.review.aggregate({
        where: { productId: review.productId, approved: true },
        _avg: { rating: true },
      });
      await tx.product.update({
        where: { id: review.productId },
        data: { rating: aggregate._avg.rating ?? 0 },
      });
      return result;
    });
  }
}
