import fs from 'node:fs';

import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import type { ForgeConfig } from '@electron-forge/shared-types';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { distributionContract } from './scripts/distribution-contract.ts';
import { macosDmgBaseName } from './scripts/distribution-contract.ts';
import { primaryArtifactName } from './scripts/distribution-contract.ts';
import { windowsSquirrelPackageName } from './scripts/distribution-contract.ts';
import { normalizeLinuxDebArtifacts } from './scripts/linux-deb-artifact.ts';

const packageMetadata = JSON.parse(
  fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string };

const packageDirectories = ['/.vite', '/node_modules'];
const migrationsDirectory = '/src/main/database/migrations';
const migrationsParentDirectories = ['/src', '/src/main', '/src/main/database'];
const trayAssetsDirectory = '/assets/tray';
const trayAssetParentDirectories = ['/assets'];

const config: ForgeConfig = {
  packagerConfig: {
    appBundleId: distributionContract.identity.identifiers.macosBundleId,
    asar: true,
    icon: 'assets/icon/time-tracker',
    extraResource: ['assets'],
    ignore: (filePath) => {
      if (filePath.length === 0) {
        return false;
      }

      const isPackageDirectory = packageDirectories.some(
        (directory) =>
          filePath === directory || filePath.startsWith(`${directory}/`),
      );
      const isMigrationInput =
        migrationsParentDirectories.includes(filePath) ||
        filePath === migrationsDirectory ||
        filePath.startsWith(`${migrationsDirectory}/`);
      const isTrayAsset =
        trayAssetParentDirectories.includes(filePath) ||
        filePath === trayAssetsDirectory ||
        filePath.startsWith(`${trayAssetsDirectory}/`);

      return !isPackageDirectory && !isMigrationInput && !isTrayAsset;
    },
  },
  rebuildConfig: {},
  hooks: {
    postMake: async (_forgeConfig, makeResults) =>
      normalizeLinuxDebArtifacts(makeResults),
  },
  makers: [
    new MakerDMG(
      (architecture) => ({
        format: 'ULFO',
        icon: 'assets/icon/time-tracker.icns',
        name: macosDmgBaseName(packageMetadata.version, architecture),
        title: distributionContract.identity.productName,
      }),
      ['darwin'],
    ),
    new MakerSquirrel(
      (architecture) => {
        if (architecture !== 'x64') {
          throw new Error(
            `unsupported Windows Squirrel architecture: ${architecture}`,
          );
        }

        return {
          authors: distributionContract.identity.author,
          description: distributionContract.identity.description,
          exe: `${distributionContract.identity.productName}.exe`,
          name: windowsSquirrelPackageName,
          noMsi: true,
          setupExe: primaryArtifactName(packageMetadata.version, {
            platform: 'win32',
            architecture,
            extension: ' Setup.exe',
          }),
          setupIcon: 'assets/icon/time-tracker.ico',
          title: distributionContract.identity.productName,
        };
      },
      ['win32'],
    ),
    new MakerDeb(
      (architecture) => {
        if (architecture !== 'x64') {
          throw new Error(
            `unsupported Linux Debian architecture: ${architecture}`,
          );
        }

        return {
          options: {
            bin: distributionContract.identity.productName,
            categories: ['Utility'],
            description: distributionContract.identity.description,
            icon: 'assets/icon/time-tracker.png',
            maintainer: `${distributionContract.linux.maintainerName} <${distributionContract.linux.maintainerEmail}>`,
            name: distributionContract.identity.identifiers.linuxPackageName,
            productName: distributionContract.identity.productName,
          },
        };
      },
      ['linux'],
    ),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        {
          entry: 'src/main/index.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload/index.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
  ],
};

export default config;
