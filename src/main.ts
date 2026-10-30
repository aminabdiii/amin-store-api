import { createApp } from './bootstrap';
import { configuration } from './common/config';
async function main() {
  const app = await createApp();
  await app.listen(configuration().port, '0.0.0.0');
  console.info(`Amin Store API: http://localhost:${configuration().port}/docs`);
}
void main().catch((error: unknown) => {
  console.error(
    'Startup failed:',
    error instanceof Error ? error.message : 'Unknown startup failure',
  );
  process.exitCode = 1;
});
