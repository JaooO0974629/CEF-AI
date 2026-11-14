import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src', 'js');

async function collectModules(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? collectModules(full) : [full];
    }),
  );
  return files.flat().filter((file) => file.endsWith('.js'));
}

const modules = await collectModules(SRC);
let failures = 0;

for (const file of modules) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failures += 1;
    console.error(`Syntax error in ${path.relative(ROOT, file)}`);
    console.error(result.stderr.trim());
  }
}

console.log(`Checked ${modules.length} modules, ${failures} failure(s).`);
process.exit(failures === 0 ? 0 : 1);