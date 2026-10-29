import 'reflect-metadata';
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createApp } from '../src/app';
import { Database } from '../src/common/database';
import { hashSync } from 'bcryptjs';
import sharp from 'sharp';
import { AuthService } from '../src/auth/auth.service';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';

let app: INestApplication;
let db: Database;
let admin: string;
let buyer: string;
let other: string;
let productId: number;
let variantId: number;
let buyerId: string;
const run = randomUUID();
let testMediaDir: string;
const password = 'Local-test-password!123';
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
before(async () => {
  if (
    !process.env.TEST_DATABASE_URL ||
    !new URL(process.env.TEST_DATABASE_URL).pathname.endsWith('_test')
  )
    throw new Error('Dedicated TEST_DATABASE_URL ending in _test required');
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  await mkdir('work/api-test-media', { recursive: true });
  testMediaDir = await mkdtemp('work/api-test-media/run-');
  process.env.MEDIA_DIR = testMediaDir;
  app = await createApp();
  await app.init();
  db = app.get(Database);
});
after(async () => {
  if (app) await app.close();
  if (testMediaDir) await rm(testMediaDir, { recursive: true, force: true });
});
test('registration rejects privilege injection and creates an owned empty cart', async () => {
  await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      email: `${run}-inject@example.test`,
      username: `inject-${run}`,
      fullName: 'Test',
      password,
      role: 'ADMIN',
    })
    .expect(400);
  for (const name of ['admin', 'buyer', 'other']) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `${run}-${name}@example.test`,
        username: `${name}-${run}`,
        fullName: name,
        password,
      })
      .expect(201);
    assert.equal(response.body.user.role, 'CUSTOMER');
    assert.ok(response.body.accessToken);
    if (name === 'buyer') {
      buyer = response.body.accessToken;
      buyerId = response.body.user.id;
    }
    if (name === 'other') other = response.body.accessToken;
    if (name === 'admin') {
      await db.user.update({ where: { id: response.body.user.id }, data: { role: 'ADMIN' } });
      admin = response.body.accessToken;
    }
  }
  const cart = await request(app.getHttpServer()).get('/api/v1/cart').set(auth(buyer)).expect(200);
  assert.deepEqual(cart.body.cartItems, []);
  await request(app.getHttpServer()).get('/api/v1/admin/users').set(auth(buyer)).expect(403);
  await request(app.getHttpServer())
    .patch('/api/v1/users/me')
    .set(auth(buyer))
    .send({ fullName: null })
    .expect(400);
});
test('catalog normalizes variants, enforces money/option validation and zero initial stock', async () => {
  const category = await request(app.getHttpServer())
    .post('/api/v1/admin/categories')
    .set(auth(admin))
    .send({ title: `Test ${run}`, slug: `test-${run}` })
    .expect(201);
  const product = await request(app.getHttpServer())
    .post('/api/v1/admin/products')
    .set(auth(admin))
    .send({
      title: 'A product',
      categoryId: category.body.id,
      price: '19.99',
      discount: 15,
      shippingLeadDays: 2,
      options: [{ name: 'color', values: ['red', 'blue'] }],
      imageIds: [],
    })
    .expect(201);
  productId = product.body.id;
  variantId = product.body.variants[0].id;
  assert.equal(product.body.price, '19.99');
  assert.equal(product.body.variants.length, 2);
  assert.equal(product.body.isAvailable, false);
  await request(app.getHttpServer())
    .post('/api/v1/admin/products')
    .set(auth(admin))
    .send({ title: 'Invalid', categoryId: category.body.id, price: '1.999', options: [] })
    .expect(400);
  await request(app.getHttpServer())
    .post('/api/v1/admin/variants/' + variantId + '/inventory')
    .set(auth(admin))
    .send({ delta: 3, reason: 'Test initial stock' })
    .expect(201);
  const detail = await request(app.getHttpServer())
    .get(`/api/v1/products/${productId}`)
    .expect(200);
  assert.equal(detail.body.isAvailable, true);
});
test('checkout ignores no client money and is atomic and idempotent', async () => {
  await request(app.getHttpServer())
    .post('/api/v1/orders')
    .set(auth(buyer))
    .set('Idempotency-Key', randomUUID())
    .send({ total: '0.01', userId: buyerId })
    .expect(400);
  await request(app.getHttpServer())
    .post('/api/v1/cart/items')
    .set(auth(buyer))
    .send({ variantId, quantity: 2, price: '0.01' })
    .expect(400);
  await request(app.getHttpServer())
    .post('/api/v1/cart/items')
    .set(auth(buyer))
    .send({ variantId, quantity: 2 })
    .expect(201);
  const key = randomUUID();
  const responses = await Promise.all(
    [1, 2].map(() =>
      request(app.getHttpServer())
        .post('/api/v1/orders')
        .set(auth(buyer))
        .set('Idempotency-Key', key)
        .send({}),
    ),
  );
  assert.deepEqual(
    responses.map((x) => x.status),
    [201, 201],
  );
  assert.equal(responses[0].body.id, responses[1].body.id);
  assert.equal(responses[0].body.total, '33.98');
  assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock, 1);
  await request(app.getHttpServer())
    .get(`/api/v1/orders/${responses[0].body.id}`)
    .set(auth(other))
    .expect(404);
  const cart = await request(app.getHttpServer()).get('/api/v1/cart').set(auth(buyer)).expect(200);
  assert.deepEqual(cart.body.cartItems, []);
  await request(app.getHttpServer())
    .patch(`/api/v1/admin/orders/${responses[0].body.id}/status`)
    .set(auth(admin))
    .send({ status: 'CANCELLED' })
    .expect(200);
  await request(app.getHttpServer())
    .patch(`/api/v1/admin/orders/${responses[0].body.id}/status`)
    .set(auth(admin))
    .send({ status: 'CANCELLED' })
    .expect(200);
  assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock, 3);
});
test('two customers competing for the last item cannot oversell', async () => {
  await request(app.getHttpServer())
    .post(`/api/v1/admin/variants/${variantId}/inventory`)
    .set(auth(admin))
    .send({ delta: -2, reason: 'Keep final item for concurrency test' })
    .expect(201);
  for (const token of [buyer, other])
    await request(app.getHttpServer())
      .post('/api/v1/cart/items')
      .set(auth(token))
      .send({ variantId, quantity: 1 })
      .expect(201);
  const results = await Promise.all(
    [buyer, other].map((token) =>
      request(app.getHttpServer())
        .post('/api/v1/orders')
        .set(auth(token))
        .set('Idempotency-Key', randomUUID())
        .send({}),
    ),
  );
  assert.deepEqual(results.map((x) => x.status).sort(), [201, 409]);
  assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock, 0);
  const loser = results[0].status === 409 ? buyer : other;
  const cart = await request(app.getHttpServer()).get('/api/v1/cart').set(auth(loser)).expect(200);
  assert.equal(cart.body.cartItems.length, 1);
});
test('reviews remain private until moderated and rating comes from approved reviews', async () => {
  const review = await request(app.getHttpServer())
    .post('/api/v1/reviews')
    .set(auth(buyer))
    .send({ productId, content: 'A useful review', rating: 5 })
    .expect(201);
  let listing = await request(app.getHttpServer())
    .get(`/api/v1/products/${productId}/reviews`)
    .expect(200);
  assert.equal(listing.body.meta.total, 0);
  await request(app.getHttpServer())
    .patch(`/api/v1/admin/reviews/${review.body.id}`)
    .set(auth(admin))
    .send({ approved: true })
    .expect(200);
  listing = await request(app.getHttpServer())
    .get(`/api/v1/products/${productId}/reviews`)
    .expect(200);
  assert.equal(listing.body.meta.total, 1);
  const product = await request(app.getHttpServer())
    .get(`/api/v1/products/${productId}`)
    .expect(200);
  assert.equal(product.body.rating, '5.00');
});
test('refresh reuse revokes the entire family including issued access tokens', async () => {
  const login = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: `${run}-buyer@example.test`, password })
    .expect(200);
  const next = await request(app.getHttpServer())
    .post('/api/v1/auth/refresh')
    .send({ refreshToken: login.body.refreshToken })
    .expect(200);
  await request(app.getHttpServer())
    .post('/api/v1/auth/refresh')
    .send({ refreshToken: login.body.refreshToken })
    .expect(401);
  await request(app.getHttpServer())
    .post('/api/v1/auth/refresh')
    .send({ refreshToken: next.body.refreshToken })
    .expect(401);
  await request(app.getHttpServer())
    .get('/api/v1/users/me')
    .set(auth(next.body.accessToken))
    .expect(401);
});
test('legacy bcrypt passwords upgrade after successful login', async () => {
  const email = `${run}-legacy@example.test`;
  const user = await db.user.create({
    data: {
      email,
      username: `legacy-${run}`,
      fullName: 'Legacy',
      passwordHash: hashSync(password, 4),
    },
  });
  await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200);
  assert.ok(
    (await db.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash.startsWith(
      '$argon2id$',
    ),
  );
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: buyerId } })).active, true);
});
test('safe uploads reject executable files, cross-user avatar access and bad signatures', async () => {
  await request(app.getHttpServer())
    .post('/api/v1/media/avatar')
    .set(auth(buyer))
    .attach('file', Buffer.from('<script>bad</script>'), {
      filename: 'bad.png',
      contentType: 'image/png',
    })
    .expect(400);
  await request(app.getHttpServer())
    .post('/api/v1/media/images')
    .set(auth(buyer))
    .attach('file', Buffer.from('bad'), { filename: 'bad.png', contentType: 'image/png' })
    .expect(403);
});
test('API validates bounded identifiers, nonblank titles, null updates and pagination', async () => {
  await request(app.getHttpServer()).get('/api/v1/products/99999999999999999').expect(400);
  await request(app.getHttpServer()).get('/api/v1/products/0/reviews').expect(400);
  await request(app.getHttpServer()).get('/api/v1/products?limit=101').expect(400);
  await request(app.getHttpServer())
    .patch(`/api/v1/admin/products/${productId}`)
    .set(auth(admin))
    .send({ title: null })
    .expect(400);
  const product = await db.product.findUniqueOrThrow({ where: { id: productId } });
  await request(app.getHttpServer())
    .post('/api/v1/admin/products')
    .set(auth(admin))
    .send({ title: '   ', categoryId: product.categoryId, price: '1.00' })
    .expect(400);
});
test('concurrent cart increments do not lose updates and multi-item failure rolls back earlier stock', async () => {
  await request(app.getHttpServer()).delete('/api/v1/cart').set(auth(buyer)).expect(200);
  const categoryId = (await db.product.findUniqueOrThrow({ where: { id: productId } })).categoryId;
  const first = await db.product.create({
    data: {
      title: 'Rollback first',
      categoryId,
      price: '3.33',
      variants: { create: { signature: '{}', stock: 3 } },
    },
    include: { variants: true },
  });
  const second = await db.product.create({
    data: {
      title: 'Rollback last',
      categoryId,
      price: '1.00',
      variants: { create: { signature: '{}', stock: 1 } },
    },
    include: { variants: true },
  });
  const firstId = first.variants[0].id;
  const secondId = second.variants[0].id;
  const increments = await Promise.all(
    [1, 2].map(() =>
      request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set(auth(buyer))
        .send({ variantId: firstId, quantity: 1 }),
    ),
  );
  assert.deepEqual(
    increments.map((r) => r.status),
    [201, 201],
  );
  const cart = await request(app.getHttpServer()).get('/api/v1/cart').set(auth(buyer)).expect(200);
  assert.equal(cart.body.cartItems[0].quantity, 2);
  await request(app.getHttpServer())
    .post('/api/v1/cart/items')
    .set(auth(buyer))
    .send({ variantId: secondId, quantity: 1 })
    .expect(201);
  await request(app.getHttpServer())
    .post(`/api/v1/admin/variants/${secondId}/inventory`)
    .set(auth(admin))
    .send({ delta: -1, reason: 'Item unavailable after cart update' })
    .expect(201);
  await request(app.getHttpServer())
    .post('/api/v1/orders')
    .set(auth(buyer))
    .set('Idempotency-Key', randomUUID())
    .send({})
    .expect(409);
  assert.equal((await db.productVariant.findUniqueOrThrow({ where: { id: firstId } })).stock, 3);
  assert.equal(await db.cartItem.count({ where: { cart: { userId: buyerId } } }), 2);
  assert.equal(
    await db.inventoryMovement.count({ where: { variantId: firstId, type: 'SALE' } }),
    0,
  );
});
test('valid avatar uploads become immutable local WebP and cannot change another profile', async () => {
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ff0000' } })
    .png()
    .toBuffer();
  const uploaded = await request(app.getHttpServer())
    .post('/api/v1/media/avatar')
    .set(auth(buyer))
    .attach('file', png, { filename: 'test.png', contentType: 'image/png' })
    .expect(201);
  assert.equal(uploaded.body.mimeType, 'image/webp');
  const me = await request(app.getHttpServer())
    .get('/api/v1/users/me')
    .set(auth(buyer))
    .expect(200);
  assert.equal(me.body.avatar.id, uploaded.body.id);
  const someoneElse = await request(app.getHttpServer())
    .get('/api/v1/users/me')
    .set(auth(other))
    .expect(200);
  assert.equal(someoneElse.body.avatar, null);
  const media = await request(app.getHttpServer())
    .get(new URL(uploaded.body.url).pathname)
    .expect(200);
  assert.equal(media.headers['content-type'], 'image/webp');
  assert.equal(media.body.subarray(0, 4).toString(), 'RIFF');
});
test('the last active administrator cannot be disabled or demoted', async () => {
  const current = await request(app.getHttpServer())
    .get('/api/v1/users/me')
    .set(auth(admin))
    .expect(200);
  const previous = await db.user.findMany({
    where: { role: 'ADMIN', active: true, id: { not: current.body.id } },
    select: { id: true },
  });
  await db.user.updateMany({
    where: { id: { in: previous.map((x) => x.id) } },
    data: { active: false },
  });
  try {
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${current.body.id}`)
      .set(auth(admin))
      .send({ active: false })
      .expect(409);
    await request(app.getHttpServer())
      .patch(`/api/v1/admin/users/${current.body.id}`)
      .set(auth(admin))
      .send({ role: 'CUSTOMER' })
      .expect(409);
  } finally {
    await db.user.updateMany({
      where: { id: { in: previous.map((x) => x.id) } },
      data: { active: true },
    });
  }
});
test('logout includes the successor committed by a concurrently refreshing session', async () => {
  const email = `${randomUUID()}@example.test`;
  const user = await db.user.create({
    data: {
      email,
      username: randomUUID(),
      fullName: 'Session race',
      passwordHash: hashSync(password, 4),
    },
  });
  const signed = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200);
  const claims = JSON.parse(
    Buffer.from(signed.body.accessToken.split('.')[1], 'base64url').toString(),
  ) as { sid: string };
  const original = await db.session.findUniqueOrThrow({ where: { id: claims.sid } });
  const nextToken = randomBytes(32).toString('base64url');
  const nextId = randomUUID();
  let release!: () => void;
  let ready!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const locked = new Promise<void>((resolve) => {
    ready = resolve;
  });
  const refreshTransaction = db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Session" WHERE id=${original.id}::uuid FOR UPDATE`;
      ready();
      await gate;
      await tx.session.update({ where: { id: original.id }, data: { revokedAt: new Date() } });
      await tx.session.create({
        data: {
          id: nextId,
          userId: user.id,
          familyId: original.familyId,
          tokenHash: createHash('sha256').update(nextToken).digest('hex'),
          expiresAt: new Date(Date.now() + 86400000),
        },
      });
    },
    { timeout: 15000 },
  );
  await locked;
  const logout = app.get(AuthService).logout(original.id);
  try {
    let waiting = false;
    for (let i = 0; i < 1000; i++) {
      const rows = await db.$queryRaw<
        { waiting: bigint }[]
      >`SELECT count(*) AS waiting FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%Session%'`;
      if (rows[0].waiting > 0n) {
        waiting = true;
        break;
      }
    }
    assert.equal(waiting, true, 'logout must reach the session-family lock before refresh commits');
    release();
    await refreshTransaction;
    await logout;
    assert.ok(
      (await db.session.findUniqueOrThrow({ where: { id: nextId } })).revokedAt,
      'logout must revoke the successor session',
    );
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: nextToken })
      .expect(401);
  } finally {
    release();
    await refreshTransaction.catch(() => undefined);
    await logout.catch(() => undefined);
  }
});
test('OpenAPI documents canonical responses, decimal money and public authentication routes', async () => {
  const response = await request(app.getHttpServer()).get('/docs/openapi.json').expect(200);
  const document = response.body;
  assert.equal(
    document.paths['/api/v1/products'].get.responses['200'].content['application/json'].schema.$ref,
    '#/components/schemas/ProductPage',
  );
  assert.equal(document.components.schemas.StoreProduct.properties.price.type, 'string');
  assert.deepEqual(document.paths['/api/v1/auth/login'].post.security, []);
  assert.ok(document.components.schemas.StoreCart.properties.cartItems);
  assert.equal(document.components.schemas.StoreCart.properties.cardItems, undefined);
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    for (const [key, entry] of Object.entries(value)) {
      if (key === '$ref' && typeof entry === 'string' && entry.startsWith('#/components/schemas/'))
        assert.ok(
          document.components.schemas[entry.split('/').at(-1)!],
          `Unresolved schema ${entry}`,
        );
      else visit(entry);
    }
  };
  visit(document);
  const invalid = await request(app.getHttpServer()).get('/api/v1/products/0').expect(400);
  assert.equal(invalid.body.code, 'INVALID_ID');
  assert.equal(invalid.body.requestId, invalid.headers['x-request-id']);
  const health = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
  assert.equal(health.body.database, 'connected');
});
