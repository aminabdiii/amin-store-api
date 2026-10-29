import 'dotenv/config';
import { resolve } from 'node:path';

function integer(name: string, fallback: number, min: number, max: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`Invalid ${name}`);
  return value;
}
export function configuration() {
  const jwtSecret = process.env.JWT_SECRET;
  const databaseUrl = process.env.DATABASE_URL;
  if (!jwtSecret || jwtSecret.length < 48)
    throw new Error('JWT_SECRET requires at least 48 characters');
  if (!databaseUrl?.startsWith('postgresql://')) throw new Error('DATABASE_URL is required');
  return {
    port: integer('PORT', 3001, 1, 65535),
    databaseUrl,
    jwtSecret,
    poolMax: integer('DATABASE_POOL_MAX', 10, 1, 50),
    mediaDir: resolve(process.env.MEDIA_DIR ?? './media'),
    mediaPublicUrl: (process.env.MEDIA_PUBLIC_URL ?? 'http://localhost:3001/media').replace(
      /\/$/,
      '',
    ),
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
      .split(',')
      .map((x) => x.trim()),
  };
}
