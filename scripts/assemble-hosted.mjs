import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const craftWebRoot = path.join(repositoryRoot, 'craft', 'web');
const applications = [
  ['react', 'react/dist'],
  ['vue', 'vue/dist'],
  ['web', 'web/dist'],
  ['next', 'next/out'],
  ['nuxt', 'nuxt/.output/public'],
];

for (const [, relativeSource] of applications) {
  const source = path.join(repositoryRoot, relativeSource);
  const sourceStat = await stat(source).catch(() => null);

  if (!sourceStat?.isDirectory()) {
    throw new Error(`Missing hosted build output: ${relativeSource}`);
  }
}

await mkdir(craftWebRoot, { recursive: true });

for (const [name, relativeSource] of applications) {
  const source = path.join(repositoryRoot, relativeSource);
  const target = path.join(craftWebRoot, name);

  await rm(target, { recursive: true, force: true });
  await cp(source, target, { recursive: true });
  console.log(`Assembled ${relativeSource} -> craft/web/${name}`);
}
