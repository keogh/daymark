import { listPackage } from '@electron/asar';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import type { MacosArchitecture } from './distribution-contract.ts';

const requiredAsarEntries = [
  '/.vite/build/main.cjs',
  '/.vite/build/preload.cjs',
  '/.vite/renderer/main_window/index.html',
  '/src/main/database/migrations/0000_peaceful_echo.sql',
  '/src/main/database/migrations/0001_colossal_eddie_brock.sql',
  '/src/main/database/migrations/0002_mute_tarot.sql',
];

const requiredResources = [
  'assets/icon/daymark.icns',
  'assets/tray/daymark.png',
  'assets/tray/daymarkTemplate.png',
  'assets/tray/daymarkTemplate@2x.png',
];

function parseArchitecture(args: string[]): MacosArchitecture {
  const architecture = args[args.indexOf('--arch') + 1];
  if (architecture !== 'arm64' && architecture !== 'x64') {
    throw new Error('--arch must be arm64 or x64');
  }
  return architecture;
}

function assertExists(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`missing packaged content: ${filePath}`);
  }
}

function assertMachOArchitecture(
  filePath: string,
  architecture: MacosArchitecture,
): void {
  const output = execFileSync('file', [filePath], { encoding: 'utf8' });
  const binaryDescription = output.slice(output.indexOf(':') + 1);
  const expectedFileArchitecture =
    architecture === 'x64' ? 'x86_64' : architecture;
  if (!binaryDescription.includes(expectedFileArchitecture)) {
    throw new Error(
      `expected ${filePath} to contain ${architecture}; received: ${output.trim()}`,
    );
  }
}

export function inspectMacosPackage(
  projectRoot: string,
  architecture: MacosArchitecture,
): void {
  const appPath = path.join(
    projectRoot,
    'out',
    `Daymark-darwin-${architecture}`,
    'Daymark.app',
  );
  const contentsPath = path.join(appPath, 'Contents');
  const resourcesPath = path.join(contentsPath, 'Resources');
  const asarPath = path.join(resourcesPath, 'app.asar');
  const executablePath = path.join(contentsPath, 'MacOS', 'Daymark');
  const nativeModulePath = path.join(
    resourcesPath,
    'app.asar.unpacked',
    'node_modules',
    'better-sqlite3',
    'prebuilds',
    `darwin-${architecture}.node`,
  );

  [appPath, asarPath, executablePath, nativeModulePath].forEach(assertExists);
  requiredResources.forEach((resource) =>
    assertExists(path.join(resourcesPath, resource)),
  );

  const asarEntries = new Set(listPackage(asarPath, { isPack: false }));
  for (const entry of requiredAsarEntries) {
    if (!asarEntries.has(entry)) {
      throw new Error(`missing ASAR content: ${entry}`);
    }
  }

  const bundleIdentifier = execFileSync(
    'plutil',
    [
      '-extract',
      'CFBundleIdentifier',
      'raw',
      '-o',
      '-',
      path.join(contentsPath, 'Info.plist'),
    ],
    { encoding: 'utf8' },
  ).trim();
  if (bundleIdentifier !== 'com.isaaczepeda.daymark') {
    throw new Error(`unexpected bundle identifier: ${bundleIdentifier}`);
  }

  assertMachOArchitecture(executablePath, architecture);
  assertMachOArchitecture(nativeModulePath, architecture);
}

const invokedPath = process.argv[1] && path.resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) {
  const architecture = parseArchitecture(process.argv.slice(2));
  inspectMacosPackage(process.cwd(), architecture);
  console.log(`macOS ${architecture} package inspection passed`);
}
