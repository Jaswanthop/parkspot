import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/env.js';
import { seedDatabase } from './utils/seed.js';

async function main() {
  await connectDB();
  console.info('[parkspot] MongoDB connected');
  await seedDatabase();

  const app = createApp();
  const server = app.listen(env.port, '0.0.0.0', () => {
    console.info(`[parkspot] API listening on port ${env.port} (${env.nodeEnv})`);
  });

  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.info(`[parkspot] ${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    console.error('[parkspot] Unhandled rejection:', reason);
  });
}

main().catch((error) => {
  console.error('[parkspot] Failed to start:', error);
  process.exit(1);
});
