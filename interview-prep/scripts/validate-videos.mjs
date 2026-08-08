import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'src/data/concept-videos.ts'), 'utf8');
const ids = [...source.matchAll(/youtubeId:\s*'([^']+)'/g)].map((m) => m[1]);

const failures = [];

for (const id of ids) {
  const res = await fetch(
    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`
  );
  if (!res.ok) {
    failures.push({ id, status: res.status });
  }
}

if (failures.length > 0) {
  console.error('Unavailable YouTube videos detected:');
  for (const failure of failures) {
    console.error(`  - ${failure.id} (HTTP ${failure.status})`);
  }
  process.exit(1);
}

console.log(`All ${ids.length} video lessons are embeddable.`);
