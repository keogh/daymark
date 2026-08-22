import type { ForgeConfig } from '@electron-forge/shared-types';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { distributionContract } from './scripts/distribution-contract.ts';

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
  makers: [],
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
