import { cp, mkdir, readFile, rm, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const data = JSON.parse(await readFile(resolve(root, 'public/data/listings.json'), 'utf8'));
const ids = new Set();
for (const house of data.房源) {
  if (!house.编号 || ids.has(house.编号)) throw new Error(`Missing or duplicate listing ID: ${house.编号}`);
  ids.add(house.编号);
  if (!house.image.startsWith('/images/')) throw new Error(`Invalid asset: ${house.编号}`);
  await access(resolve(root, 'public', house.image.slice(1)));
}
const dist = resolve(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(resolve(root, 'public'), dist, { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js']) {
  await cp(resolve(root, 'src', file), resolve(dist, file));
}
console.log(`Built ${ids.size} listings across ${new Set(data.房源.map(h => h.小区名称)).size} communities.`);
