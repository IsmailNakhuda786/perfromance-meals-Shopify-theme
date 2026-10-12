// Preserve the exact approved image URLs while making the theme self-contained.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root = new URL('../theme/', import.meta.url).pathname;
for (const file of fs.readdirSync(path.join(root, 'sections')).filter(file => file.endsWith('.liquid'))) {
  const location = path.join(root, 'sections', file);
  let source = fs.readFileSync(location, 'utf8');
  for (const match of source.matchAll(/src="(https:\/\/images\.unsplash\.com\/[^" ]+)"/g)) {
    const url = match[1].replaceAll('&amp;', '&');
    const name = `approved-${crypto.createHash('sha256').update(url).digest('hex').slice(0, 12)}.jpg`;
    const target = path.join(root, 'assets', name);
    if (!fs.existsSync(target)) {
      const response = await fetch(url);
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Image unavailable: ${url}`);
      fs.writeFileSync(target, Buffer.from(await response.arrayBuffer()));
    }
    source = source.replaceAll(match[1], `{{ '${name}' | asset_url }}`);
  }
  fs.writeFileSync(location, source);
}
