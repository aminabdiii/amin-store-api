import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditInputs } from '../scripts/legacy/core';

test(
  'transactional source import is idempotent and preserves live edits and zero historical inventory',
  { skip: !process.env.IMPORT_TEST_DATABASE_URL },
  async () => {
    if (!new URL(process.env.IMPORT_TEST_DATABASE_URL!).pathname.endsWith('_test'))
      throw new Error('Dedicated import database ending in _test required');
    const { PrismaClient } = await import('@prisma/client');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    const { applyPlan } = await import('../scripts/legacy/apply');
    const client = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.IMPORT_TEST_DATABASE_URL!, max: 3 }),
    });
    const input = await auditInputs(
      '/home/amin/Downloads/db_cluster-22-06-2025@08-18-40.backup.gz',
      '/home/amin/Downloads/ddjggonagtvxnthvjxtr.storage.zip',
      'http://localhost:4000/media',
      { resolveUsernames: true },
    );
    try {
      const first = await applyPlan(client, input.plan, input.sourceHash);
      assert.equal(first.repeated, false);
      assert.equal(await client.user.count(), 20);
      assert.equal(await client.product.count(), 14);
      assert.equal(await client.order.count(), 68);
      assert.equal(await client.orderItem.count(), 138);
      assert.equal(await client.inventoryMovement.count(), 0);
      assert.equal(await client.productVariant.count({ where: { stock: { not: 0 } } }), 0);
      assert.equal(
        await client.order.count({ where: { legacy: true, inventoryDebited: false } }),
        68,
      );
      assert.equal(await client.order.count({ where: { userId: null } }), 4);
      assert.equal(await client.orderItem.count({ where: { productId: null } }), 2);
      const product = await client.product.findFirstOrThrow();
      await client.product.update({
        where: { id: product.id },
        data: { title: 'Live edit preserved' },
      });
      assert.equal((await applyPlan(client, input.plan, input.sourceHash)).repeated, true);
      assert.equal(
        (await client.product.findUniqueOrThrow({ where: { id: product.id } })).title,
        'Live edit preserved',
      );
      assert.equal(await client.importRun.count(), 1);
      await assert.rejects(() => applyPlan(client, input.plan, '0'.repeat(64)), /existing data/);
    } finally {
      await client.$disconnect();
    }
  },
);
