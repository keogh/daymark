import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import packageMetadata from '../package.json' with { type: 'json' };
import type { PrimaryArtifactDescriptor } from './distribution-contract.ts';
import { primaryArtifactName } from './distribution-contract.ts';
import {
  validateArtifactManifest,
  type ArtifactManifestEntry,
} from './release-contract.ts';

interface WorkflowArtifactManifest extends ArtifactManifestEntry {
  commit: string;
  sha256: string;
  tag: string;
}

function option(args: readonly string[], name: string): string {
  const index = args.indexOf(name);
  const value = index === -1 ? undefined : args[index + 1];
  if (value === undefined || value.length === 0) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function filesRecursively(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      return entry.isDirectory() ? filesRecursively(entryPath) : [entryPath];
    }),
  );
  return nested.flat();
}

async function sha256(filePath: string): Promise<string> {
  return createHash('sha256')
    .update(await readFile(filePath))
    .digest('hex');
}

function descriptor(
  platform: string,
  architecture: string,
): PrimaryArtifactDescriptor {
  const extension =
    platform === 'darwin' ? '.dmg' : platform === 'linux' ? '.deb' : undefined;
  if (
    extension === undefined ||
    !(
      (platform === 'darwin' &&
        (architecture === 'arm64' || architecture === 'x64')) ||
      (platform === 'linux' && architecture === 'x64')
    )
  ) {
    throw new Error(`unsupported artifact target: ${platform}/${architecture}`);
  }
  return { platform, architecture, extension } as PrimaryArtifactDescriptor;
}

export async function createWorkflowArtifactManifest(options: {
  architecture: string;
  commit: string;
  output: string;
  platform: string;
  searchRoot: string;
  tag: string;
}): Promise<WorkflowArtifactManifest> {
  const target = descriptor(options.platform, options.architecture);
  const expectedName = primaryArtifactName(packageMetadata.version, target);
  const matches = (await filesRecursively(options.searchRoot)).filter(
    (filePath) => path.basename(filePath) === expectedName,
  );
  if (matches.length !== 1) {
    throw new Error(
      `expected exactly one ${expectedName} under ${options.searchRoot}; received ${matches.length}`,
    );
  }
  const artifactPath = matches[0];
  if (artifactPath === undefined) {
    throw new Error(`missing ${expectedName}`);
  }
  const manifest: WorkflowArtifactManifest = {
    architecture: target.architecture,
    commit: options.commit,
    name: expectedName,
    platform: target.platform,
    sha256: await sha256(artifactPath),
    tag: options.tag,
    version: packageMetadata.version,
  };
  await writeFile(options.output, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export async function validateDownloadedWorkflowArtifacts(options: {
  commit: string;
  root: string;
  tag: string;
}): Promise<void> {
  const files = await filesRecursively(options.root);
  const manifestPaths = files.filter(
    (filePath) => path.basename(filePath) === 'artifact-manifest.json',
  );
  if (manifestPaths.length !== 3) {
    throw new Error(
      `expected three artifact manifests; received ${manifestPaths.length}`,
    );
  }
  const manifests = await Promise.all(
    manifestPaths.map(async (manifestPath) => ({
      directory: path.dirname(manifestPath),
      manifest: JSON.parse(
        await readFile(manifestPath, 'utf8'),
      ) as WorkflowArtifactManifest,
    })),
  );
  const contractErrors = validateArtifactManifest(
    manifests.map(({ manifest }) => manifest),
    packageMetadata.version,
  );
  if (contractErrors.length > 0) {
    throw new Error(contractErrors.join('\n'));
  }
  for (const { directory, manifest } of manifests) {
    if (manifest.tag !== options.tag || manifest.commit !== options.commit) {
      throw new Error(`${manifest.name} does not use the validated tag commit`);
    }
    const artifactMatches = (await filesRecursively(directory)).filter(
      (filePath) => path.basename(filePath) === manifest.name,
    );
    if (artifactMatches.length !== 1) {
      throw new Error(
        `${manifest.name} must occur exactly once in its workflow artifact`,
      );
    }
    const artifactPath = artifactMatches[0];
    if (artifactPath === undefined) {
      throw new Error(`missing ${manifest.name}`);
    }
    const actualHash = await sha256(artifactPath);
    if (actualHash !== manifest.sha256) {
      throw new Error(`${manifest.name} does not match its build manifest`);
    }
  }
}

export async function runWorkflowArtifactsCli(
  args: readonly string[],
): Promise<void> {
  const command = args[0];
  if (command === 'create') {
    const manifest = await createWorkflowArtifactManifest({
      architecture: option(args, '--architecture'),
      commit: option(args, '--commit'),
      output: option(args, '--output'),
      platform: option(args, '--platform'),
      searchRoot: option(args, '--search-root'),
      tag: option(args, '--tag'),
    });
    process.stdout.write(`Validated ${manifest.name}\n`);
    return;
  }
  if (command === 'validate') {
    await validateDownloadedWorkflowArtifacts({
      commit: option(args, '--commit'),
      root: option(args, '--root'),
      tag: option(args, '--tag'),
    });
    process.stdout.write('All workflow artifacts are valid\n');
    return;
  }
  throw new Error('command must be create or validate');
}

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  runWorkflowArtifactsCli(process.argv.slice(2)).catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
