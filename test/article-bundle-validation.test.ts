import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, lstat, mkdir, mkdtemp, readlink, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { nodeFileTrace } from '@vercel/nft';

test('the isolated Vercel bundle validates article PATCH bodies with inherited DTO rules', async () => {
  const root = resolve(__dirname, '../..');
  await mkdir(join(root, 'work'), { recursive: true });
  const source = await mkdtemp(join(root, 'work/article-validation-'));
  const deployed = await mkdtemp(join(tmpdir(), 'amin-article-function-'));
  try {
    await mkdir(join(source, 'dist/src'), { recursive: true });
    // Use the real compiled DTO and the real production bundler, without starting
    // the app, connecting to a database, or issuing any HTTP requests.
    await writeFile(
      join(source, 'dist/src/bootstrap.js'),
      `require('reflect-metadata');
const { ValidationPipe } = require('@nestjs/common');
const { UpdateArticleDto } = require(${JSON.stringify(join(root, 'dist/src/content/content.dto.js'))});
const pipe = new ValidationPipe({
  whitelist: true, forbidNonWhitelisted: true, transform: true, forbidUnknownValues: true,
});
exports.validateArticle = body => pipe.transform(body, { type: 'body', metatype: UpdateArticleDto });
`,
    );
    execFileSync(process.execPath, [join(root, 'scripts/prepare-vercel.mjs')], {
      cwd: source,
      stdio: 'pipe',
      timeout: 30_000,
    });
    const entry = relative(root, join(source, 'dist-vercel/bootstrap.mjs'));
    const { fileList } = await nodeFileTrace([entry], { base: root });
    // Copy only what Vercel's tracer includes. Access to the checkout's complete
    // node_modules would conceal missing dynamic class-validator imports.
    for (const file of fileList) {
      assert.ok(!file.startsWith('..'), `Traced file escapes the project: ${file}`);
      const origin = join(root, file);
      const destination = join(deployed, file);
      await mkdir(dirname(destination), { recursive: true });
      if ((await lstat(origin)).isSymbolicLink()) {
        await symlink(await readlink(origin), destination);
      } else {
        await cp(origin, destination);
      }
    }
    const result = execFileSync(
      process.execPath,
      [
        '--no-experimental-require-module',
        '--input-type=module',
        '-e',
        `import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const { default: bundle } = await import(pathToFileURL(${JSON.stringify(join(deployed, entry))}));
const content = '<p><strong><em><u>Sony Interactive</u></em></strong> Entertainment</p>';
const body = { title: 'Spider-Man 2 Game Coming to PC in January; Watch the New', content };
const validated = await bundle.validateArticle(body);
assert.equal(validated.title, body.title);
assert.equal(validated.content, content);
assert.deepEqual(Object.keys(validated).sort(), ['content', 'title']);
assert.equal((await bundle.validateArticle({ content })).content, content);
const imageId = '9f9eecaf-330b-4efc-8688-945f5645c2f0';
assert.equal((await bundle.validateArticle({ imageId })).imageId, imageId);
for (const [invalid, field] of [
  [{ title: '' }, 'title'],
  [{ content: null }, 'content'],
  [{ imageId: 9 }, 'imageId'],
  [{ content, unexpected: true }, 'unexpected'],
]) {
  await assert.rejects(bundle.validateArticle(invalid), error => {
    const response = error.getResponse();
    assert.equal(error.getStatus(), 400);
    assert.ok(response.message.some(message => message.includes(field)), JSON.stringify(response));
    assert.ok(!response.message.some(message => message.includes('unknown value')));
    return true;
  });
}
console.log('PASS: valid article patches accepted; invalid fields and unknown properties rejected');`,
      ],
      { cwd: deployed, encoding: 'utf8', timeout: 30_000 },
    );
    assert.match(result, /PASS: valid article patches accepted/);
  } finally {
    await rm(source, { recursive: true, force: true });
    await rm(deployed, { recursive: true, force: true });
  }
});
