import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = [];
let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 300).unref();
}

function run(label, args) {
  const child = spawn(npm, args, {
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });

  child.on('error', (error) => {
    console.error(`[dev] Could not start ${label}: ${error.message}`);
    shutdown(1);
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.log(`[dev] ${label} stopped (${signal ?? code}). Stopping the other process...`);
    shutdown(code ?? 0);
  });

  children.push(child);
}

console.log('[dev] Starting API on http://localhost:5000 and web app on http://localhost:5173');
run('api', ['--prefix', 'server', 'run', 'dev']);
run('web', ['--prefix', 'client', 'run', 'dev']);

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
