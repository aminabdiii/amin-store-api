import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  parseCopy,
  decodeCopy,
  decimal,
  netPrice,
  optionGroups,
  signature,
  selection,
  validateZipEntry,
  safePayload,
  buildPlan,
  auditInputs,
  resolveUsernameMap,
  historicalTotal,
} from '../scripts/legacy/core';

test('COPY decoding preserves data and never interprets surrounding SQL', () => {
  const sql =
    'DROP TABLE users;\nCOPY public.questions (id, title, description) FROM stdin;\n7\tHello\\tworld\tline\\nnext\\\\end\n8\t\\N\t\\141\\x62\n\\.\nSELECT evil();\n';
  assert.deepEqual(parseCopy(sql).get('public.questions'), [
    { id: '7', title: 'Hello\tworld', description: 'line\nnext\\end' },
    { id: '8', title: null, description: 'ab' },
  ]);
  assert.equal(decodeCopy('\\\\N'), '\\N');
  assert.throws(
    () => parseCopy('COPY public.questions (id, title) FROM stdin;\n1\n\\.\n'),
    /column/i,
  );
  assert.throws(() => parseCopy('COPY public.questions (id) FROM stdin;\n1\n'), /unterminated/i);
});

test('money remains exact and option aliases resolve deterministic complete selections', () => {
  assert.equal(decimal('9007199254740993.12'), '9007199254740993.12');
  assert.equal(netPrice('19.99', 25), '14.99');
  assert.equal(historicalTotal('5275.0599999999995'), '5275.06');
  assert.equal(historicalTotal('16.119999999999997'), '16.12');
  assert.equal(historicalTotal('2990.7200000000003'), '2990.72');
  assert.equal(historicalTotal('1.005'), '1.01');
  assert.throws(() => decimal('1.001'), /decimal/i);
  assert.throws(() => decimal('-1'), /decimal/i);
  const groups = optionGroups([
    { title: 'colors', colors: ['black', 'white'] },
    { title: 'sizes', sizes: ['40', '41'] },
  ]);
  assert.deepEqual(groups, [
    { name: 'color', values: ['black', 'white'] },
    { name: 'size', values: ['40', '41'] },
  ]);
  assert.equal(
    signature(selection({ colors: 'black', sizes: '41' })),
    '[["color","black"],["size","41"]]',
  );
  assert.throws(() => selection({ color: 'white', colors: 'black' }), /conflicting/i);
  assert.throws(() => optionGroups([{ title: 'unknown', unknown: ['x'] }]), /option/i);
});

test('ZIP rejects traversal, symlinks, excessive expansion and archive payload secrets', () => {
  assert.throws(() => validateZipEntry('../escape', 1, 0, { entries: 1, total: 1 }), /path/);
  assert.throws(() => validateZipEntry('root/a\\b', 1, 0, { entries: 1, total: 1 }), /path/);
  assert.throws(
    () => validateZipEntry('root/link', 1, 0o120777 << 16, { entries: 1, total: 1 }),
    /symlink/,
  );
  assert.throws(
    () => validateZipEntry('root/a.png', 21 * 1024 * 1024, 0, { entries: 1, total: 1 }),
    /size/,
  );
  assert.throws(() => validateZipEntry('root/a.png', 1, 0, { entries: 10001, total: 1 }), /count/);
  assert.throws(
    () => validateZipEntry('root/a.png', 1, 0, { entries: 1, total: 513 * 1024 * 1024 }),
    /total/,
  );
  assert.deepEqual(
    safePayload({
      encrypted_password: 'secret',
      nested: { token: 'secret', name: 'kept' },
      image: 'https://a/storage/v1/object/sign/x/y?token=secret',
    }),
    { nested: { name: 'kept' }, image: 'https://a/storage/v1/object/sign/x/y' },
  );
});

test('identity conflicts abort planning without inventing accounts or trusting metadata roles', () => {
  const tables = parseCopy(
    'COPY auth.users (id, email, encrypted_password, raw_user_meta_data, created_at) FROM stdin;\n11111111-1111-4111-8111-111111111111\ta@example.test\t$2a$10$12345678901234567890123456789012345678901234567890123\t{"fullName":"A","userName":"same","role":"admin"}\t2024-01-01\n22222222-2222-4222-8222-222222222222\tb@example.test\t$2a$10$12345678901234567890123456789012345678901234567890123\t{"fullName":"B","userName":"same"}\t2024-01-01\n\\.\n',
  );
  assert.throws(
    () => buildPlan(tables, new Map(), 'http://localhost:4000/media'),
    /identity conflicts/i,
  );
});

const backup = '/home/amin/Downloads/db_cluster-22-06-2025@08-18-40.backup.gz';
test('malformed cart lines are archived without creating invalid quantities or losing source values', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const created_at = '2024-01-01';
  const tables = new Map<string, Record<string, string | null>[]>([
    [
      'auth.users',
      [
        {
          id,
          email: 'cart@example.test',
          encrypted_password: '$2a$10$12345678901234567890123456789012345678901234567890123',
          raw_user_meta_data: JSON.stringify({ fullName: 'Cart user', userName: 'cartuser' }),
          created_at,
        },
      ],
    ],
    ['public.categories', [{ id: '1', title: 'cat', path: 'cat', created_at }]],
    [
      'public.products',
      [
        {
          id: '1',
          title: 'Product',
          category: 'cat',
          price: '1.00',
          postType: '1',
          discount: '0',
          isAvailable: 't',
          isPreSale: 'f',
          chooseFields: '[]',
          otherImages: '[]',
          view: '0',
          created_at,
        },
      ],
    ],
    [
      'public.carts',
      [
        {
          id: '1',
          user_id: id,
          cart_items: JSON.stringify([{ id: 1, count: 0 }, null]),
          purchases: '[]',
          created_at,
        },
      ],
    ],
    [
      'public.purchases',
      [
        {
          id: '1',
          userId: id,
          totalPrice: '1.00',
          isDelivered: 'f',
          products: JSON.stringify([
            { id: 999, title: 'Removed product', price: '1.00', discount: 0, count: 1 },
          ]),
          created_at,
        },
      ],
    ],
  ]);
  const plan = buildPlan(tables, new Map(), 'http://localhost:3001/media');
  assert.equal(plan.cartItems.length, 0);
  assert.equal(plan.carts[0].requiresResolution, true);
  assert.equal(plan.report.cartLines.archived, 2);
  assert.equal(plan.report.cartLines.imported, 0);
  assert.ok(
    plan.archives.some(
      (x) => x.reason === 'historical_missing_product' && JSON.stringify(x.payload).includes('999'),
    ),
  );
});
const storage = '/home/amin/Downloads/ddjggonagtvxnthvjxtr.storage.zip';
test(
  'real source dry-run reconciles every business row and preserves historical lines',
  { skip: !existsSync(backup) || !existsSync(storage) },
  async () => {
    const blocked = await auditInputs(backup, storage, 'http://localhost:4000/media');
    assert.equal(blocked.plan.report.identities.duplicate, 2);
    const result = await auditInputs(backup, storage, 'http://localhost:4000/media', {
      resolveUsernames: true,
    });
    const report = result.plan.report;
    assert.equal(report.tables['auth.users'].source, 20);
    assert.equal(report.tables['public.products'].source, 14);
    assert.equal(report.tables['public.categories'].source, 16);
    assert.equal(report.tables['public.purchases'].imported, 68);
    assert.equal(result.plan.orderItems.length, 138);
    assert.equal(result.plan.orders.filter((x) => x.userId === null).length, 4);
    assert.equal(result.plan.orderItems.filter((x) => x.productId === null).length, 2);
    assert.equal(report.tables['public.users'].archived, 4);
    assert.equal(report.tables['public.carts'].archived, 9);
    assert.equal(result.plan.users.filter((x) => x.role === 'ADMIN').length, 1);
    assert.equal(result.plan.report.identities.usernameRenamed, 2);
    assert.equal(new Set(result.plan.users.map((x) => String(x.username).toLowerCase())).size, 20);
    assert(result.plan.variants.every((x) => x.stock === 0));
    assert(result.plan.orders.every((x) => x.inventoryDebited === false));
    for (const counts of Object.values(report.tables))
      assert.equal(counts.imported + counts.archived, counts.source);
    const json = JSON.stringify(report);
    assert(!json.includes('@'));
    assert(!json.includes('token='));
    assert(!json.includes('$2a$'));
    assert(!JSON.stringify(result.plan.orderItems).includes('supabase.co'));
  },
);

test('CLI defaults to audit and refuses contradictory or unknown mutation flags', async () => {
  const { parseArgs } = await import('../scripts/legacy/options');
  assert.deepEqual(parseArgs(['--backup', 'b.gz', '--storage', 's.zip']), {
    backup: 'b.gz',
    storage: 's.zip',
    apply: false,
    resolveUsernames: false,
  });
  assert.equal(parseArgs(['--backup', 'b.gz', '--storage', 's.zip', '--apply']).apply, true);
  assert.equal(
    parseArgs(['--backup', 'b.gz', '--storage', 's.zip', '--resolve-usernames']).resolveUsernames,
    true,
  );
  assert.throws(
    () => parseArgs(['--backup', 'b.gz', '--storage', 's.zip', '--apply', '--dry-run']),
    /contradictory/i,
  );
  assert.throws(() => parseArgs(['--backup', 'b.gz', '--storage', 's.zip', '--force']), /Unknown/);
});

test('immutable media writes reject collisions and symlink destinations', async () => {
  const { mkdtemp, readFile, writeFile, symlink, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { writeAssets } = await import('../scripts/legacy/apply');
  const directory = await mkdtemp(join(tmpdir(), 'legacy-assets-'));
  const filename = 'a'.repeat(64) + '.png';
  const asset = {
    legacyPath: 'products/test',
    filename,
    mimeType: 'image/png',
    size: 3,
    data: Buffer.from('one'),
  };
  try {
    await writeAssets(directory, new Map([['products/test', asset]]));
    await writeAssets(directory, new Map([['products/test', asset]]));
    assert.equal((await readFile(join(directory, filename))).toString(), 'one');
    await assert.rejects(
      () =>
        writeAssets(
          directory,
          new Map([['products/test', { ...asset, data: Buffer.from('two') }]]),
        ),
      /does not match/,
    );
    const target = join(directory, 'outside');
    await writeFile(target, 'safe');
    await rm(join(directory, filename));
    await symlink(target, join(directory, filename));
    await assert.rejects(
      () => writeAssets(directory, new Map([['products/test', asset]])),
      /does not match/,
    );
    assert.equal((await readFile(target)).toString(), 'safe');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('untrusted auth metadata cannot grant administrator role', () => {
  const tables = parseCopy(
    'COPY auth.users (id, email, encrypted_password, raw_user_meta_data, created_at) FROM stdin;\n11111111-1111-4111-8111-111111111111\ta@example.test\t$2a$10$12345678901234567890123456789012345678901234567890123\t{"fullName":"A","userName":"unique","role":"admin"}\t2024-01-01\n\\.\n',
  );
  assert.equal(
    buildPlan(tables, new Map(), 'http://localhost:4000/media').users[0].role,
    'CUSTOMER',
  );
});

function zipFixture(name: string, data: Buffer, attributes = 0): Buffer {
  const filename = Buffer.from(name),
    local = Buffer.alloc(30),
    central = Buffer.alloc(46),
    end = Buffer.alloc(22);
  local.writeUInt32LE(0x04034b50);
  local.writeUInt16LE(20, 4);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(filename.length, 26);
  central.writeUInt32LE(0x02014b50);
  central.writeUInt16LE(0x0314, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt32LE(data.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(filename.length, 28);
  central.writeUInt32LE(attributes >>> 0, 38);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length + filename.length, 12);
  end.writeUInt32LE(local.length + filename.length + data.length, 16);
  return Buffer.concat([local, filename, data, central, filename, end]);
}

test('actual ZIP reader rejects malicious entries and quarantines disguised non-images', async () => {
  const { auditStorage } = await import('../scripts/legacy/core');
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const directory = await mkdtemp(join(tmpdir(), 'legacy-zip-')),
    path = join(directory, 'source.zip');
  try {
    await writeFile(path, zipFixture('../escape', Buffer.from('data')));
    await assert.rejects(() => auditStorage(path));
    await writeFile(path, zipFixture('root/bucket/link', Buffer.from('target'), 0o120777 << 16));
    await assert.rejects(() => auditStorage(path), /symlink/i);
    await writeFile(
      path,
      zipFixture('root/bucket/picture.png', Buffer.from('<script>bad()</script>')),
    );
    const result = await auditStorage(path);
    assert.equal(result.assets.size, 0);
    assert.equal(result.quarantined, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('explicit collision policy keeps every identity and resolves usernames independent of input order', () => {
  const identities = [
    { id: '22222222-2222-4222-8222-222222222222', createdAt: '2024-02-01', username: 'Same' },
    { id: '11111111-1111-4111-8111-111111111111', createdAt: '2024-01-01', username: 'same' },
    {
      id: '33333333-3333-4333-8333-333333333333',
      createdAt: '2024-03-01',
      username: 'same-22222222',
    },
  ];
  const unresolved = resolveUsernameMap(identities, false);
  assert.equal(unresolved.conflicts, 1);
  const first = resolveUsernameMap(identities, true),
    second = resolveUsernameMap([...identities].reverse(), true);
  assert.deepEqual([...first.usernames].sort(), [...second.usernames].sort());
  assert.equal(first.usernames.size, 3);
  assert.equal(first.usernames.get(identities[1].id), 'same');
  assert.equal(first.usernames.get(identities[0].id), 'same-222222222222');
  assert.equal(first.renamed, 1);
  assert.equal(new Set(first.usernames.values()).size, 3);
});

test('SVG import rasterizes valid logos and quarantines active or external content', async () => {
  const { auditStorage } = await import('../scripts/legacy/core');
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const directory = await mkdtemp(join(tmpdir(), 'legacy-svg-')),
    path = join(directory, 'source.zip');
  try {
    await writeFile(
      path,
      zipFixture(
        'root/brands/logo.svg',
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="red"/></svg>',
        ),
      ),
    );
    const valid = await auditStorage(path),
      asset = valid.assets.get('brands/logo.svg')!;
    assert.equal(valid.quarantined, 0);
    assert.equal(valid.transcoded, 1);
    assert.equal(asset.mimeType, 'image/png');
    assert(asset.data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
    await writeFile(
      path,
      zipFixture(
        'root/brands/bad.svg',
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><script>alert(1)</script></svg>',
        ),
      ),
    );
    const active = await auditStorage(path);
    assert.equal(active.assets.size, 0);
    assert.equal(active.reasons.unsafe_svg, 1);
    await writeFile(
      path,
      zipFixture(
        'root/brands/external.svg',
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><image href="https://example.test/secret"/></svg>',
        ),
      ),
    );
    assert.equal((await auditStorage(path)).reasons.unsafe_svg, 1);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
