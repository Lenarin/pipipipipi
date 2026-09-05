import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

// Generates a diagnostic review artifact for this non-Git workspace.
// Source files are read only. Pass a baseline snapshot and a unique output path.
const baseline = resolve(process.argv[2]);
const destination = resolve(process.argv[3]);
const root = process.cwd();
const selected = ['src', 'tests', 'index.html', 'README.md', 'DESIGN.md', 'package.json', 'package-lock.json'];
function files(path) {
  if (!existsSync(path)) return [];
  const stat = readdirSafe(path);
  return stat === null ? [path] : stat.flatMap(entry => files(join(path, entry.name)));
}
function readdirSafe(path) {
  try { return readdirSync(path, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOTDIR') return null; throw error; }
}
const candidates = new Set(selected.flatMap(path => [
  ...files(join(root, path)).map(file => relative(root, file)),
  ...files(join(baseline, path)).map(file => relative(baseline, file)),
]));
const chunks = [`# Review package\nBaseline: ${baseline}\nCurrent: ${root}\n`];
for (const file of [...candidates].sort()) {
  const before = join(baseline, file);
  const after = join(root, file);
  if (existsSync(before) && existsSync(after)) {
    if (readFileSync(before).equals(readFileSync(after))) continue;
    const result = spawnSync('git', ['diff', '--no-index', '--no-color', '-U10', before, after], { encoding: 'utf8' });
    if (result.status > 1 || result.error) throw result.error ?? new Error(result.stderr);
    chunks.push(result.stdout);
  } else {
    const contents = readFileSync(existsSync(after) ? after : before, 'utf8');
    chunks.push(`\n${existsSync(after) ? 'ADDED' : 'REMOVED'} ${file}\n${contents}`);
  }
}
writeFileSync(destination, chunks.join('\n'));
console.log(`Review artifact: ${destination}; changed sections: ${chunks.length - 1}`);
