import 'dotenv/config';
import { Client } from 'pg';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const q = (name) => '"' + name.replaceAll('"', '""') + '"';
const args = process.argv.slice(2);
if (
  args.length &&
  !(args.length === 1 && args[0] === '--apply') &&
  !(args.length === 2 && args[0] === '--verify')
)
  throw Error('Usage: node scripts/copy-local-to-neon.mjs [--apply | --verify snapshot-file]');
const sourceURL = new URL(process.env.LOCAL_DATABASE_URL ?? process.env.TEST_DATABASE_URL);
if (!process.env.LOCAL_DATABASE_URL) sourceURL.pathname = '/' + process.env.POSTGRES_DB;
if (
  !['localhost', '127.0.0.1'].includes(sourceURL.hostname) ||
  sourceURL.pathname.endsWith('_test')
)
  throw Error('Invalid local source');
const targetURL = new URL(process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL);
if (!targetURL.hostname.endsWith('.neon.tech')) throw Error('Invalid Neon target');
const schemaQuery = `SELECT table_name, column_name, data_type, udt_name, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name <> '_prisma_migrations' ORDER BY table_name, ordinal_position`;
async function remoteOnce(payload) {
  const r = await fetch(`https://${targetURL.hostname}/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Neon-Connection-String': targetURL.href,
      'Neon-Raw-Text-Output': 'true',
      'Neon-Batch-Isolation-Level': 'Serializable',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000),
  });
  const d = await r.json();
  if (!r.ok) throw Error('Neon SQL request failed: ' + r.status + ' code=' + d.code);
  return d;
}
async function remote(payload) {
  const readOnly = (payload.queries ?? [payload]).every(({ query }) =>
    /^SELECT\b/i.test(query.trim()),
  );
  for (let attempt = 0; ; attempt++) {
    try {
      return await remoteOnce(payload);
    } catch (error) {
      // Never retry a submitted write: a dropped response does not prove rollback.
      if (!readOnly || attempt >= 2 || !(error instanceof TypeError)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
}
const select = (query) => remote({ query, params: [] });
const digest = (rows) =>
  createHash('sha256')
    .update(JSON.stringify(rows.map((r) => JSON.stringify(r)).sort()))
    .digest('hex');
async function verify(tables) {
  const checks = await remote({ queries: tables.map((t) => ({ query: t.sql, params: [] })) });
  if (!Array.isArray(checks) || checks.length !== tables.length)
    throw Error('Unexpected verification response');
  for (let i = 0; i < tables.length; i++) {
    const t = tables[i],
      actual = checks[i].rows;
    if (actual.length !== t.rows.length || digest(actual) !== digest(t.rows))
      throw Error('Verification mismatch: ' + t.name);
    console.log('VERIFIED', t.name, actual.length);
  }
  console.log('SUCCESS: all ' + tables.length + ' tables match the local snapshot exactly');
}
(async () => {
  if (args[0] === '--verify') {
    const snapshot = JSON.parse(await readFile(args[1], 'utf8'));
    await verify(snapshot.tables);
    return;
  }
  const local = new Client({ connectionString: sourceURL.href });
  await local.connect();
  try {
    await local.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const schema = (await local.query(schemaQuery)).rows;
    const destSchema = (await select(schemaQuery)).rows;
    if (JSON.stringify(schema) !== JSON.stringify(destSchema))
      throw Error('Source and target schema differ');
    const names = [...new Set(schema.map((c) => c.table_name))];
    const countsQuery = names
      .map((t) => `SELECT '${t}' AS name, count(*)::text AS count FROM public.${q(t)}`)
      .join(' UNION ALL ');
    const before = (await select(countsQuery)).rows;
    console.log(
      'NEON_BEFORE',
      JSON.stringify(Object.fromEntries(before.map((r) => [r.name, Number(r.count)]))),
    );
    if (before.some((r) => r.count !== '0'))
      throw Error('Target is not empty; stopped without mutation');
    const tables = [];
    for (const name of names) {
      const columns = schema.filter((c) => c.table_name === name).map((c) => c.column_name);
      const sql = `SELECT ${columns.map((c) => q(c) + '::text AS ' + q(c)).join(',')} FROM public.${q(name)}`;
      tables.push({ name, columns, sql, rows: (await local.query(sql)).rows });
    }
    const fks = (
      await local.query(
        `SELECT child.relname AS child, parent.relname AS parent, array_agg(a.attname::text ORDER BY k.ord) AS columns FROM pg_constraint c JOIN pg_class child ON child.oid=c.conrelid JOIN pg_namespace n ON n.oid=child.relnamespace JOIN pg_class parent ON parent.oid=c.confrelid JOIN LATERAL unnest(c.conkey) WITH ORDINALITY k(attnum,ord) ON true JOIN pg_attribute a ON a.attrelid=child.oid AND a.attnum=k.attnum WHERE c.contype='f' AND n.nspname='public' GROUP BY c.oid,child.relname,parent.relname`,
      )
    ).rows;
    // The only circular relationship is User.avatarId -> Media.uploaderId -> User.
    const pending = new Set(names),
      ordered = [];
    while (pending.size) {
      const ready = [...pending].filter(
        (t) =>
          !fks.some(
            (f) =>
              f.child === t &&
              pending.has(f.parent) &&
              !(f.child === 'User' && f.columns.length === 1 && f.columns[0] === 'avatarId'),
          ),
      );
      if (!ready.length) throw Error('Unexpected cyclic foreign keys');
      for (const t of ready) {
        ordered.push(t);
        pending.delete(t);
      }
    }
    const sequences = [];
    for (const s of (
      await local.query(
        `SELECT sequencename, increment_by::text FROM pg_sequences WHERE schemaname='public'`,
      )
    ).rows) {
      const state = (
        await local.query(`SELECT last_value::text,is_called FROM public.${q(s.sequencename)}`)
      ).rows[0];
      sequences.push({
        name: s.sequencename,
        next: (
          BigInt(state.last_value) + (state.is_called ? BigInt(s.increment_by) : 0n)
        ).toString(),
      });
    }
    await local.query('COMMIT');
    await mkdir('work/neon-transfer', { recursive: true, mode: 0o700 });
    const backup = 'work/neon-transfer/local-' + Date.now() + '.backup.json';
    await writeFile(backup, JSON.stringify({ schema, tables, sequences, before }), { mode: 0o600 });
    console.log('Snapshot:', backup);
    console.log(
      'Local rows:',
      tables.reduce((n, t) => n + t.rows.length, 0),
    );
    if (args[0] !== '--apply') {
      console.log('Preflight only; target unchanged');
      return;
    }
    const queries = [];
    // Locks plus an in-transaction empty check protect against concurrent API writes.
    queries.push({
      query: `LOCK TABLE ${names.map((t) => 'public.' + q(t)).join(',')} IN ACCESS EXCLUSIVE MODE`,
      params: [],
    });
    queries.push({
      query: `DO $$ BEGIN IF ${names.map((t) => `EXISTS(SELECT 1 FROM public.${q(t)})`).join(' OR ')} THEN RAISE EXCEPTION 'Target is no longer empty'; END IF; END $$`,
      params: [],
    });
    for (const name of ordered) {
      const t = tables.find((t) => t.name === name);
      for (let offset = 0; offset < t.rows.length; offset += 100) {
        const params = [];
        const values = t.rows.slice(offset, offset + 100).map(
          (row) =>
            '(' +
            t.columns
              .map((c) => {
                params.push(name === 'User' && c === 'avatarId' ? null : row[c]);
                return '$' + params.length;
              })
              .join(',') +
            ')',
        );
        queries.push({
          query: `INSERT INTO public.${q(name)} (${t.columns.map(q).join(',')}) VALUES ${values.join(',')}`,
          params,
        });
      }
    }
    for (const row of tables.find((t) => t.name === 'User').rows.filter((r) => r.avatarId !== null))
      queries.push({
        query: 'UPDATE public."User" SET "avatarId"=$1 WHERE id=$2',
        params: [row.avatarId, row.id],
      });
    for (const s of sequences) {
      if (!/^\d+$/.test(s.next)) throw Error('Invalid sequence value');
      queries.push({
        query: `ALTER SEQUENCE public.${q(s.name)} RESTART WITH ${s.next}`,
        params: [],
      });
    }
    console.log('Applying one atomic Neon transaction:', queries.length, 'statements');
    const applied = await remote({ queries });
    console.log('Transaction committed:', Array.isArray(applied) ? applied.length : 'success');
    await verify(tables);
  } finally {
    await local.end();
  }
})().catch((e) => {
  console.error('TRANSFER_ERROR', e.message, e.cause?.code ?? '');
  console.error('If the transaction was submitted, verify its saved snapshot before any retry.');
  process.exitCode = 1;
});
