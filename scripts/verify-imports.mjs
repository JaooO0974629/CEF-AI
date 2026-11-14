import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src', 'js');

let files = 0;
let missing = 0;

async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full);
    } else if (entry.name.endsWith('.js')) {
      files += 1;
      const code = await fs.readFile(full, 'utf8');
      for (const match of code.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) {
        const target = path.resolve(path.dirname(full), match[1]);
        try {
          await fs.access(target);
        } catch {
          missing += 1;
          console.log('MISSING', path.relative(ROOT, full), '->', match[1]);
        }
      }
    }
  }
}

await walk(SRC);
console.log(`Checked imports in ${files} files; missing: ${missing}`);
process.exit(missing === 0 ? 0 : 1);