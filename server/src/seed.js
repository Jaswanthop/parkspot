import { connectDB, disconnectDB } from './config/db.js';
import { seedDatabase } from './utils/seed.js';

try {
  await connectDB();
  const result = await seedDatabase();
  console.info('[seed] Complete:', result);
} catch (error) {
  console.error('[seed] Failed:', error);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
