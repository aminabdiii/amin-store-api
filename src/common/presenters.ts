import { Prisma } from '@prisma/client';
import { configuration } from './config';

export const userSelect = {
  id: true,
  email: true,
  username: true,
  fullName: true,
  role: true,
  active: true,
  createdAt: true,
  avatar: { select: { id: true, filename: true } },
} satisfies Prisma.UserSelect;
export function mediaUrl(filename: string): string {
  return `${configuration().mediaPublicUrl}/${encodeURIComponent(filename)}`;
}
export function presentUser(user: Prisma.UserGetPayload<{ select: typeof userSelect }>) {
  const { avatar, ...rest } = user;
  return { ...rest, avatar: avatar ? { id: avatar.id, url: mediaUrl(avatar.filename) } : null };
}
export const productInclude = {
  category: true,
  images: { include: { media: true }, orderBy: { position: 'asc' as const } },
  optionGroups: { include: { values: true }, orderBy: { id: 'asc' as const } },
  variants: {
    include: { values: { include: { value: { include: { group: true } } } } },
    orderBy: { id: 'asc' as const },
  },
} satisfies Prisma.ProductInclude;
export type FullProduct = Prisma.ProductGetPayload<{ include: typeof productInclude }>;
export function presentProduct(p: FullProduct) {
  const { optionGroups, images, variants, ...rest } = p;
  return {
    ...rest,
    price: p.price.toFixed(2),
    rating: p.rating.toFixed(2),
    currency: 'USD',
    isAvailable: p.saleEnabled && !p.archivedAt && variants.some((x) => x.stock > 0),
    images: images.map((x) => ({
      id: x.mediaId,
      url: mediaUrl(x.media.filename),
      position: x.position,
    })),
    options: optionGroups.map((x) => ({
      id: x.id,
      name: x.name,
      values: x.values.map((v) => ({ id: v.id, value: v.value })),
    })),
    variants: variants.map((x) => ({
      id: x.id,
      stock: x.stock,
      options: Object.fromEntries(x.values.map((v) => [v.value.group.name, v.value.value])),
    })),
  };
}
export const orderInclude = {
  items: { include: { selections: true }, orderBy: { id: 'asc' as const } },
} satisfies Prisma.OrderInclude;
export function presentOrder(order: Prisma.OrderGetPayload<{ include: typeof orderInclude }>) {
  const { idempotencyKey: _key, legacyUserId: _legacyUserId, ...rest } = order;
  return {
    ...rest,
    paymentStatus: order.legacy ? 'LEGACY_UNKNOWN' : 'NOT_COLLECTED',
    total: order.total.toFixed(2),
    items: order.items.map((item) => ({
      ...item,
      unitPrice: item.unitPrice.toFixed(2),
      netUnitPrice: item.netUnitPrice.toFixed(2),
      options: Object.fromEntries(item.selections.map((x) => [x.name, x.value])),
      selections: undefined,
    })),
  };
}
