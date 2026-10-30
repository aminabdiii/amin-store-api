import { nodeFileTrace } from '@vercel/nft';
import assert from 'node:assert/strict';
import { cp, glob, lstat, mkdir, mkdtemp, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import 'dotenv/config';

const root = process.cwd();
const temporary = await mkdtemp(join(tmpdir(), 'amin-store-function-'));
try {
  const { fileList } = await nodeFileTrace(['api/index.mjs'], { base: root });
  const config = JSON.parse(await readFile('vercel.json', 'utf8'));
  const includeFiles = config.functions['api/index.mjs'].includeFiles;
  assert.equal(typeof includeFiles, 'string', 'Vercel functions.includeFiles must be a string');
  assert.ok(includeFiles.length <= 256, 'Vercel includeFiles exceeds schema maxLength');
  const included = [];
  for await (const file of glob(includeFiles)) {
    included.push(file);
    if ((await lstat(file)).isFile()) fileList.add(file);
  }
  assert.ok(included.includes('dist-vercel/bootstrap.mjs'), 'Missing application bundle');
  assert.ok(
    included.some((file) => file.endsWith('/swagger-ui.css')),
    'Missing Swagger assets',
  );
  // Copy only files discovered by the same tracer used by Vercel, not local node_modules.
  for (const file of fileList) {
    const source = resolve(root, file);
    const target = join(temporary, file);
    await mkdir(dirname(target), { recursive: true });
    const stat = await lstat(source);
    if (stat.isSymbolicLink()) {
      const { readlink } = await import('node:fs/promises');
      await symlink(await readlink(source), target);
    } else {
      await cp(source, target);
    }
  }
  const result = spawnSync(
    process.execPath,
    [
      '--no-experimental-require-module',
      '--input-type=module',
      '-e',
      `
      import http from 'node:http';
      import assert from 'node:assert/strict';
      import argon2 from 'argon2';
      import sharp from 'sharp';
      import handler from './api/index.mjs';
      const hash = await argon2.hash('runtime-smoke-test');
      assert.ok(await argon2.verify(hash, 'runtime-smoke-test'));
      const image = await sharp({ create: {
        width: 2, height: 2, channels: 3, background: 'white',
      } }).png().toBuffer();
      assert.equal((await sharp(image).metadata()).width, 2);
      console.log('PASS: isolated native password hashing and image processing');
      const server = http.createServer((req, res) => {
        Promise.resolve(handler(req, res)).catch(error => {
          console.error(error); res.statusCode = 500; res.end();
        });
      });
      server.listen(0, '127.0.0.1', async () => {
        try {
          const base = 'http://127.0.0.1:' + server.address().port;
          const response = await fetch(base + '/docs/openapi.json');
          assert.equal(response.status, 200);
          assert.ok(Object.keys((await response.json()).paths).length > 0);
          const asset = await fetch(base + '/docs/swagger-ui.css');
          assert.equal(asset.status, 200);
          assert.match(await asset.text(), /swagger-ui/);
          console.log('PASS: isolated traced Function serves OpenAPI and Swagger assets');
          const preflight = await fetch(base + '/api/v1/products', {
            method: 'OPTIONS', headers: {
              Origin: process.env.CORS_ORIGINS.split(',')[0].trim(),
              'Access-Control-Request-Method': 'GET',
            },
          });
          assert.equal(preflight.status, 204);
          assert.ok(preflight.headers.get('access-control-allow-origin'));
          const invalid = await fetch(base + '/api/v1/auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{invalid',
          });
          assert.equal(invalid.status, 400);
          const privateRoute = await fetch(base + '/api/v1/users/me');
          assert.equal(privateRoute.status, 401);
          console.log('PASS: isolated CORS, validation and authentication');
          if (process.env.VERIFY_VERCEL_DATABASE === '1') {
            const { PrismaClient } = await import('@prisma/client');
            const { PrismaPg } = await import('@prisma/adapter-pg');
            const database = new PrismaClient({ adapter: new PrismaPg({
              connectionString: process.env.DATABASE_URL,
              connectionTimeoutMillis: 5000,
            }) });
            try {
              await database.product.findMany({ take: 1 });
            } finally {
              await database.$disconnect();
            }
            for (const route of ['products', 'categories', 'articles', 'faqs', 'brands', 'features']) {
              const response = await fetch(base + '/api/v1/' + route);
              assert.equal(response.status, 200, route);
              await response.json();
            }
            console.log('PASS: isolated Function six public endpoints with real database');
          }
          process.exit(0);
        } catch (error) { console.error(error); process.exit(1); }
      });
    `,
    ],
    {
      cwd: temporary,
      encoding: 'utf8',
      timeout: 30000,
      env: { ...process.env, MEDIA_DIR: join(temporary, 'media') },
    },
  );
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Isolated Vercel runtime verification failed');
  console.log(`Traced ${fileList.size} runtime files`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
