export const distributionContract = {
  identity: {
    packageName: 'time-tracker',
    productName: 'Time Tracker',
    author: 'Isaac Zepeda',
    description: 'A local-first desktop time tracker.',
    identifiers: {
      macosBundleId: 'com.isaaczepeda.timetracker',
      windowsAppUserModelId: 'com.isaaczepeda.timetracker',
      linuxPackageName: 'time-tracker',
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
