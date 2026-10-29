import { Prisma, PrismaClient } from '@prisma/client';
import { mkdir, lstat, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { Asset, Plan, Report, assertImportable } from './core';

export async function writeAssets(directory: string, assets: Map<string, Asset>): Promise<void> {
  const destination = resolve(directory);
  await mkdir(destination, { recursive: true, mode: 0o700 });
  const directoryStat = await lstat(destination);
  if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory())
    throw new Error('Unsafe media directory');
  const written = new Set<string>();
  for (const asset of assets.values()) {
    if (written.has(asset.filename)) continue;
    written.add(asset.filename);
    if (!/^[a-f0-9]{64}\.(png|jpg|webp|gif|avif)$/.test(asset.filename))
      throw new Error('Invalid immutable media filename');
    const file = join(destination, asset.filename);
    try {
      await writeFile(file, asset.data, { flag: 'wx', mode: 0o600 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const stat = await lstat(file);
      if (stat.isSymbolicLink() || !stat.isFile() || !(await readFile(file)).equals(asset.data))
        throw new Error('Existing immutable media file does not match input');
    }
  }
}

export async function applyPlan(
  client: PrismaClient,
  plan: Plan,
  sourceHash: string,
): Promise<{ repeated: boolean; report: Report }> {
  assertImportable(plan);
  return client.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(724503116)`;
      const previous = await tx.importRun.findUnique({ where: { sourceHash } });
      if (previous) return { repeated: true, report: previous.report as unknown as Report };
      // Imports only initialize an empty application database. Changed inputs cannot overwrite live data.
      const populated =
        (await tx.user.count()) +
        (await tx.product.count()) +
        (await tx.category.count()) +
        (await tx.cart.count()) +
        (await tx.order.count()) +
        (await tx.media.count()) +
        (await tx.legacyRecord.count()) +
        (await tx.article.count()) +
        (await tx.faq.count()) +
        (await tx.brand.count()) +
        (await tx.feature.count()) +
        (await tx.importRun.count());
      if (populated) throw new Error('Import refused: existing data requires a reviewed migration');
      if (plan.media.length)
        await tx.media.createMany({ data: plan.media as Prisma.MediaCreateManyInput[] });
      if (plan.users.length)
        await tx.user.createMany({ data: plan.users as Prisma.UserCreateManyInput[] });
      if (plan.categories.length)
        await tx.category.createMany({ data: plan.categories as Prisma.CategoryCreateManyInput[] });
      if (plan.products.length)
        await tx.product.createMany({ data: plan.products as Prisma.ProductCreateManyInput[] });
      if (plan.productImages.length)
        await tx.productImage.createMany({
          data: plan.productImages as Prisma.ProductImageCreateManyInput[],
        });
      if (plan.groups.length)
        await tx.optionGroup.createMany({
          data: plan.groups as Prisma.OptionGroupCreateManyInput[],
        });
      if (plan.values.length)
        await tx.optionValue.createMany({
          data: plan.values as Prisma.OptionValueCreateManyInput[],
        });
      if (plan.variants.length)
        await tx.productVariant.createMany({
          data: plan.variants as Prisma.ProductVariantCreateManyInput[],
        });
      if (plan.variantValues.length)
        await tx.variantValue.createMany({
          data: plan.variantValues as Prisma.VariantValueCreateManyInput[],
        });
      if (plan.reviews.length)
        await tx.review.createMany({ data: plan.reviews as Prisma.ReviewCreateManyInput[] });
      if (plan.articles.length)
        await tx.article.createMany({ data: plan.articles as Prisma.ArticleCreateManyInput[] });
      if (plan.faqs.length)
        await tx.faq.createMany({ data: plan.faqs as Prisma.FaqCreateManyInput[] });
      if (plan.brands.length)
        await tx.brand.createMany({ data: plan.brands as Prisma.BrandCreateManyInput[] });
      if (plan.features.length)
        await tx.feature.createMany({ data: plan.features as Prisma.FeatureCreateManyInput[] });
      if (plan.carts.length)
        await tx.cart.createMany({ data: plan.carts as Prisma.CartCreateManyInput[] });
      if (plan.cartItems.length)
        await tx.cartItem.createMany({ data: plan.cartItems as Prisma.CartItemCreateManyInput[] });
      if (plan.orders.length)
        await tx.order.createMany({ data: plan.orders as Prisma.OrderCreateManyInput[] });
      if (plan.orderItems.length)
        await tx.orderItem.createMany({
          data: plan.orderItems as Prisma.OrderItemCreateManyInput[],
        });
      if (plan.selections.length)
        await tx.orderItemSelection.createMany({
          data: plan.selections as Prisma.OrderItemSelectionCreateManyInput[],
        });
      if (plan.archives.length)
        await tx.legacyRecord.createMany({
          data: plan.archives as Prisma.LegacyRecordCreateManyInput[],
        });
      // Identifiers below are fixed application model names, never dump-derived SQL.
      const serialModels = [
        'Category',
        'Product',
        'ProductImage',
        'OptionGroup',
        'OptionValue',
        'ProductVariant',
        'Review',
        'Article',
        'Faq',
        'Brand',
        'Feature',
        'Cart',
        'CartItem',
        'Order',
        'OrderItem',
        'OrderItemSelection',
        'LegacyRecord',
      ];
      for (const model of serialModels) {
        await tx.$executeRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('"${model}"', 'id'), COALESCE((SELECT MAX(id) FROM "${model}"), 1), EXISTS(SELECT 1 FROM "${model}"))`,
        );
      }
      await tx.importRun.create({
        data: { sourceHash, report: plan.report as unknown as Prisma.InputJsonValue },
      });
      return { repeated: false, report: plan.report };
    },
    {
      maxWait: 10000,
      timeout: 120000,
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}
