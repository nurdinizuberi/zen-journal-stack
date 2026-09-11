// backend/start.js
// Production startup: waits for the database (Neon free tier sleeps after inactivity),
// applies migrations, then boots the Express server.
import { execSync, spawn } from 'node:child_process';

const MAX_ATTEMPTS = 6;

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  try {
    execSync('npx prisma migrate deploy || npx prisma db push --skip-generate', { stdio: 'inherit' });
    break;
  } catch (err) {
    console.warn(`[start] Database not reachable (attempt ${attempt}/${MAX_ATTEMPTS}). Retrying in 5s...`);
    if (attempt === MAX_ATTEMPTS) {
      console.warn('[start] Could not apply migrations; starting server anyway.');
    }
    execSync('sleep 5');
  }
}

const child = spawn('node', ['index.js'], { stdio: 'inherit' });

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});