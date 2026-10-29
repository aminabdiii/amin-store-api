import { Prisma } from '@prisma/client';

export function isTransactionConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code === 'P2034') return true;
  if (error.code !== 'P2010') return false;
  const adapter = error.meta?.driverAdapterError as
    { cause?: { originalCode?: string; kind?: string } } | undefined;
  const sqlState = String(error.meta?.code ?? adapter?.cause?.originalCode ?? '');
  return (
    ['40001', '40P01'].includes(sqlState) || adapter?.cause?.kind === 'TransactionWriteConflict'
  );
}
