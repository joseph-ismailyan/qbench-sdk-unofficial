import { readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const roots = [
  'index.js',
  'src',
  'test',
  'scripts',
  'examples/cloudflare-worker-smoke/src',
];

const files = roots.flatMap((root) => collectJavaScriptFiles(resolve(root))).sort();

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`Syntax checked ${files.length} JavaScript files.`);

function collectJavaScriptFiles(path) {
  let stats;
  try {
    stats = statSync(path);
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }

  if (stats.isFile()) return /\.(?:js|mjs)$/.test(path) ? [path] : [];
  if (!stats.isDirectory()) return [];

  return readdirSync(path).flatMap((entry) => collectJavaScriptFiles(resolve(path, entry)));
}
