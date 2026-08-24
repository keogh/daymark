import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import { expectedArtifactManifest } from '../../scripts/release-contract.ts';
import {
  createWorkflowArtifactManifest,
  validateDownloadedWorkflowArtifacts,
} from '../../scripts/workflow-artifacts.ts';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  const { rm } = await import('node:fs/promises');
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

async function temporaryDirectory(): Promise<string> {
  const directory = path.join(
    tmpdir(),
    `daymark-workflow-artifacts-${crypto.randomUUID()}`,
  );
  temporaryDirectories.push(directory);
  await mkdir(directory, { recursive: true });
  return directory;
}

async function completeArtifactSet(): Promise<string> {
  const root = await temporaryDirectory();
  for (const artifact of expectedArtifactManifest('0.1.0')) {
    const directory = path.join(
      root,
      `${artifact.platform}-${artifact.architecture}`,
    );
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, artifact.name), artifact.name);
    await createWorkflowArtifactManifest({
      architecture: artifact.architecture,
      commit: 'abc123',
      output: path.join(directory, 'artifact-manifest.json'),
      platform: artifact.platform,
      searchRoot: directory,
      tag: 'v0.1.0',
    });
  }
  return root;
}

describe('workflow artifact manifests', () => {
  it('records and validates the four exact artifacts from one tag commit', async () => {
    const root = await completeArtifactSet();

    await expect(
      validateDownloadedWorkflowArtifacts({
        commit: 'abc123',
        root,
        tag: 'v0.1.0',
      }),
    ).resolves.toBeUndefined();
  });

  it('rejects changed bytes and mixed commit provenance', async () => {
    const root = await completeArtifactSet();
    const first = expectedArtifactManifest('0.1.0')[0]!;
    const directory = path.join(
      root,
      `${first.platform}-${first.architecture}`,
    );
    await writeFile(path.join(directory, first.name), 'changed');
    await expect(
      validateDownloadedWorkflowArtifacts({
        commit: 'abc123',
        root,
        tag: 'v0.1.0',
      }),
    ).rejects.toThrow('does not match its build manifest');

    const manifestPath = path.join(directory, 'artifact-manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Record<
      string,
      unknown
    >;
    await writeFile(
      manifestPath,
      JSON.stringify({ ...manifest, commit: 'different' }),
    );
    await expect(
      validateDownloadedWorkflowArtifacts({
        commit: 'abc123',
        root,
        tag: 'v0.1.0',
      }),
    ).rejects.toThrow('does not use the validated tag commit');
  });

  it('rejects missing and unsupported artifact targets', async () => {
    const root = await temporaryDirectory();
    await expect(
      createWorkflowArtifactManifest({
        architecture: 'arm64',
        commit: 'abc123',
        output: path.join(root, 'artifact-manifest.json'),
        platform: 'linux',
        searchRoot: root,
        tag: 'v0.1.0',
      }),
    ).rejects.toThrow('unsupported artifact target');
    await expect(
      validateDownloadedWorkflowArtifacts({
        commit: 'abc123',
        root,
        tag: 'v0.1.0',
      }),
    ).rejects.toThrow('expected four artifact manifests');
  });
});
