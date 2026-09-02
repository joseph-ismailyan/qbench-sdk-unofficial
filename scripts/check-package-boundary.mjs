import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const pack = spawnSync(
  'npm',
  ['pack', '--dry-run', '--json', '--ignore-scripts'],
  {
    encoding: 'utf8',
    env: {
      ...process.env,
      npm_config_cache: join(tmpdir(), 'qbench-sdk-package-boundary-npm-cache'),
    },
  },
);

if (pack.status !== 0) {
  process.stderr.write(pack.stderr);
  process.exit(pack.status ?? 1);
}

const result = JSON.parse(pack.stdout)[0];
const files = result?.files?.map(({ path }) => path) ?? [];
if (files.length === 0) throw new Error('npm pack returned no publishable files.');

const forbiddenPaths = [
  /(?:^|\/)\.env(?:\.|$)/i,
  /(?:^|\/)\.wrangler(?:\/|$)/i,
  /(?:^|\/)coverage(?:\/|$)/i,
  /(?:^|\/)node_modules(?:\/|$)/i,
];

const tenantMarkers = [
  new RegExp(['sequence', '46'].join('[-_\\s]?'), 'i'),
  new RegExp(['procedure', 'accessioning'].join('[-_\\s]+'), 'i'),
];

const violations = [];
for (const file of files) {
  if (forbiddenPaths.some((pattern) => pattern.test(file))) {
    violations.push(`${file}: forbidden publish path`);
    continue;
  }

  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  if (tenantMarkers.some((pattern) => pattern.test(content))) {
    violations.push(`${file}: tenant-specific content`);
  }
}

if (violations.length > 0) {
  throw new Error(`Package boundary check failed:\n${violations.join('\n')}`);
}

console.log(`Package boundary checked ${files.length} publishable files.`);
