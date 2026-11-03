import { cp, mkdir, readFile, rm, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const data = JSON.parse(await readFile(resolve(root, 'public/data/listings.json'), 'utf8'));
const ids = new Set();
for (const house of data.房源) {
  if (!house.编号 || ids.has(house.编号)) throw new Error(`Missing or duplicate listing ID: ${house.编号}`);
  ids.add(house.编号);
  const detail = /^https:\/\/hz\.zu\.ke\.com\/zufang\/HZ\d+\.html$/.test(house.来源链接 || '');
  const search = house.来源链接 === `https://hz.zu.ke.com/zufang/rs${encodeURIComponent(house.小区名称)}/`;
  if (!(house.来源链接类型 === '房源详情' && detail || house.来源链接类型 === '小区搜索' && search)) throw new Error(`Missing or invalid frontend source link: ${house.编号}`);
  if (!house.image.startsWith('/images/')) throw new Error(`Invalid asset: ${house.编号}`);
  await access(resolve(root, 'public', house.image.slice(1)));
}
const dist = resolve(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(resolve(root, 'public'), dist, { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js', 'commute-sort.js']) {
  await cp(resolve(root, 'src', file), resolve(dist, file));
}
console.log(`Built ${ids.size} listings across ${new Set(data.房源.map(h => h.小区名称)).size} communities.`);
