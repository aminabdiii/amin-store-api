const { createApp } = require('../dist/src/bootstrap');

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

module.exports = async function handler(request, response) {
  const app = await getApplication();
  app.getHttpAdapter().getInstance().server.emit('request', request, response);
};
