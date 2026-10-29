import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Database } from '../common/database.service';
import { fail } from '../common/http';
import { mediaUrl } from '../common/presenters';
import { lineTotal, netPrice } from '../common/money';
import { CartItemDto } from './cart.dto';
export async function lockCart(tx: Prisma.TransactionClient, userId: string) {
  const cart = await tx.cart.upsert({ where: { userId }, create: { userId }, update: {} });
  await tx.$queryRaw`SELECT id FROM "Cart" WHERE id=${cart.id} FOR UPDATE`;
  return tx.cart.findUniqueOrThrow({ where: { id: cart.id } });
}
export const cartInclude = {
  items: {
    include: {
      variant: {
        include: {
          product: {
            include: {
              images: { include: { media: true }, orderBy: { position: 'asc' as const }, take: 1 },
            },
          },
          values: { include: { value: { include: { group: true } } } },
        },
      },
    },
    orderBy: { variantId: 'asc' as const },
  },
} satisfies Prisma.CartInclude;
@Injectable()
export class CartService {
  constructor(private readonly db: Database) {}
  async get(userId: string) {
    const cart = await this.db.cart.findUnique({ where: { userId }, include: cartInclude });
    if (!cart) return { cartItems: [], total: '0.00', currency: 'USD', requiresResolution: false };
    const cartItems = cart.items.map((item) => {
      const { product } = item.variant;
      return {
        id: item.id,
        variantId: item.variantId,
        productId: product.id,
        title: product.title,
        quantity: item.quantity,
        price: product.price.toFixed(2),
        discount: product.discount,
        netUnitPrice: netPrice(product.price, product.discount).toFixed(2),
        lineTotal: lineTotal(product.price, product.discount, item.quantity).toFixed(2),
        stock: item.variant.stock,
        isAvailable:
          !product.archivedAt && product.saleEnabled && item.variant.stock >= item.quantity,
        imageUrl: product.images[0] ? mediaUrl(product.images[0].media.filename) : null,
        options: Object.fromEntries(
          item.variant.values.map((x) => [x.value.group.name, x.value.value]),
        ),
      };
    });
    const total = cartItems.reduce((sum, x) => sum.add(x.lineTotal), new Prisma.Decimal(0));
    return {
      cartItems,
      total: total.toFixed(2),
      currency: 'USD',
      requiresResolution: cart.requiresResolution,
    };
  }
  async add(userId: string, dto: CartItemDto) {
    return this.change(userId, dto.variantId, dto.quantity, true);
  }
  async change(userId: string, variantId: number, quantity: number, add = false) {
    await this.db.transaction(async (tx) => {
      const cart = await lockCart(tx, userId);
      const existing = await tx.cartItem.findUnique({
        where: { cartId_variantId: { cartId: cart.id, variantId } },
      });
      if (!add && !existing) fail(404, 'NOT_FOUND', 'Cart item not found');
      if (!existing && (await tx.cartItem.count({ where: { cartId: cart.id } })) >= 100)
        fail(400, 'CART_LIMIT', 'A cart supports at most 100 different items');
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
        include: { product: true },
      });
      const desired = quantity + (add ? (existing?.quantity ?? 0) : 0);
      if (!variant || variant.product.archivedAt || !variant.product.saleEnabled)
        fail(409, 'PRODUCT_UNAVAILABLE', 'Product is unavailable');
      if (desired > 10000 || variant.stock < desired)
        fail(409, 'INSUFFICIENT_STOCK', 'Requested quantity is unavailable');
      await tx.cartItem.upsert({
        where: { cartId_variantId: { cartId: cart.id, variantId } },
        create: { cartId: cart.id, variantId, quantity: desired },
        update: { quantity: desired },
      });
    });
    return this.get(userId);
  }
  async remove(userId: string, variantId?: number) {
    await this.db.transaction(async (tx) => {
      const cart = await lockCart(tx, userId);
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id, ...(variantId === undefined ? {} : { variantId }) },
      });
      if (variantId === undefined)
        await tx.cart.update({ where: { id: cart.id }, data: { requiresResolution: false } });
    });
    return this.get(userId);
  }
}
