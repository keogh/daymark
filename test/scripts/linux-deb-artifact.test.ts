import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';

import type { ForgeMakeResult } from '@electron-forge/shared-types';
import { afterEach, describe, expect, it } from 'vitest';

import { normalizeLinuxDebArtifacts } from '../../scripts/linux-deb-artifact.ts';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  const { rm } = await import('node:fs/promises');
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

async function makeResult(
  arch: ForgeMakeResult['arch'] = 'x64',
): Promise<ForgeMakeResult> {
  const directory = path.join(
    tmpdir(),
    `time-tracker-linux-deb-${crypto.randomUUID()}`,
  );
  temporaryDirectories.push(directory);
  await mkdir(directory, { recursive: true });
  const artifact = path.join(directory, 'time-tracker_0.1.0_amd64.deb');
  await writeFile(artifact, 'deb');
  return {
    arch,
    artifacts: [artifact],
    packageJSON: { version: '0.1.0' },
    platform: 'linux',
  };
}

describe('Linux Debian artifact normalization', () => {
  it('renames the maker output to the distribution artifact contract', async () => {
    const result = await makeResult();

    await normalizeLinuxDebArtifacts([result]);

    expect(path.basename(result.artifacts[0] ?? '')).toBe(
      'Time-Tracker-0.1.0-linux-x64.deb',
    );
  });

  it('rejects unsupported Linux architectures', async () => {
    const result = await makeResult('arm64');

    await expect(normalizeLinuxDebArtifacts([result])).rejects.toThrow(
      'unsupported Linux Debian architecture',
    );
  });
});
