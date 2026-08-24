import { listPackage } from '@electron/asar';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import packageMetadata from '../package.json' with { type: 'json' };
import { primaryArtifactName } from './distribution-contract.ts';

async function assertPe(
  filePath: string,
  label: string,
  expectedMachine?: number,
): Promise<void> {
  const bytes = await readFile(filePath);
  const peOffset = bytes.readUInt32LE(0x3c);
  if (
    bytes.subarray(0, 2).toString('ascii') !== 'MZ' ||
    bytes.subarray(peOffset, peOffset + 4).toString('binary') !== 'PE\0\0'
  ) {
    throw new Error(`${label} is not a PE binary`);
  }
  if (
    expectedMachine !== undefined &&
    bytes.readUInt16LE(peOffset + 4) !== expectedMachine
  ) {
    throw new Error(`${label} does not target x64`);
  }
}

const projectRoot = process.cwd();
const packageRoot = path.join(projectRoot, 'out', 'Daymark-win32-x64');
const resourcesRoot = path.join(packageRoot, 'resources');
const asarPath = path.join(resourcesRoot, 'app.asar');
const setupName = primaryArtifactName(packageMetadata.version, {
  platform: 'win32',
  architecture: 'x64',
  extension: ' Setup.exe',
});
const setupPath = path.join(
  projectRoot,
  'out',
  'make',
  'squirrel.windows',
  'x64',
  setupName,
);

await assertPe(path.join(packageRoot, 'Daymark.exe'), 'application', 0x8664);
await assertPe(setupPath, 'Squirrel Setup executable');
await assertPe(
  path.join(
    resourcesRoot,
    'app.asar.unpacked',
    'node_modules',
    'better-sqlite3',
    'prebuilds',
    'win32-x64.node',
  ),
  'better-sqlite3 native module',
  0x8664,
);

const asarEntries = new Set(listPackage(asarPath, { isPack: false }));
for (const entry of [
  '/.vite/build/main.cjs',
  '/.vite/build/preload.cjs',
  '/.vite/renderer/main_window/index.html',
  '/src/main/database/migrations/0000_peaceful_echo.sql',
  '/src/main/database/migrations/0001_colossal_eddie_brock.sql',
  '/src/main/database/migrations/0002_mute_tarot.sql',
]) {
  if (!asarEntries.has(entry)) {
    throw new Error(`packaged ASAR is missing ${entry}`);
  }
}
for (const asset of [
  'icon/daymark.ico',
  'tray/daymark.png',
  'tray/daymarkTemplate.png',
  'tray/daymarkTemplate@2x.png',
]) {
  await readFile(path.join(resourcesRoot, 'assets', asset));
}

console.log(`Windows x64 package inspection passed: ${setupPath}`);
