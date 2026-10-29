import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import sanitize from 'sanitize-html';
import { Database } from '../common/database.service';
import { fail, PageQuery, pageResult, skip } from '../common/http';
import { mediaUrl, presentProduct, productInclude } from '../common/presenters';
import { combinations, OptionInput, signature } from '../common/variants';
import {
  CategoryDto,
  CreateProductDto,
  InventoryDto,
  ProductQuery,
  UpdateCategoryDto,
  UpdateProductDto,
} from './catalog.dto';
@Injectable()
export class CatalogService {
  constructor(private readonly db: Database) {}
  async list(q: ProductQuery, admin = false) {
    const where: Prisma.ProductWhereInput = {
      ...(admin ? {} : { archivedAt: null }),
      ...(q.category ? { category: { slug: q.category } } : {}),
      ...(q.search ? { title: { contains: q.search, mode: 'insensitive' } } : {}),
      ...(q.preSale ? { isPreSale: q.preSale === 'true' } : {}),
      ...(q.discounted ? { discount: q.discounted === 'true' ? { gt: 0 } : 0 } : {}),
    };
    if (q.available === 'true')
      Object.assign(where, {
        saleEnabled: true,
        archivedAt: null,
        variants: { some: { stock: { gt: 0 } } },
      });
    if (q.available === 'false')
      where.OR = [
        { saleEnabled: false },
        { archivedAt: { not: null } },
        { variants: { none: { stock: { gt: 0 } } } },
      ];
    const sort: Record<string, Prisma.ProductOrderByWithRelationInput> = {
      default: { id: 'desc' },
      newest: { createdAt: 'desc' },
      cheapest: { price: 'asc' },
      'most-expensive': { price: 'desc' },
      rate: { rating: 'desc' },
      'most-view': { views: 'desc' },
      'fastest-shipping': { shippingLeadDays: 'asc' },
    };
    const [products, total] = await this.db.$transaction([
      this.db.product.findMany({
        where,
        include: productInclude,
        orderBy: [sort[q.sort ?? 'rate'], { id: 'desc' }],
        skip: skip(q),
        take: q.limit,
      }),
      this.db.product.count({ where }),
    ]);
    return pageResult(products.map(presentProduct), total, q);
  }
  async detail(id: number) {
    const product = await this.db.product.findFirst({
      where: { id, archivedAt: null },
      include: productInclude,
    });
    if (!product) fail(404, 'NOT_FOUND', 'Product not found');
    return presentProduct(product);
  }
  async related(id: number) {
    const product = await this.db.product.findFirst({ where: { id, archivedAt: null } });
    if (!product) fail(404, 'NOT_FOUND', 'Product not found');
    const results = await this.db.product.findMany({
      where: { categoryId: product.categoryId, id: { not: id }, archivedAt: null },
      include: productInclude,
      take: 4,
      orderBy: [{ rating: 'desc' }, { id: 'desc' }],
    });
    return pageResult(results.map(presentProduct), results.length, { page: 1, limit: 4 });
  }
  async view(id: number) {
    const updated = await this.db.product.updateMany({
      where: { id, archivedAt: null },
      data: { views: { increment: 1 } },
    });
    if (!updated.count) fail(404, 'NOT_FOUND', 'Product not found');
    return { success: true };
  }
  private choices(options: OptionInput[]) {
    try {
      return combinations(options);
    } catch (error) {
      fail(400, 'INVALID_OPTIONS', error instanceof Error ? error.message : 'Invalid options');
    }
  }
  private async addOptions(tx: Prisma.TransactionClient, id: number, options: OptionInput[]) {
    const variants = this.choices(options);
    const ids = new Map<string, number>();
    for (const option of options) {
      const group = await tx.optionGroup.create({ data: { productId: id, name: option.name } });
      for (const value of option.values) {
        const item = await tx.optionValue.create({ data: { groupId: group.id, value } });
        ids.set(JSON.stringify([option.name, value]), item.id);
      }
    }
    for (const selected of variants)
      await tx.productVariant.create({
        data: {
          productId: id,
          signature: signature(selected),
          values: {
            create: Object.entries(selected).map(([name, value]) => ({
              valueId: ids.get(JSON.stringify([name, value]))!,
            })),
          },
        },
      });
  }
  async create(dto: CreateProductDto) {
    this.choices(dto.options ?? []);
    return this.db.transaction(async (tx) => {
      const { options = [], imageIds = [], description, ...values } = dto;
      const product = await tx.product.create({
        data: {
          ...values,
          description: sanitize(description ?? ''),
          images: { create: imageIds.map((mediaId, position) => ({ mediaId, position })) },
        },
      });
      await this.addOptions(tx, product.id, options);
      return presentProduct(
        await tx.product.findUniqueOrThrow({ where: { id: product.id }, include: productInclude }),
      );
    });
  }
  async update(id: number, dto: UpdateProductDto) {
    if (dto.options) this.choices(dto.options);
    return this.db.transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Product" WHERE id=${id} FOR UPDATE`;
      const { options, imageIds, description, ...values } = dto;
      if (options) {
        if (
          await tx.productVariant.count({
            where: {
              productId: id,
              OR: [
                { stock: { not: 0 } },
                { cartItems: { some: {} } },
                { orderItems: { some: {} } },
                { movements: { some: {} } },
              ],
            },
          })
        )
          fail(
            409,
            'VARIANTS_IN_USE',
            'Options cannot be replaced after inventory or cart/order usage',
          );
        await tx.productVariant.deleteMany({ where: { productId: id } });
        await tx.optionGroup.deleteMany({ where: { productId: id } });
        await this.addOptions(tx, id, options);
      }
      if (imageIds) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.productImage.createMany({
          data: imageIds.map((mediaId, position) => ({ productId: id, mediaId, position })),
        });
      }
      const product = await tx.product.update({
        where: { id },
        data: {
          ...values,
          ...(description !== undefined ? { description: sanitize(description) } : {}),
        },
        include: productInclude,
      });
      return presentProduct(product);
    });
  }
  async archive(id: number) {
    await this.db.product.update({
      where: { id },
      data: { archivedAt: new Date(), saleEnabled: false },
    });
    return { success: true };
  }
  async categories(q: PageQuery) {
    const [rows, total] = await this.db.$transaction([
      this.db.category.findMany({
        include: { image: true },
        skip: skip(q),
        take: q.limit,
        orderBy: { id: 'asc' },
      }),
      this.db.category.count(),
    ]);
    return pageResult(
      rows.map(({ image, ...r }) => ({
        ...r,
        image: image ? { id: image.id, url: mediaUrl(image.filename) } : null,
      })),
      total,
      q,
    );
  }
  createCategory(dto: CategoryDto) {
    return this.db.category.create({ data: dto });
  }
  updateCategory(id: number, dto: UpdateCategoryDto) {
    return this.db.category.update({ where: { id }, data: dto });
  }
  async deleteCategory(id: number) {
    await this.db.category.delete({ where: { id } });
    return { success: true };
  }
  async inventory(id: number, dto: InventoryDto, actorId: string) {
    if (!dto.delta) fail(400, 'INVALID_ADJUSTMENT', 'Inventory adjustment cannot be zero');
    return this.db.transaction(async (tx) => {
      const changed = await tx.productVariant.updateMany({
        where: {
          id,
          ...(dto.delta < 0
            ? { stock: { gte: -dto.delta } }
            : { stock: { lte: 2147483647 - dto.delta } }),
        },
        data: { stock: { increment: dto.delta } },
      });
      if (!changed.count)
        fail(409, 'INVALID_STOCK', 'Variant does not exist or resulting stock is invalid');
      await tx.inventoryMovement.create({
        data: { variantId: id, actorId, type: 'ADJUSTMENT', delta: dto.delta, reason: dto.reason },
      });
      return tx.productVariant.findUniqueOrThrow({
        where: { id },
        select: { id: true, stock: true },
      });
    });
  }
  async movements(id: number, q: PageQuery) {
    const [data, total] = await this.db.$transaction([
      this.db.inventoryMovement.findMany({
        where: { variantId: id },
        orderBy: { id: 'desc' },
        skip: skip(q),
        take: q.limit,
      }),
      this.db.inventoryMovement.count({ where: { variantId: id } }),
    ]);
    return pageResult(data, total, q);
  }
}
