// Swagger resolves this package dynamically; expose it to Vercel's file tracer.
import 'swagger-ui-dist/absolute-path.js';
import bootstrap from '../dist-vercel/bootstrap.mjs';
const { createApp } = bootstrap;

let application;
function getApplication() {
  if (!application) {
    application = (async () => {
      const app = await createApp();
      await app.init();
      await app.getHttpAdapter().getInstance().ready();
      return app;
    })().catch((error) => {
      application = undefined;
      throw error;
    });
  }
  return application;
}

export default async function handler(request, response) {
  const app = await getApplication();
  app.getHttpAdapter().getInstance().server.emit('request', request, response);
}
