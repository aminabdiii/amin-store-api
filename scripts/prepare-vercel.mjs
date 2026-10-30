import { build } from 'esbuild';

// Compile with tsc first: Nest dependency injection needs emitted decorator metadata.
// Bundle JS dependencies so CommonJS packages never require external ESM packages.
await build({
  entryPoints: ['dist/src/bootstrap.js'],
  outfile: 'dist-vercel/bootstrap.mjs',
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  banner: { js: "import { createRequire as __createRequire } from 'node:module'; import { fileURLToPath as __fileURLToPath } from 'node:url'; import { dirname as __pathDirname } from 'node:path'; const require = __createRequire(import.meta.url); const __filename = __fileURLToPath(import.meta.url); const __dirname = __pathDirname(__filename);" },
  external: [
    '@prisma/client', '@prisma/adapter-pg', 'pg', 'argon2', 'sharp',
    '@nestjs/microservices', '@nestjs/microservices/*',
    '@nestjs/websockets', '@nestjs/websockets/*',
    '@nestjs/platform-express', '@fastify/view', 'class-transformer/storage',
  ],
});
