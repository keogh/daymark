import path from 'node:path';
import { rename } from 'node:fs/promises';

import type { ForgeMakeResult } from '@electron-forge/shared-types';

import { primaryArtifactName } from './distribution-contract.ts';

export async function normalizeLinuxDebArtifacts(
  makeResults: ForgeMakeResult[],
): Promise<ForgeMakeResult[]> {
  for (const result of makeResults) {
    if (result.platform !== 'linux') {
      continue;
    }
    if (result.arch !== 'x64') {
      throw new Error(`unsupported Linux Debian architecture: ${result.arch}`);
    }

    const debArtifacts = result.artifacts.filter((artifact) =>
      artifact.endsWith('.deb'),
    );
    if (debArtifacts.length !== 1) {
      throw new Error(
        `expected exactly one Linux Debian artifact, received ${debArtifacts.length}`,
      );
    }

    const source = debArtifacts[0];
    if (source === undefined) {
      throw new Error('missing Linux Debian artifact');
    }
    const version: unknown = (result.packageJSON as Record<string, unknown>)[
      'version'
    ];
    if (typeof version !== 'string') {
      throw new Error('Linux Debian artifact is missing its package version');
    }
    const destination = path.join(
      path.dirname(source),
      primaryArtifactName(version, {
        platform: 'linux',
        architecture: 'x64',
        extension: '.deb',
      }),
    );
    await rename(source, destination);
    result.artifacts = result.artifacts.map((artifact) =>
      artifact === source ? destination : artifact,
    );
  }

  return makeResults;
}
