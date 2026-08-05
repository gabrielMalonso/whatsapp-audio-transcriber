import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version ?? '')) {
  throw new Error('Uso: pnpm version:extension X.Y.Z');
}

const root = process.cwd();
const packagePaths = ['package.json', 'apps/extension/package.json'];
const packages = await Promise.all(
  packagePaths.map(async (relativePath) => ({
    file: path.join(root, relativePath),
    data: JSON.parse(await readFile(path.join(root, relativePath), 'utf8')),
  })),
);
const configPath = path.join(root, 'apps/extension/wxt.config.ts');
const config = await readFile(configPath, 'utf8');
const versionPattern = /version: '[^']+',/;
if (!versionPattern.test(config)) {
  throw new Error('Não foi possível localizar a versão em wxt.config.ts.');
}

for (const packageFile of packages) {
  packageFile.data.version = version;
  await writeFile(
    packageFile.file,
    `${JSON.stringify(packageFile.data, null, 2)}\n`,
  );
}
const nextConfig = config.replace(versionPattern, `version: '${version}',`);
await writeFile(configPath, nextConfig);

console.log(`Versão da extensão atualizada para ${version}.`);
