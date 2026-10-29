import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { Database } from '../common/database';
import { fail, PageQuery, pageResult, skip } from '../common/http';
import { lockCart, cartInclude } from '../cart/cart.service';
import { lineTotal, netPrice } from '../common/money';
import { mediaUrl, orderInclude, presentOrder } from '../common/presenters';
@Injectable()
export class OrdersService {
  constructor(private readonly db: Database) {}
  async checkout(userId: string, key: string) {
    if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(key))
      fail(
        400,
        'INVALID_IDEMPOTENCY_KEY',
        'Idempotency-Key must contain 8–100 letters, numbers, hyphens or underscores',
      );
    return this.db.transaction(async (tx) => {
      const locked = await lockCart(tx, userId);
      const previous = await tx.order.findUnique({
        where: { userId_idempotencyKey: { userId, idempotencyKey: key } },
        include: orderInclude,
      });
      if (previous) return presentOrder(previous);
      const cart = await tx.cart.findUniqueOrThrow({
        where: { id: locked.id },
        include: cartInclude,
      });
      if (cart.requiresResolution)
        fail(
          409,
          'CART_REQUIRES_RESOLUTION',
          'Clear the imported cart and reselect product options before ordering',
        );
      if (!cart.items.length) fail(409, 'EMPTY_CART', 'Cart is empty');
      let total = new Prisma.Decimal(0);
      let leadDays = 0;
      for (const item of cart.items) {
        const p = item.variant.product;
        if (p.archivedAt || !p.saleEnabled)
          fail(409, 'PRODUCT_UNAVAILABLE', 'A cart product is unavailable');
        const changed = await tx.productVariant.updateMany({
          where: { id: item.variantId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (!changed.count)
          fail(409, 'INSUFFICIENT_STOCK', 'A cart item no longer has sufficient inventory');
        total = total.add(lineTotal(p.price, p.discount, item.quantity));
        leadDays = Math.max(leadDays, p.shippingLeadDays);
      }
      const deliveryDate = new Date();
      deliveryDate.setUTCDate(deliveryDate.getUTCDate() + leadDays);
      const order = await tx.order.create({
        data: {
          userId,
          idempotencyKey: key,
          total,
          deliveryDate,
          inventoryDebited: true,
          items: {
            create: cart.items.map((item) => ({
              productId: item.variant.productId,
              variantId: item.variantId,
              title: item.variant.product.title,
              imageUrl: item.variant.product.images[0]
                ? mediaUrl(item.variant.product.images[0].media.filename)
                : null,
              quantity: item.quantity,
              unitPrice: item.variant.product.price,
              discount: item.variant.product.discount,
              netUnitPrice: netPrice(item.variant.product.price, item.variant.product.discount),
              selections: {
                create: item.variant.values.map((x) => ({
                  name: x.value.group.name,
                  value: x.value.value,
                })),
              },
            })),
          },
          movements: {
            create: cart.items.map((item) => ({
              variantId: item.variantId,
              actorId: userId,
              type: 'SALE',
              delta: -item.quantity,
              reason: 'Order placed',
            })),
          },
        },
        include: orderInclude,
      });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return presentOrder(order);
    });
  }
  async list(q: PageQuery, userId?: string) {
    const where = userId ? { userId } : {};
    const [rows, total] = await this.db.$transaction([
      this.db.order.findMany({
        where,
        include: orderInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: skip(q),
        take: q.limit,
      }),
      this.db.order.count({ where }),
    ]);
    return pageResult(rows.map(presentOrder), total, q);
  }
  async detail(id: number, userId?: string) {
    const order = await this.db.order.findFirst({
      where: { id, ...(userId ? { userId } : {}) },
      include: orderInclude,
    });
    if (!order) fail(404, 'NOT_FOUND', 'Order not found');
    return presentOrder(order);
  }
  async status(id: number, status: OrderStatus, actorId: string) {
    return this.db.transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id=${id} FOR UPDATE`;
      const order = await tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
      if (order.status === status) return presentOrder(order);
      const next: Record<OrderStatus, OrderStatus[]> = {
        PLACED: ['PROCESSING', 'CANCELLED'],
        PROCESSING: ['SHIPPED', 'CANCELLED'],
        SHIPPED: ['DELIVERED'],
        DELIVERED: [],
        CANCELLED: [],
      };
      if (!next[order.status].includes(status))
        fail(409, 'INVALID_ORDER_TRANSITION', 'This order status transition is not allowed');
      if (status === 'CANCELLED' && order.inventoryDebited) {
        for (const item of [...order.items].sort(
          (a, b) => (a.variantId ?? 0) - (b.variantId ?? 0),
        )) {
          if (!item.variantId) fail(409, 'MISSING_VARIANT', 'Order inventory cannot be reconciled');
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { increment: item.quantity } },
          });
          await tx.inventoryMovement.create({
            data: {
              orderId: id,
              variantId: item.variantId,
              actorId,
              type: 'CANCELLATION',
              delta: item.quantity,
              reason: 'Order cancelled before shipment',
            },
          });
        }
      }
      return presentOrder(
        await tx.order.update({
          where: { id },
          data: { status, ...(status === 'CANCELLED' ? { inventoryDebited: false } : {}) },
          include: orderInclude,
        }),
      );
    });
  }
}
