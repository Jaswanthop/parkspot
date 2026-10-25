import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

export const env = {
  nodeEnv,
  isProd,
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/parkspot',
  jwtSecret: process.env.JWT_SECRET || (isProd ? '' : 'dev-only-insecure-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  adminEmail: (process.env.ADMIN_EMAIL || 'admin@parkspot.dev').toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin@12345',
  adminName: process.env.ADMIN_NAME || 'ParkSpot Admin',
  seedDemo: process.env.SEED_DEMO ? process.env.SEED_DEMO === 'true' : !isProd,
  demoEmail: 'demo@parkspot.dev',
  demoPassword: 'Demo@12345',
  demoName: 'Demo Driver',
};

if (isProd && !env.jwtSecret) {
  throw new Error('JWT_SECRET must be set when NODE_ENV=production');
}

if (isProd && env.adminPassword === 'Admin@12345') {
  // Keep the deploy secure-by-default: Render generates a password in render.yaml.
  console.warn('[parkspot] WARNING: using the default admin password in production.');
}
