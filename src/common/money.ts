import { Prisma } from '@prisma/client';
export function netPrice(price: Prisma.Decimal.Value, discount: number): Prisma.Decimal {
  if (!Number.isInteger(discount) || discount < 0 || discount > 99)
    throw new RangeError('Invalid discount');
  const value = new Prisma.Decimal(price);
  if (!value.isFinite() || value.isNegative()) throw new RangeError('Invalid price');
  return value
    .mul(100 - discount)
    .div(100)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}
export function lineTotal(
  price: Prisma.Decimal.Value,
  discount: number,
  quantity: number,
): Prisma.Decimal {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000)
    throw new RangeError('Invalid quantity');
  return netPrice(price, discount).mul(quantity);
}
