import dotenv from 'dotenv';
dotenv.config({ quiet: true });
import { resolve } from 'node:path';
import { auditInputs, IdentityConflictError, assertImportable } from './legacy/core';
import { parseArgs } from './legacy/options';

export async function main(args: string[]): Promise<void> {
  const options = parseArgs(args);
  const publicUrl = process.env.MEDIA_PUBLIC_URL ?? 'http://localhost:3001/media';
  const publicEndpoint = new URL(publicUrl);
  if (
    !['http:', 'https:'].includes(publicEndpoint.protocol) ||
    publicEndpoint.username ||
    publicEndpoint.password ||
    publicEndpoint.search ||
    publicEndpoint.hash
  )
    throw new Error('Invalid media public URL');
  const input = await auditInputs(resolve(options.backup), resolve(options.storage), publicUrl, {
    resolveUsernames: options.resolveUsernames,
  });
  if (!options.apply) {
    console.log(
      JSON.stringify(
        {
          mode: 'dry-run',
          readyToApply:
            !input.plan.report.identities.invalid && !input.plan.report.identities.duplicate,
          report: input.plan.report,
        },
        null,
        2,
      ),
    );
    return;
  }
  assertImportable(input.plan);
  const database = process.env.DATABASE_URL;
  if (!database) throw new Error('DATABASE_URL is required for apply');
  const endpoint = new URL(database);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname))
    throw new Error('Import apply requires a local database');
  const { PrismaClient } = await import('@prisma/client');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const { applyPlan, writeAssets } = await import('./legacy/apply');
  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString: database, max: 10 }),
  });
  try {
    await writeAssets(resolve(process.env.MEDIA_DIR ?? './media'), input.assets);
    const result = await applyPlan(client, input.plan, input.sourceHash);
    console.log(
      JSON.stringify({ mode: 'apply', repeated: result.repeated, report: result.report }, null, 2),
    );
  } finally {
    await client.$disconnect();
  }
}
if (require.main === module)
  void main(process.argv.slice(2)).catch((error: unknown) => {
    if (error instanceof IdentityConflictError)
      console.error(JSON.stringify({ error: 'identity_conflicts', identities: error.counts }));
    console.error(
      'Import failed; no database changes were committed. Check inputs, identity conflicts, local configuration, and database readiness.',
    );
    process.exitCode = 1;
  });
