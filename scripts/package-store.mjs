import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const rootPackage = JSON.parse(
  await readFile(path.join(root, 'package.json'), 'utf8'),
);
const extensionPackage = JSON.parse(
  await readFile(path.join(root, 'apps/extension/package.json'), 'utf8'),
);
const manifest = JSON.parse(
  await readFile(
    path.join(root, 'apps/extension/.output/chrome-mv3/manifest.json'),
    'utf8',
  ),
);

if (
  rootPackage.version !== extensionPackage.version ||
  extensionPackage.version !== manifest.version
) {
  throw new Error(
    `Versões divergentes: raiz ${rootPackage.version}, extensão ${extensionPackage.version}, manifest ${manifest.version}.`,
  );
}

const source = path.join(
  root,
  'apps/extension/.output',
  `watextension-${manifest.version}-chrome.zip`,
);
const releaseDir = path.join(root, 'release');
const destination = path.join(
  releaseDir,
  `WhatsApp-Transcritor-v${manifest.version}.zip`,
);

await mkdir(releaseDir, { recursive: true });
await copyFile(source, destination);

const archive = await readFile(destination);
const sha256 = createHash('sha256').update(archive).digest('hex');

console.log(path.relative(root, destination));
console.log(`SHA-256 ${sha256}`);
