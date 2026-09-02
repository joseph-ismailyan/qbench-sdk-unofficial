import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const coverage = process.argv.includes('--coverage');
const testFiles = readdirSync(resolve('test'))
  .filter((file) => file.endsWith('.test.js'))
  .sort()
  .map((file) => resolve('test', file));

const args = ['--test'];
if (coverage) {
  args.push(
    '--experimental-test-coverage',
    '--test-coverage-include=src/**/*.js',
    '--test-coverage-lines=95',
    '--test-coverage-branches=95',
    '--test-coverage-functions=95',
  );
}
args.push(...testFiles);

const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
process.exit(result.status ?? 1);
