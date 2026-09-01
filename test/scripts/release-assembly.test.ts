import { mkdir, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  assembleReleaseFiles,
  checksumManifestName,
  releaseNotes,
  verifyChecksumManifest,
} from '../../scripts/release-assembly.ts';
import { expectedArtifactManifest } from '../../scripts/release-contract.ts';
import { createWorkflowArtifactManifest } from '../../scripts/workflow-artifacts.ts';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

async function temporaryDirectory(name: string): Promise<string> {
  const directory = path.join(
    tmpdir(),
    `daymark-${name}-${crypto.randomUUID()}`,
  );
  temporaryDirectories.push(directory);
  await mkdir(directory, { recursive: true });
  return directory;
}

async function workflowArtifacts(): Promise<string> {
  const root = await temporaryDirectory('release-input');
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

async function assembledRelease(): Promise<string> {
  const inputRoot = await workflowArtifacts();
  const outputRoot = await temporaryDirectory('release-output');
  await assembleReleaseFiles({
    commit: 'abc123',
    inputRoot,
    outputRoot,
    tag: 'v0.1.0',
  });
  return outputRoot;
}

describe('release assembly', () => {
  it('creates a stable checksum manifest covering every exact final file once', async () => {
    const outputRoot = await assembledRelease();
    const manifest = await readFile(
      path.join(outputRoot, checksumManifestName),
      'utf8',
    );

    expect(manifest.trim().split('\n')).toHaveLength(3);
    for (const artifact of expectedArtifactManifest('0.1.0')) {
      expect(manifest).toContain(`  ${artifact.name}\n`);
    }
    await expect(verifyChecksumManifest(outputRoot)).resolves.toBeUndefined();
  });

  it('rejects changed, missing, duplicate, and extra checksum-scoped files', async () => {
    const changed = await assembledRelease();
    const artifactName = expectedArtifactManifest('0.1.0')[0]!.name;
    await writeFile(path.join(changed, artifactName), 'changed');
    await expect(verifyChecksumManifest(changed)).rejects.toThrow(
      `does not match ${checksumManifestName}`,
    );

    const missing = await assembledRelease();
    await unlink(path.join(missing, artifactName));
    await expect(verifyChecksumManifest(missing)).rejects.toThrow(
      'must cover every final release file exactly once',
    );

    const duplicate = await assembledRelease();
    const duplicateManifestPath = path.join(duplicate, checksumManifestName);
    const duplicateManifest = await readFile(duplicateManifestPath, 'utf8');
    await writeFile(
      duplicateManifestPath,
      `${duplicateManifest}${duplicateManifest.split('\n')[0]}\n`,
    );
    await expect(verifyChecksumManifest(duplicate)).rejects.toThrow(
      'filenames must be unique',
    );

    const extra = await assembledRelease();
    await writeFile(path.join(extra, 'unexpected.txt'), 'unexpected');
    await expect(verifyChecksumManifest(extra)).rejects.toThrow(
      'must cover every final release file exactly once',
    );
  });

  it('rejects an incomplete platform set before producing release files', async () => {
    const inputRoot = await workflowArtifacts();
    const first = expectedArtifactManifest('0.1.0')[0]!;
    await unlink(
      path.join(
        inputRoot,
        `${first.platform}-${first.architecture}`,
        first.name,
      ),
    );
    const outputRoot = await temporaryDirectory('incomplete-output');

    await expect(
      assembleReleaseFiles({
        commit: 'abc123',
        inputRoot,
        outputRoot,
        tag: 'v0.1.0',
      }),
    ).rejects.toThrow('must occur exactly once');
    await expect(
      readFile(path.join(outputRoot, checksumManifestName)),
    ).rejects.toThrow();
  });

  it('renders complete unsigned prerelease and acceptance guidance', () => {
    const notes = releaseNotes({ commit: 'abc123', tag: 'v0.1.0' });
    for (const required of [
      'Tagged commit: `abc123`',
      'Unsigned personal-testing prerelease',
      'Gatekeeper',
      'Windows packaging and distribution are deferred to SPEC-019',
      'Checksums verify transfer integrity; they do not authenticate the publisher',
      'Automatic updates and update checks are unavailable',
      'Uninstall removes installer-owned files but preserves',
      'Downgrades are unsupported',
      'isaaczepeda@users.noreply.github.com',
      'acceptance evidence is **pending**',
    ]) {
      expect(notes).toContain(required);
    }
  });
});
