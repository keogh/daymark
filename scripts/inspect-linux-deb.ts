import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { listPackage } from '@electron/asar';

import packageMetadata from '../package.json' with { type: 'json' };
import { primaryArtifactName } from './distribution-contract.ts';

const execute = promisify(execFile);
const expectedName = primaryArtifactName(packageMetadata.version, {
  platform: 'linux',
  architecture: 'x64',
  extension: '.deb',
});
const packagePath = path.resolve(
  process.argv[2] ?? `out/make/deb/x64/${expectedName}`,
);

function requireMatch(value: string, pattern: RegExp, label: string): void {
  if (!pattern.test(value)) {
    throw new Error(`invalid or missing ${label}`);
  }
}

async function assertX64Elf(filePath: string, label: string): Promise<void> {
  const bytes = await readFile(filePath);
  if (
    bytes[0] !== 0x7f ||
    bytes.subarray(1, 4).toString('ascii') !== 'ELF' ||
    bytes[18] !== 0x3e ||
    bytes[19] !== 0x00
  ) {
    throw new Error(`${label} is not an x64 ELF binary`);
  }
}

const extractionDirectory = await mkdtemp(
  path.join(tmpdir(), 'time-tracker-linux-deb-'),
);

try {
  if (path.basename(packagePath) !== expectedName) {
    throw new Error(`Debian artifact must be named ${expectedName}`);
  }

  const { stdout: control } = await execute('dpkg-deb', [
    '--field',
    packagePath,
  ]);
  requireMatch(control, /^Package: time-tracker$/m, 'package identity');
  requireMatch(
    control,
    new RegExp(
      `^Version: ${packageMetadata.version.replaceAll('.', '\\.')}$`,
      'm',
    ),
    'package version',
  );
  requireMatch(control, /^Architecture: amd64$/m, 'package architecture');
  requireMatch(
    control,
    /^Maintainer: Isaac Zepeda <isaaczepeda@users\.noreply\.github\.com>$/m,
    'maintainer',
  );
  requireMatch(
    control,
    /^Description: A local-first desktop time tracker\.$/m,
    'description',
  );
  requireMatch(control, /^Depends: .+$/m, 'generated dependencies');
  if (/^Homepage:/m.test(control)) {
    throw new Error('Debian package must omit homepage metadata');
  }

  await execute('dpkg-deb', ['--extract', packagePath, extractionDirectory]);
  const appRoot = path.join(extractionDirectory, 'usr/lib/time-tracker');
  const desktopEntry = await readFile(
    path.join(
      extractionDirectory,
      'usr/share/applications/time-tracker.desktop',
    ),
    'utf8',
  );
  requireMatch(desktopEntry, /^Name=Time Tracker$/m, 'desktop entry name');
  requireMatch(
    desktopEntry,
    /^Exec=time-tracker %U$/m,
    'desktop entry command',
  );
  requireMatch(desktopEntry, /^Icon=time-tracker$/m, 'desktop entry icon');
  requireMatch(desktopEntry, /^Categories=Utility;$/m, 'desktop category');

  const icon = await readFile(
    path.join(extractionDirectory, 'usr/share/pixmaps/time-tracker.png'),
  );
  if (
    !icon
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    throw new Error('installed launcher icon is not a PNG');
  }

  await assertX64Elf(
    path.join(appRoot, 'Time Tracker'),
    'application executable',
  );
  await assertX64Elf(
    path.join(
      appRoot,
      'resources/app.asar.unpacked/node_modules/better-sqlite3/prebuilds/linux-x64.node',
    ),
    'better-sqlite3 native module',
  );

  const asarEntries = new Set(
    listPackage(path.join(appRoot, 'resources/app.asar'), { isPack: false }),
  );
  for (const requiredEntry of [
    '/.vite/renderer/main_window/index.html',
    '/src/main/database/migrations/0000_peaceful_echo.sql',
    '/src/main/database/migrations/0001_colossal_eddie_brock.sql',
    '/src/main/database/migrations/0002_mute_tarot.sql',
  ]) {
    if (!asarEntries.has(requiredEntry)) {
      throw new Error(`packaged ASAR is missing ${requiredEntry}`);
    }
  }

  for (const asset of [
    'time-tracker.png',
    'time-trackerTemplate.png',
    'time-trackerTemplate@2x.png',
  ]) {
    await readFile(path.join(appRoot, 'resources/assets/tray', asset));
  }

  console.log(`Linux x64 Debian inspection passed: ${packagePath}`);
} finally {
  await rm(extractionDirectory, { force: true, recursive: true });
}
