import { describe, expect, it } from 'vitest';
import { distributionContract } from '../../scripts/distribution-contract.ts';
import { macosDmgBaseName } from '../../scripts/distribution-contract.ts';
import {
  expectedArtifactManifest,
  validateArtifactManifest,
  validatePackageMetadata,
  validateVersionTag,
} from '../../scripts/release-contract.ts';

const packageMetadata = {
  name: 'time-tracker',
  productName: 'Time Tracker',
  version: '0.1.0',
  description: 'A local-first desktop time tracker.',
  author: 'Isaac Zepeda',
};

describe('release contract', () => {
  it.each([
    ['v0.1.0', []],
    ['0.1.0', ['release tag must exactly match v0.1.0']],
    ['v0.1.1', ['release tag must exactly match v0.1.0']],
    ['v0.1.0-beta.1', ['release tag must exactly match v0.1.0']],
    [undefined, ['release tag is required']],
  ])('validates version 0.1.0 against tag %s', (tag, expected) => {
    expect(validateVersionTag('0.1.0', tag)).toEqual(expected);
  });

  it.each([undefined, '', '1', '1.2', '01.2.3', '1.2.3-beta.1'])(
    'rejects malformed or absent package version %s',
    (version) => {
      expect(validateVersionTag(version, `v${String(version)}`)[0]).toContain(
        'stable X.Y.Z',
      );
    },
  );

  it('requires the exact approved identity and omits homepage', () => {
    expect(validatePackageMetadata(packageMetadata)).toEqual([]);
    expect(
      validatePackageMetadata({ ...packageMetadata, author: 'Company' }),
    ).toContain('package.json author must equal Isaac Zepeda');
    expect(
      validatePackageMetadata({
        ...packageMetadata,
        homepage: 'https://example.com',
      }),
    ).toContain(
      'package.json homepage must be omitted until a canonical value is approved',
    );
    expect(distributionContract.identity.identifiers).toEqual({
      macosBundleId: 'com.isaaczepeda.timetracker',
      windowsAppUserModelId: 'com.squirrel.timetracker.time-tracker',
      linuxPackageName: 'time-tracker',
    });
    expect(distributionContract.linux).toEqual({
      maintainerName: 'Isaac Zepeda',
      maintainerEmail: 'isaaczepeda@users.noreply.github.com',
    });
  });

  it('defines four unique, versioned platform and architecture artifact names', () => {
    const manifest = expectedArtifactManifest('0.1.0');
    expect(validateArtifactManifest(manifest, '0.1.0')).toEqual([]);
    expect(new Set(manifest.map(({ name }) => name))).toHaveLength(4);
  });

  it('defines distinct supported macOS DMG base names', () => {
    expect(macosDmgBaseName('0.1.0', 'arm64')).toBe(
      'Time-Tracker-0.1.0-darwin-arm64',
    );
    expect(macosDmgBaseName('0.1.0', 'x64')).toBe(
      'Time-Tracker-0.1.0-darwin-x64',
    );
    expect(() => macosDmgBaseName('0.1.0', 'universal')).toThrow(
      'unsupported macOS DMG architecture',
    );
  });

  it('rejects missing, stale, mismatched, renamed, and duplicate primary artifacts', () => {
    const manifest = expectedArtifactManifest('0.1.0');
    expect(validateArtifactManifest(manifest.slice(1), '0.1.0')).not.toEqual(
      [],
    );
    expect(
      validateArtifactManifest([...manifest, manifest[0]!], '0.1.0'),
    ).not.toEqual([]);
    expect(
      validateArtifactManifest(
        manifest.map((entry, index) =>
          index === 0 ? { ...entry, version: '0.0.9' } : entry,
        ),
        '0.1.0',
      ),
    ).not.toEqual([]);
    expect(
      validateArtifactManifest(
        manifest.map((entry, index) =>
          index === 0 ? { ...entry, name: 'stale.dmg' } : entry,
        ),
        '0.1.0',
      ),
    ).not.toEqual([]);
  });
});
