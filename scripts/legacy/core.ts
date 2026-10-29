import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import sanitize from 'sanitize-html';

export type Row = Record<string, string | null>;
export type Entity = Record<string, unknown>;
export type Asset = {
  legacyPath: string;
  filename: string;
  mimeType: string;
  size: number;
  data: Buffer;
  sourceMimeType?: string;
};
export type Counts = { source: number; imported: number; archived: number };
export type Report = {
  tables: Record<string, Counts>;
  assets: {
    entries: number;
    accepted: number;
    quarantined: number;
    missingReferences: number;
    transcoded: number;
    quarantineReasons: Record<string, number>;
    sourceFormats: Record<string, number>;
  };
  issues: Record<string, number>;
  identities: {
    invalid: number;
    duplicate: number;
    usernameConflicts: number;
    usernameRenamed: number;
    usernameNormalized: number;
  };
  historicalOrderItems: number;
  historicalTotalsRounded: number;
  cartLines: { source: number; imported: number; archived: number };
  shadowPurchases: number;
};
export type Plan = {
  report: Report;
  users: Entity[];
  media: Entity[];
  categories: Entity[];
  products: Entity[];
  productImages: Entity[];
  groups: Entity[];
  values: Entity[];
  variants: Entity[];
  variantValues: Entity[];
  reviews: Entity[];
  articles: Entity[];
  faqs: Entity[];
  brands: Entity[];
  features: Entity[];
  carts: Entity[];
  cartItems: Entity[];
  orders: Entity[];
  orderItems: Entity[];
  selections: Entity[];
  archives: Entity[];
};
const sourceTables = [
  'auth.users',
  'public.users',
  'public.categories',
  'public.products',
  'public.comments',
  'public.articles',
  'public.questions',
  'public."popular-brands"',
  'public.features',
  'public.carts',
  'public.purchases',
];
const aliases: Record<string, string> = {
  color: 'color',
  colors: 'color',
  size: 'size',
  sizes: 'size',
  warranty: 'warranty',
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class IdentityConflictError extends Error {
  readonly counts: { invalid: number; duplicate: number };
  constructor(counts: { invalid: number; duplicate: number }) {
    super(`Identity conflicts: invalid=${counts.invalid}, duplicate=${counts.duplicate}`);
    this.counts = counts;
  }
}
function fail(message: string): never {
  throw new Error(message);
}
export function decodeCopy(text: string): string | null {
  if (text === '\\N') return null;
  return text.replace(/\\(x[0-9a-fA-F]{1,2}|[0-7]{1,3}|.)/gs, (_all, escaped: string) => {
    if (escaped[0] === 'x') return String.fromCharCode(parseInt(escaped.slice(1), 16));
    if (/^[0-7]/.test(escaped)) return String.fromCharCode(parseInt(escaped, 8));
    return (
      ({ b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v' } as Record<string, string>)[
        escaped
      ] ?? escaped
    );
  });
}
class CopyParser {
  readonly tables = new Map<string, Row[]>();
  private table: string | null = null;
  private columns: string[] = [];
  private rows = 0;
  line(line: string): void {
    if (this.table) {
      if (line === '\\.') {
        this.table = null;
        return;
      }
      const cells = line.split('\t');
      if (cells.length !== this.columns.length) fail('COPY column count mismatch');
      if (++this.rows > 1_000_000) fail('COPY row limit exceeded');
      this.tables
        .get(this.table)!
        .push(
          Object.fromEntries(
            this.columns.map((column, index) => [column, decodeCopy(cells[index])]),
          ),
        );
      return;
    }
    const match = /^COPY ((?:"[\w-]+"|\w+)\.(?:"[\w-]+"|\w+)) \((.+)\) FROM stdin;$/.exec(line);
    if (!match) return;
    if (this.tables.has(match[1])) fail('Duplicate COPY section');
    this.columns = match[2].split(',').map((x) => x.trim().replace(/^"|"$/g, ''));
    if (
      new Set(this.columns).size !== this.columns.length ||
      this.columns.some((x) => !/^[\w-]+$/.test(x))
    )
      fail('Invalid COPY columns');
    this.table = match[1];
    this.tables.set(this.table, []);
  }
  finish(): Map<string, Row[]> {
    if (this.table) fail('Unterminated COPY section');
    return this.tables;
  }
}
export function parseCopy(sql: string): Map<string, Row[]> {
  const parser = new CopyParser();
  for (const line of sql.split(/\r?\n/)) parser.line(line);
  return parser.finish();
}
async function readBackup(path: string): Promise<Map<string, Row[]>> {
  const stream = createReadStream(path).pipe(createGunzip());
  let size = 0;
  stream.on('data', (chunk) => {
    size += chunk.length;
    if (size > 256 * 1024 * 1024) stream.destroy(new Error('Backup expansion limit exceeded'));
  });
  const parser = new CopyParser();
  for await (const line of createInterface({ input: stream, crlfDelay: Infinity }))
    parser.line(line);
  return parser.finish();
}
export function decimal(input: unknown): string {
  const text = String(input);
  if (!/^(0|[1-9]\d{0,17})(\.\d{1,2})?$/.test(text)) fail('Invalid nonnegative decimal');
  const [whole, fraction = ''] = text.split('.');
  return `${whole}.${fraction.padEnd(2, '0')}`;
}
export function historicalTotal(input: unknown): string {
  const raw = String(input);
  if (!/^(0|[1-9]\d{0,17})(\.\d{1,30})?$/.test(raw)) fail('Invalid historical decimal');
  const [whole, fraction = ''] = raw.split('.');
  let cents = BigInt(whole) * 100n + BigInt(fraction.slice(0, 2).padEnd(2, '0'));
  if (fraction.length > 2 && fraction[2] >= '5') cents++;
  return decimal(`${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`);
}
export function netPrice(price: unknown, discount: number): string {
  if (!Number.isInteger(discount) || discount < 0 || discount > 99) fail('Invalid discount');
  const cents = BigInt(decimal(price).replace('.', ''));
  const net = (cents * BigInt(100 - discount) + 50n) / 100n;
  return `${net / 100n}.${String(net % 100n).padStart(2, '0')}`;
}
function integer(value: unknown, min = 0, max = 2_147_483_647): number {
  const parsed = Number(value);
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    !Number.isInteger(parsed) ||
    parsed < min ||
    parsed > max
  )
    fail('Invalid integer field');
  return parsed;
}
function text(value: unknown, max = 1000000): string {
  if (typeof value !== 'string' || value.length > max) fail('Invalid text field');
  return value;
}
function date(value: unknown): Date {
  const d = new Date(text(value));
  if (!Number.isFinite(d.getTime())) fail('Invalid timestamp');
  return d;
}
function json(value: string | null | undefined, fallback: unknown = null): unknown {
  return value == null ? fallback : JSON.parse(value);
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Expected JSON object');
  return value as Record<string, unknown>;
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) fail('Expected JSON array');
  return value;
}
function bool(value: unknown): boolean {
  if (value === 't' || value === true) return true;
  if (value === 'f' || value === false) return false;
  return fail('Invalid boolean field');
}
export function optionGroups(input: unknown): { name: string; values: string[] }[] {
  const groups = array(input).map((item) => {
    const row = object(item),
      title = text(row.title, 100),
      name = aliases[title];
    if (!name) fail('Unknown option group');
    const values = [...new Set(array(row[title]).map((x) => text(x, 150).trim()))];
    if (!values.length || values.some((x) => !x)) fail('Empty option value');
    return { name, values };
  });
  if (new Set(groups.map((x) => x.name)).size !== groups.length) fail('Duplicate option groups');
  if (groups.reduce((count, g) => count * g.values.length, 1) > 10000)
    fail('Variant expansion limit');
  return groups.sort((a, b) => a.name.localeCompare(b.name));
}
export function selection(input: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(input))
    if (aliases[key] && value != null && value !== '') {
      const name = aliases[key],
        normalized = text(value, 150);
      if (result[name] && result[name] !== normalized) fail('Conflicting option aliases');
      result[name] = normalized;
    }
  return result;
}
export function signature(input: Record<string, string>): string {
  return JSON.stringify(Object.entries(input).sort(([a], [b]) => a.localeCompare(b)));
}
export function validateZipEntry(
  path: string,
  size: number,
  external: number,
  stats: { entries: number; total: number },
): void {
  if (
    !path ||
    path.includes('\\') ||
    path.includes('\0') ||
    path.startsWith('/') ||
    /^[A-Za-z]:/.test(path) ||
    path.split('/').some((x) => x === '..' || x === '.')
  )
    fail('Unsafe ZIP path');
  if (((external >>> 16) & 0o170000) === 0o120000) fail('ZIP symlink is forbidden');
  if (stats.entries > 10000) fail('ZIP entry count limit exceeded');
  if (!Number.isSafeInteger(size) || size < 0 || size > 20 * 1024 * 1024)
    fail('ZIP entry size limit exceeded');
  if (stats.total > 512 * 1024 * 1024) fail('ZIP total size limit exceeded');
}
function imageType(data: Buffer): { mimeType: string; extension: string } | null {
  if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return { mimeType: 'image/png', extension: 'png' };
  if (data[0] === 255 && data[1] === 216 && data[2] === 255)
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  if (['GIF87a', 'GIF89a'].includes(data.subarray(0, 6).toString()))
    return { mimeType: 'image/gif', extension: 'gif' };
  if (data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP')
    return { mimeType: 'image/webp', extension: 'webp' };
  if (
    data.subarray(4, 8).toString() === 'ftyp' &&
    ['avif', 'avis'].includes(data.subarray(8, 12).toString())
  )
    return { mimeType: 'image/avif', extension: 'avif' };
  return null;
}
export async function auditStorage(path: string): Promise<{
  assets: Map<string, Asset>;
  entries: number;
  quarantined: number;
  transcoded: number;
  reasons: Record<string, number>;
  formats: Record<string, number>;
  rejected: { path: string; reason: string }[];
}> {
  const yauzl = await import('yauzl');
  const sharp = (await import('sharp')).default;
  return new Promise((resolve, reject) => {
    yauzl.open(
      path,
      { lazyEntries: true, validateEntrySizes: true, strictFileNames: true },
      (error, zip) => {
        if (error || !zip) {
          reject(error ?? new Error('Cannot read ZIP'));
          return;
        }
        const assets = new Map<string, Asset>();
        let entries = 0,
          total = 0,
          quarantined = 0,
          transcoded = 0;
        let settled = false;
        const reasons: Record<string, number> = {},
          formats: Record<string, number> = {},
          rejected: { path: string; reason: string }[] = [];
        const paths = new Set<string>();
        const abort = (reason: unknown) => {
          if (!settled) {
            settled = true;
            zip.close();
            reject(reason);
          }
        };
        zip.on('error', abort);
        zip.on('end', () => {
          if (!settled) {
            settled = true;
            resolve({ assets, entries, quarantined, transcoded, reasons, formats, rejected });
          }
        });
        zip.on('entry', (entry) => {
          try {
            entries++;
            total += entry.uncompressedSize;
            validateZipEntry(entry.fileName, entry.uncompressedSize, entry.externalFileAttributes, {
              entries,
              total,
            });
            if (entry.fileName.endsWith('/')) {
              zip.readEntry();
              return;
            }
            const parts = entry.fileName.split('/');
            if (parts.length < 3) fail('ZIP asset requires project/bucket/path');
            const legacyPath = parts.slice(1).join('/');
            if (paths.has(legacyPath)) fail('Duplicate ZIP asset path');
            paths.add(legacyPath);
            zip.openReadStream(entry, (readError, stream) => {
              if (readError || !stream) {
                abort(readError ?? new Error('Cannot read ZIP entry'));
                return;
              }
              const chunks: Buffer[] = [];
              let size = 0;
              stream.on('error', abort);
              stream.on('data', (chunk: Buffer) => {
                size += chunk.length;
                if (size > 20 * 1024 * 1024 || size > entry.uncompressedSize) {
                  stream.destroy();
                  abort(new Error('ZIP expanded size mismatch'));
                } else chunks.push(chunk);
              });
              stream.on('end', () => {
                void (async () => {
                  let data: Buffer = Buffer.concat(chunks);
                  let type = imageType(data);
                  if (size !== entry.uncompressedSize) fail('ZIP size mismatch');
                  const svgText = data
                    .toString('utf8')
                    .replace(/^\uFEFF/, '')
                    .trimStart();
                  const svg = /^(?:<\?xml[^>]*>\s*)?<svg(?:\s|>)/i.test(svgText);
                  const sourceMimeType =
                    type?.mimeType ?? (svg ? 'image/svg+xml' : size === 0 ? 'empty' : 'unknown');
                  formats[sourceMimeType] = (formats[sourceMimeType] ?? 0) + 1;
                  const quarantine = (reason: string) => {
                    quarantined++;
                    reasons[reason] = (reasons[reason] ?? 0) + 1;
                    rejected.push({ path: legacyPath, reason });
                    zip.readEntry();
                  };
                  if (
                    svg &&
                    (/<!\s*(?:DOCTYPE|ENTITY)|<\s*(?:script|foreignObject)\b|\bon[a-z]+\s*=|@import/i.test(
                      svgText,
                    ) ||
                      /\b(?:xlink:)?href\s*=\s*["'](?!#)[^"']+/i.test(svgText) ||
                      /url\(\s*["']?(?!#)[^)]/i.test(svgText))
                  ) {
                    quarantine('unsafe_svg');
                    return;
                  }
                  if (!type && !svg) {
                    quarantine(size === 0 ? 'empty_file' : 'unsupported_signature');
                    return;
                  }
                  try {
                    const image = sharp(data, { limitInputPixels: 40_000_000 });
                    const metadata = await image.metadata();
                    if (
                      !metadata.width ||
                      !metadata.height ||
                      metadata.width * metadata.height > 40_000_000
                    )
                      throw new Error('Invalid image dimensions');
                    if (svg) {
                      data = await image.png().toBuffer();
                      type = { mimeType: 'image/png', extension: 'png' };
                      transcoded++;
                    }
                  } catch {
                    quarantine('invalid_image');
                    return;
                  }
                  if (!type) fail('Missing validated image type');
                  const filename =
                    createHash('sha256').update(data).digest('hex') + '.' + type.extension;
                  assets.set(legacyPath, {
                    legacyPath,
                    filename,
                    mimeType: type.mimeType,
                    size: data.length,
                    data,
                    sourceMimeType,
                  });
                  zip.readEntry();
                })().catch(abort);
              });
            });
          } catch (reason) {
            abort(reason);
          }
        });
        zip.readEntry();
      },
    );
  });
}
export function safePayload(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(safePayload);
  if (input && typeof input === 'object')
    return Object.fromEntries(
      Object.entries(input)
        .filter(
          ([key]) => !/(password|token|secret|credential|nonce|raw_key|otp|auth_code)/i.test(key),
        )
        .map(([key, value]) => [key, safePayload(value)]),
    );
  if (typeof input === 'string') {
    if (/^\s*[\[{]/.test(input)) {
      try {
        return safePayload(JSON.parse(input));
      } catch {
        /* retain plain content */
      }
    }
    return input.replace(/https?:\/\/[^\s"'<>]+/g, (url) => url.split('?')[0]);
  }
  return input;
}
function stableUuid(key: string): string {
  const hash = createHash('sha256')
    .update('legacy-media:' + key)
    .digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
function route(value: string): string {
  return value
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/[ _]+/g, '-')
    .toLowerCase();
}

export function resolveUsernameMap(
  input: { id: string; createdAt: string; username: string }[],
  enabled: boolean,
): {
  usernames: Map<string, string>;
  conflicts: number;
  renamed: number;
  normalized: number;
  changes: { id: string; original: string; replacement: string }[];
} {
  const ordered = [...input].sort(
    (a, b) => date(a.createdAt).getTime() - date(b.createdAt).getTime() || a.id.localeCompare(b.id),
  );
  const reserved = new Set(ordered.map((x) => x.username.trim().toLowerCase())),
    used = new Set<string>(),
    usernames = new Map<string, string>();
  const changes: { id: string; original: string; replacement: string }[] = [];
  let conflicts = 0,
    renamed = 0,
    normalized = 0;
  for (const entry of ordered) {
    const base = entry.username.trim().toLowerCase();
    let replacement = base;
    if (entry.username !== base) normalized++;
    if (used.has(base)) {
      conflicts++;
      if (enabled) {
        const suffix = entry.id.replaceAll('-', '').toLowerCase();
        let length = 8;
        do {
          if (length > 32) fail('Unable to resolve username collision');
          replacement = base.slice(0, 99 - length) + '-' + suffix.slice(0, length);
          length += 4;
        } while (used.has(replacement) || reserved.has(replacement));
        renamed++;
      }
    }
    used.add(replacement);
    usernames.set(entry.id, replacement);
    if (enabled && entry.username !== replacement)
      changes.push({ id: entry.id, original: entry.username, replacement });
  }
  return { usernames, conflicts, renamed, normalized, changes };
}
export function assertImportable(plan: Plan): void {
  if (plan.report.identities.invalid || plan.report.identities.duplicate)
    throw new IdentityConflictError(plan.report.identities);
}

export function buildPlan(
  tables: Map<string, Row[]>,
  assets: Map<string, Asset>,
  publicUrl: string,
  options: { allowIdentityConflicts?: boolean; resolveUsernames?: boolean } = {},
): Plan {
  const report: Report = {
    tables: {},
    assets: {
      entries: assets.size,
      accepted: assets.size,
      quarantined: 0,
      missingReferences: 0,
      transcoded: 0,
      quarantineReasons: {},
      sourceFormats: {},
    },
    issues: {},
    identities: {
      invalid: 0,
      duplicate: 0,
      usernameConflicts: 0,
      usernameRenamed: 0,
      usernameNormalized: 0,
    },
    historicalOrderItems: 0,
    historicalTotalsRounded: 0,
    cartLines: { source: 0, imported: 0, archived: 0 },
    shadowPurchases: 0,
  };
  const plan: Plan = {
    report,
    users: [],
    media: [],
    categories: [],
    products: [],
    productImages: [],
    groups: [],
    values: [],
    variants: [],
    variantValues: [],
    reviews: [],
    articles: [],
    faqs: [],
    brands: [],
    features: [],
    carts: [],
    cartItems: [],
    orders: [],
    orderItems: [],
    selections: [],
    archives: [],
  };
  const rows = (name: string) => tables.get(name) ?? [];
  const issue = (name: string) => {
    report.issues[name] = (report.issues[name] ?? 0) + 1;
  };
  for (const table of sourceTables)
    report.tables[table] = { source: rows(table).length, imported: 0, archived: 0 };
  const done = (table: string) => {
    report.tables[table].imported++;
  };
  const archive = (
    table: string,
    id: unknown,
    reason: string,
    payload: unknown,
    reconcile = true,
  ) => {
    plan.archives.push({
      sourceTable: table,
      sourceId: String(id),
      reason,
      payload: safePayload(payload),
    });
    issue(reason);
    if (reconcile) report.tables[table].archived++;
  };
  for (const table of sourceTables) {
    const ids = new Set<string>();
    for (const row of rows(table)) {
      const id = row.id;
      if (!id || ids.has(id)) fail('Duplicate or missing source record ID');
      ids.add(id);
    }
  }
  const auth = rows('auth.users'),
    authIds = new Set(auth.map((x) => x.id));
  const roleMap = new Map<string, string>();
  for (const row of rows('public.users')) {
    if (!row.userId || !authIds.has(row.userId)) {
      archive('public.users', row.id, 'orphan_public_user', row);
      continue;
    }
    if (roleMap.has(row.userId)) throw new IdentityConflictError({ invalid: 0, duplicate: 1 });
    if (!['admin', 'authenticated'].includes(row.role ?? ''))
      throw new IdentityConflictError({ invalid: 1, duplicate: 0 });
    roleMap.set(row.userId, row.role!);
    done('public.users');
  }
  const usernameInput = auth.flatMap((row) => {
    try {
      const meta = object(json(row.raw_user_meta_data, {}));
      return typeof meta.userName === 'string'
        ? [{ id: row.id ?? '', createdAt: row.created_at ?? '', username: meta.userName }]
        : [];
    } catch {
      return [];
    }
  });
  const usernameMapping = resolveUsernameMap(usernameInput, options.resolveUsernames ?? false);
  report.identities.usernameConflicts = usernameMapping.conflicts;
  report.identities.usernameRenamed = usernameMapping.renamed;
  report.identities.usernameNormalized = usernameMapping.normalized;
  report.identities.duplicate = options.resolveUsernames ? 0 : usernameMapping.conflicts;
  if (options.resolveUsernames)
    for (const change of usernameMapping.changes)
      archive('migration.usernames', change.id, 'username_normalization', change, false);
  const emails = new Set<string>();
  for (const row of auth) {
    let metadata: Record<string, unknown>;
    try {
      metadata = object(json(row.raw_user_meta_data, {}));
    } catch {
      report.identities.invalid++;
      archive('auth.users', row.id, 'invalid_identity', row);
      continue;
    }
    const email = (row.email ?? '').trim().toLowerCase(),
      username = usernameMapping.usernames.get(row.id ?? '') ?? '';
    const fullName = typeof metadata.fullName === 'string' ? metadata.fullName.trim() : '';
    if (
      !uuid.test(row.id ?? '') ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 ||
      !username ||
      username.length > 100 ||
      !fullName ||
      fullName.length > 200 ||
      !/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(row.encrypted_password ?? '')
    ) {
      report.identities.invalid++;
      archive('auth.users', row.id, 'invalid_identity', row);
      continue;
    }
    if (emails.has(email)) report.identities.duplicate++;
    emails.add(email);
    plan.users.push({
      id: row.id,
      email,
      username,
      fullName,
      passwordHash: row.encrypted_password,
      role: roleMap.get(row.id!) === 'admin' ? 'ADMIN' : 'CUSTOMER',
      active:
        !row.deleted_at && (!row.banned_until || date(row.banned_until).getTime() < Date.now()),
      createdAt: date(row.created_at),
    });
    done('auth.users');
  }
  if (!options.allowIdentityConflicts && (report.identities.invalid || report.identities.duplicate))
    throw new IdentityConflictError(report.identities);
  const userIds = new Set(plan.users.map((x) => x.id));
  const byPath = new Map<string, Entity>();
  const byFilename = new Map<string, Entity>();
  for (const asset of assets.values()) {
    let media = byFilename.get(asset.filename);
    if (!media) {
      media = {
        id: stableUuid(asset.filename),
        filename: asset.filename,
        mimeType: asset.mimeType,
        size: asset.size,
        legacyPath: asset.legacyPath,
      };
      plan.media.push(media);
      byFilename.set(asset.filename, media);
    }
    byPath.set(asset.legacyPath, media);
  }
  const mediaId = (input: unknown): string | null => {
    if (input == null || input === '') return null;
    const raw = text(input);
    let path = raw;
    if (/^https?:\/\//i.test(raw)) {
      let url: URL;
      try {
        url = new URL(raw);
      } catch {
        issue('invalid_asset_url');
        report.assets.missingReferences++;
        return null;
      }
      const match = /^\/storage\/v1\/object\/(?:public|sign)\/(.+)$/.exec(url.pathname);
      if (!match) {
        issue('external_asset_removed');
        report.assets.missingReferences++;
        return null;
      }
      try {
        path = decodeURIComponent(match[1]);
      } catch {
        issue('invalid_asset_url');
        report.assets.missingReferences++;
        return null;
      }
    }
    const media = byPath.get(path);
    if (!media) {
      issue('missing_asset_reference');
      report.assets.missingReferences++;
      return null;
    }
    return media.id as string;
  };
  const mediaUrls = new Map(
    plan.media.map((m) => [m.id, `${publicUrl.replace(/\/$/, '')}/${m.filename}`]),
  );
  const localUrl = (raw: unknown) => {
    const id = mediaId(raw);
    return id ? mediaUrls.get(id)! : null;
  };
  const html = (value: unknown) => {
    const rewritten = text(value ?? '').replace(/https?:\/\/[^\s"'<>]+/gi, (raw) =>
      raw.includes('/storage/v1/object/') ? (localUrl(raw.replace(/&amp;/g, '&')) ?? '') : raw,
    );
    return sanitize(rewritten, {
      allowedTags: [...sanitize.defaults.allowedTags, 'img'],
      allowedAttributes: {
        ...sanitize.defaults.allowedAttributes,
        img: ['src', 'alt', 'width', 'height'],
      },
      allowedSchemes: ['http', 'https', 'mailto'],
      transformTags: {
        img: (_name, attributes) => ({
          tagName: 'img',
          attribs: {
            ...attributes,
            src: attributes.src?.startsWith(publicUrl.replace(/\/$/, '') + '/')
              ? attributes.src
              : '',
          },
        }),
      },
    });
  };
  for (let index = 0; index < auth.length; index++) {
    const row = auth[index],
      user = plan.users.find((x) => x.id === row.id)!;
    if (!user) continue;
    user.avatarId = mediaId(object(json(row.raw_user_meta_data, {})).avatar);
  }
  const categoryLookup = new Map<string, number>(),
    slugs = new Set<string>();
  for (const row of rows('public.categories')) {
    const id = integer(row.id, 1),
      slug = text(row.path, 200).replace(/^\/+|\/+$/g, '');
    if (!slug || slugs.has(slug)) fail('Duplicate or empty category route');
    slugs.add(slug);
    for (const key of [route(text(row.title)), route(slug)]) {
      if (categoryLookup.has(key) && categoryLookup.get(key) !== id)
        fail('Ambiguous category mapping');
      categoryLookup.set(key, id);
    }
    plan.categories.push({
      id,
      title: text(row.title, 200),
      slug,
      imageId: mediaId(row.image),
      createdAt: date(row.created_at),
    });
    done('public.categories');
  }
  const productIds = new Set<number>();
  const variantsByProduct = new Map<number, Map<string, number>>();
  const groupsByProduct = new Map<number, { name: string; values: string[] }[]>();
  for (const row of rows('public.products')) {
    const id = integer(row.id, 1),
      categoryId = categoryLookup.get(route(text(row.category)));
    if (!categoryId) fail('Unmapped product category');
    productIds.add(id);
    const price = decimal(row.price),
      discount = integer(row.discount, 0, 99);
    netPrice(price, discount);
    plan.products.push({
      id,
      title: text(row.title, 250),
      description: html(row.description ?? ''),
      categoryId,
      price,
      discount,
      shippingLeadDays: integer(row.postType, 1, 365),
      isPreSale: bool(row.isPreSale),
      saleEnabled: bool(row.isAvailable),
      views: integer(row.view ?? '0'),
      rating: '0.00',
      createdAt: date(row.created_at),
    });
    const images = [row.image, ...array(json(row.otherImages, []))];
    let position = 0;
    const seenImages = new Set<string>();
    for (const image of images) {
      const imageId = mediaId(image);
      if (imageId && !seenImages.has(imageId)) {
        seenImages.add(imageId);
        plan.productImages.push({ productId: id, mediaId: imageId, position: position++ });
      }
    }
    const groups = optionGroups(json(row.chooseFields, []));
    groupsByProduct.set(id, groups);
    let combinations: Record<string, string>[] = [{}];
    const valueIds = new Map<string, number>();
    for (const group of groups) {
      const groupId = plan.groups.length + 1;
      plan.groups.push({ id: groupId, productId: id, name: group.name });
      for (const value of group.values) {
        const valueId = plan.values.length + 1;
        plan.values.push({ id: valueId, groupId, value });
        valueIds.set(`${group.name}\0${value}`, valueId);
      }
      combinations = combinations.flatMap((combo) =>
        group.values.map((value) => ({ ...combo, [group.name]: value })),
      );
    }
    const variantMap = new Map<string, number>();
    variantsByProduct.set(id, variantMap);
    for (const combination of combinations) {
      const variantId = plan.variants.length + 1,
        key = signature(combination);
      plan.variants.push({ id: variantId, productId: id, signature: key, stock: 0 });
      variantMap.set(key, variantId);
      for (const [name, value] of Object.entries(combination))
        plan.variantValues.push({ variantId, valueId: valueIds.get(`${name}\0${value}`)! });
    }
    done('public.products');
  }
  const resolveVariant = (id: number, chosen: Record<string, string>) => {
    const groups = groupsByProduct.get(id);
    if (
      !groups ||
      groups.length !== Object.keys(chosen).length ||
      groups.some((g) => !g.values.includes(chosen[g.name]))
    )
      return null;
    return variantsByProduct.get(id)?.get(signature(chosen)) ?? null;
  };
  for (const row of rows('public.comments')) {
    const productId = integer(row.productId, 1),
      rating = integer(row.rate, 1, 5);
    if (!productIds.has(productId) || !userIds.has(row.userId)) {
      archive('public.comments', row.id, 'orphan_review', row);
      continue;
    }
    plan.reviews.push({
      id: integer(row.id, 1),
      productId,
      userId: row.userId,
      content: text(row.content),
      rating,
      approved: bool(row.isConfirm),
      createdAt: date(row.created_at),
    });
    done('public.comments');
  }
  for (const product of plan.products) {
    const ratings = plan.reviews
      .filter((x) => x.productId === product.id && x.approved === true)
      .map((x) => x.rating as number);
    product.rating = ratings.length
      ? (Math.round((ratings.reduce((sum, x) => sum + x, 0) * 100) / ratings.length) / 100).toFixed(
          2,
        )
      : '0.00';
  }
  for (const row of rows('public.articles')) {
    plan.articles.push({
      id: integer(row.id, 1),
      title: text(row.title),
      content: html(row.content),
      imageId: mediaId(row.image),
      createdAt: date(row.created_at),
    });
    done('public.articles');
  }
  for (const row of rows('public.questions')) {
    plan.faqs.push({
      id: integer(row.id, 1),
      title: text(row.title),
      description: html(row.description),
      createdAt: date(row.created_at),
    });
    done('public.questions');
  }
  for (const row of rows('public."popular-brands"')) {
    plan.brands.push({
      id: integer(row.id, 1),
      title: '',
      imageId: mediaId(row.image),
      createdAt: date(row.created_at),
    });
    done('public."popular-brands"');
  }
  for (const row of rows('public.features')) {
    plan.features.push({
      id: integer(row.id, 1),
      title: text(row.title),
      description: html(row.description),
      shadowColor: row.shadowColor,
      imageId: mediaId(row.image),
      createdAt: date(row.created_at),
    });
    done('public.features');
  }
  const cartUsers = new Set<unknown>();
  for (const row of rows('public.carts')) {
    const cartId = integer(row.id, 1),
      lines = array(json(row.cart_items, [])),
      shadow = array(json(row.purchases, []));
    report.cartLines.source += lines.length;
    report.shadowPurchases += shadow.length;
    if (!userIds.has(row.user_id)) {
      archive('public.carts', row.id, 'orphan_cart', row);
      report.cartLines.archived += lines.length;
      continue;
    }
    if (cartUsers.has(row.user_id)) fail('Duplicate cart ownership');
    cartUsers.add(row.user_id);
    const cart = { id: cartId, userId: row.user_id, requiresResolution: false };
    plan.carts.push(cart);
    done('public.carts');
    if (shadow.length)
      archive('public.carts.purchases', row.id, 'cart_shadow_purchases', shadow, false);
    const cartVariants = new Set<number>();
    for (let index = 0; index < lines.length; index++) {
      const rawLine = lines[index];
      let variantId: number | null = null,
        quantity = 0;
      try {
        const line = object(rawLine);
        const parsedQuantity = integer(line.count, 1, 10000);
        const resolvedVariant = resolveVariant(integer(line.id, 1), selection(line));
        quantity = parsedQuantity;
        variantId = resolvedVariant;
      } catch {
        variantId = null;
      }
      if (!variantId || cartVariants.has(variantId)) {
        cart.requiresResolution = true;
        archive(
          'public.carts.items',
          `${cartId}:${index}`,
          'unresolved_cart_line',
          { line: rawLine },
          false,
        );
        report.cartLines.archived++;
        continue;
      }
      cartVariants.add(variantId);
      plan.cartItems.push({ cartId, variantId, quantity });
      report.cartLines.imported++;
    }
  }
  for (const row of rows('public.purchases')) {
    const orderId = integer(row.id, 1),
      userId = userIds.has(row.userId) ? row.userId : null;
    if (!userId) issue('orphan_order_owner');
    const total = historicalTotal(row.totalPrice);
    if ((row.totalPrice ?? '').split('.')[1]?.length > 2) {
      report.historicalTotalsRounded++;
      archive(
        'migration.order-totals',
        row.id,
        'historical_total_precision',
        { original: row.totalPrice, replacement: total },
        false,
      );
    }
    plan.orders.push({
      id: orderId,
      userId,
      legacyUserId: userId ? null : row.userId,
      legacy: true,
      inventoryDebited: false,
      status: bool(row.isDelivered) ? 'DELIVERED' : 'PLACED',
      currency: 'USD',
      total,
      deliveryDate: row.delivery_date ? date(row.delivery_date) : null,
      createdAt: date(row.created_at),
    });
    done('public.purchases');
    for (const entry of array(json(row.products, []))) {
      const item = object(entry),
        legacyProductId = integer(item.id, 1),
        productId = productIds.has(legacyProductId) ? legacyProductId : null;
      const chosen = selection(item),
        variantId = productId ? resolveVariant(productId, chosen) : null;
      if (!productId)
        archive(
          'public.purchases.items',
          `${orderId}:${plan.orderItems.length + 1}`,
          'historical_missing_product',
          item,
          false,
        );
      else if (!variantId) issue('historical_unresolved_variant');
      const id = plan.orderItems.length + 1,
        unitPrice = decimal(item.price),
        discount = integer(item.discount ?? 0, 0, 99);
      plan.orderItems.push({
        id,
        orderId,
        productId,
        variantId,
        title: text(item.title),
        imageUrl: localUrl(item.image),
        unitPrice,
        discount,
        netUnitPrice: netPrice(unitPrice, discount),
        quantity: integer(item.count, 1, 10000),
      });
      for (const [name, value] of Object.entries(chosen))
        plan.selections.push({ orderItemId: id, name, value });
    }
  }
  report.historicalOrderItems = plan.orderItems.length;
  for (const counts of Object.values(report.tables))
    if (counts.source !== counts.imported + counts.archived)
      fail('Source table reconciliation failed');
  return plan;
}
async function fileHash(path: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}
export async function auditInputs(
  backup: string,
  storage: string,
  publicUrl: string,
  options: { resolveUsernames?: boolean } = {},
): Promise<{ plan: Plan; assets: Map<string, Asset>; sourceHash: string }> {
  const [tables, zip, backupHash, storageHash] = await Promise.all([
    readBackup(backup),
    auditStorage(storage),
    fileHash(backup),
    fileHash(storage),
  ]);
  const plan = buildPlan(tables, zip.assets, publicUrl, {
    allowIdentityConflicts: true,
    ...options,
  });
  plan.report.assets.entries = zip.entries;
  plan.report.assets.quarantined = zip.quarantined;
  plan.report.assets.transcoded = zip.transcoded;
  plan.report.assets.quarantineReasons = zip.reasons;
  plan.report.assets.sourceFormats = zip.formats;
  for (const rejected of zip.rejected)
    plan.archives.push({
      sourceTable: 'storage.assets',
      sourceId: rejected.path,
      reason: rejected.reason,
      payload: { path: rejected.path },
    });
  for (const asset of zip.assets.values())
    if (asset.sourceMimeType && asset.sourceMimeType !== asset.mimeType)
      plan.archives.push({
        sourceTable: 'migration.media',
        sourceId: asset.legacyPath,
        reason: 'image_transcoded',
        payload: {
          path: asset.legacyPath,
          originalMimeType: asset.sourceMimeType,
          replacementMimeType: asset.mimeType,
        },
      });
  return {
    plan,
    assets: zip.assets,
    sourceHash: createHash('sha256')
      .update(`backup:${backupHash};storage:${storageHash}`)
      .digest('hex'),
  };
}
