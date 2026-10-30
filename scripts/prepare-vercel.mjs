import { build } from 'esbuild';

const runtimePackages = new Set([
  '@prisma/client',
  '@prisma/adapter-pg',
  'pg',
  'argon2',
  'sharp',
  // Mapped DTO types load these through createRequire(import.meta.url). Keep
  // them traceable at runtime so PartialType inherits its validation metadata.
  'class-validator',
  'class-transformer',
]);

// Compile with tsc first: Nest dependency injection needs emitted decorator metadata.
// Bundle JS dependencies so CommonJS packages never require external ESM packages.
await build({
  entryPoints: ['dist/src/bootstrap.js'],
  outfile: 'dist-vercel/bootstrap.mjs',
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  plugins: [
    {
      name: 'traceable-runtime-imports',
      setup(builder) {
        builder.onResolve({ filter: /.*/ }, (args) => {
          if (!runtimePackages.has(args.path)) return;
          if (args.namespace === 'runtime-import') return { path: args.path, external: true };
          return { path: args.path, namespace: 'runtime-import' };
        });
        builder.onLoad({ filter: /.*/, namespace: 'runtime-import' }, (args) => ({
          // Native ESM imports remain visible to Vercel's file tracer. A bundled
          // __require("package") call is opaque to it and silently omits the package.
          contents: `import * as dependency from ${JSON.stringify(args.path)};\nmodule.exports = dependency.default ?? dependency;`,
          loader: 'js',
        }));
      },
    },
  ],
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; import { fileURLToPath as __fileURLToPath } from 'node:url'; import { dirname as __pathDirname } from 'node:path'; const require = __createRequire(import.meta.url); const __filename = __fileURLToPath(import.meta.url); const __dirname = __pathDirname(__filename);",
  },
  external: [
    '@nestjs/microservices',
    '@nestjs/microservices/*',
    '@nestjs/websockets',
    '@nestjs/websockets/*',
    '@nestjs/platform-express',
    '@fastify/view',
    'class-transformer/storage',
  ],
});
