import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import {
  distributionContract,
  primaryArtifactName,
} from './distribution-contract.ts';

const stableSemver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const reverseDomainId = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*){2,}$/;
const windowsAppUserModelId = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9-]*){2,}$/;

export interface PackageMetadata {
  name?: unknown;
  productName?: unknown;
  version?: unknown;
  description?: unknown;
  author?: unknown;
  homepage?: unknown;
}

export interface ArtifactManifestEntry {
  name: string;
  version: string;
  platform: string;
  architecture: string;
}

export function validateVersionTag(version: unknown, tag: unknown): string[] {
  const errors: string[] = [];
  if (typeof version !== 'string' || !stableSemver.test(version)) {
    errors.push('package.json version must be a stable X.Y.Z semantic version');
  }
  if (typeof tag !== 'string' || tag.length === 0) {
    errors.push('release tag is required');
  } else if (typeof version !== 'string' || tag !== `v${version}`) {
    errors.push(`release tag must exactly match v${String(version)}`);
  }
  return errors;
}

export function validatePackageMetadata(metadata: PackageMetadata): string[] {
  const expected = distributionContract.identity;
  const errors: string[] = [];
  for (const [key, value] of Object.entries({
    name: expected.packageName,
    productName: expected.productName,
    author: expected.author,
    description: expected.description,
  })) {
    if (metadata[key as keyof PackageMetadata] !== value) {
      errors.push(`package.json ${key} must equal ${value}`);
    }
  }
  if ('homepage' in metadata) {
    errors.push(
      'package.json homepage must be omitted until a canonical value is approved',
    );
  }
  if (!reverseDomainId.test(expected.identifiers.macosBundleId)) {
    errors.push('macosBundleId must be a reverse-domain-style value');
  }
  if (!windowsAppUserModelId.test(expected.identifiers.windowsAppUserModelId)) {
    errors.push(
      'windowsAppUserModelId must be a reverse-domain-style Squirrel value',
    );
  }
  if (expected.identifiers.linuxPackageName !== expected.packageName) {
    errors.push('Linux package identifier must match the package name');
  }
  return errors;
}

export function expectedArtifactManifest(
  version: string,
): ArtifactManifestEntry[] {
  return distributionContract.primaryArtifacts.map((descriptor) => ({
    name: primaryArtifactName(version, descriptor),
    version,
    platform: descriptor.platform,
    architecture: descriptor.architecture,
  }));
}

export function validateArtifactManifest(
  manifest: readonly ArtifactManifestEntry[],
  version: string,
): string[] {
  const errors: string[] = [];
  const expected = expectedArtifactManifest(version);
  const names = manifest.map(({ name }) => name);
  if (manifest.length !== expected.length) {
    errors.push(
      `artifact manifest must contain exactly ${expected.length} primary artifacts`,
    );
  }
  if (new Set(names).size !== names.length) {
    errors.push('artifact manifest names must be unique');
  }
  for (const artifact of expected) {
    const match = manifest.find(
      (candidate) =>
        candidate.platform === artifact.platform &&
        candidate.architecture === artifact.architecture,
    );
    if (match === undefined) {
      errors.push(
        `missing ${artifact.platform}/${artifact.architecture} primary artifact`,
      );
      continue;
    }
    if (match.version !== version) {
      errors.push(`${match.name} must use version ${version}`);
    }
    if (match.name !== artifact.name) {
      errors.push(
        `${match.platform}/${match.architecture} must be named ${artifact.name}`,
      );
    }
  }
  return errors;
}

function option(args: readonly string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

export async function runReleaseContractCli(
  args: readonly string[],
): Promise<void> {
  const packagePath = option(args, '--package') ?? 'package.json';
  const tag = option(args, '--tag') ?? process.env.GITHUB_REF_NAME;
  const metadata = JSON.parse(
    await readFile(packagePath, 'utf8'),
  ) as PackageMetadata;
  const errors = [
    ...validatePackageMetadata(metadata),
    ...validateVersionTag(metadata.version, tag),
  ];
  if (
    typeof metadata.version === 'string' &&
    stableSemver.test(metadata.version)
  ) {
    errors.push(
      ...validateArtifactManifest(
        expectedArtifactManifest(metadata.version),
        metadata.version,
      ),
    );
  }
  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
  process.stdout.write(`Release contract valid for ${tag}\n`);
}

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  runReleaseContractCli(process.argv.slice(2)).catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
