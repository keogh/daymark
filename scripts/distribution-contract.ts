import { productIdentity } from '../src/shared/product-identity.ts';

export const distributionContract = {
  identity: {
    packageName: productIdentity.stable.npmPackageName,
    productName: productIdentity.displayName,
    author: 'Isaac Zepeda',
    description: 'A local-first desktop time tracker.',
    identifiers: {
      macosBundleId: productIdentity.stable.macosBundleId,
      windowsAppUserModelId: productIdentity.stable.windowsAppUserModelId,
      linuxPackageName: productIdentity.stable.linuxPackageName,
    },
  },
  linux: {
    maintainerName: 'Isaac Zepeda',
    maintainerEmail: 'isaaczepeda@users.noreply.github.com',
  },
  primaryArtifacts: [
    { platform: 'darwin', architecture: 'arm64', extension: '.dmg' },
    { platform: 'darwin', architecture: 'x64', extension: '.dmg' },
    { platform: 'win32', architecture: 'x64', extension: ' Setup.exe' },
    { platform: 'linux', architecture: 'x64', extension: '.deb' },
  ],
} as const;

export type PrimaryArtifactDescriptor =
  (typeof distributionContract.primaryArtifacts)[number];

export type MacosArchitecture = 'arm64' | 'x64';

export const windowsSquirrelPackageName =
  productIdentity.stable.squirrelPackageName;

export function primaryArtifactName(
  version: string,
  descriptor: PrimaryArtifactDescriptor,
): string {
  const product = distributionContract.identity.productName.replaceAll(
    ' ',
    '-',
  );
  return `${product}-${version}-${descriptor.platform}-${descriptor.architecture}${descriptor.extension}`;
}

export function macosDmgBaseName(
  version: string,
  architecture: string,
): string {
  if (architecture !== 'arm64' && architecture !== 'x64') {
    throw new Error(`unsupported macOS DMG architecture: ${architecture}`);
  }

  const artifactName = primaryArtifactName(version, {
    platform: 'darwin',
    architecture,
    extension: '.dmg',
  });
  return artifactName.slice(0, -'.dmg'.length);
}
