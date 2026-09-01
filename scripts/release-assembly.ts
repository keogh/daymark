import { createHash } from 'node:crypto';
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import packageMetadata from '../package.json' with { type: 'json' };
import { expectedArtifactManifest } from './release-contract.ts';
import { validateDownloadedWorkflowArtifacts } from './workflow-artifacts.ts';

export const checksumManifestName = 'SHA256SUMS.txt';

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

function checksumLine(hash: string, name: string): string {
  if (name.includes('\n') || name.includes('\r')) {
    throw new Error('release filenames cannot contain line breaks');
  }
  return `${hash}  ${name}`;
}

export async function verifyChecksumManifest(directory: string): Promise<void> {
  const manifestPath = path.join(directory, checksumManifestName);
  const lines = (await readFile(manifestPath, 'utf8'))
    .split(/\r?\n/u)
    .filter((line) => line.length > 0);
  const entries = lines.map((line) => {
    const match = /^([a-f0-9]{64}) {2}(.+)$/u.exec(line);
    if (match === null) {
      throw new Error(`invalid checksum line: ${line}`);
    }
    return { hash: match[1]!, name: match[2]! };
  });
  const names = entries.map(({ name }) => name);
  if (new Set(names).size !== names.length) {
    throw new Error('checksum manifest filenames must be unique');
  }

  const scopedFiles = (await filesRecursively(directory))
    .map((filePath) => path.relative(directory, filePath))
    .filter((name) => name !== checksumManifestName)
    .sort();
  const listedFiles = [...names].sort();
  if (JSON.stringify(scopedFiles) !== JSON.stringify(listedFiles)) {
    throw new Error(
      'checksum manifest must cover every final release file exactly once',
    );
  }

  for (const entry of entries) {
    const actual = await sha256(path.join(directory, entry.name));
    if (actual !== entry.hash) {
      throw new Error(`${entry.name} does not match ${checksumManifestName}`);
    }
  }
}

export async function assembleReleaseFiles(options: {
  commit: string;
  inputRoot: string;
  outputRoot: string;
  tag: string;
}): Promise<void> {
  await validateDownloadedWorkflowArtifacts({
    commit: options.commit,
    root: options.inputRoot,
    tag: options.tag,
  });
  await mkdir(options.outputRoot, { recursive: true });

  const inputFiles = await filesRecursively(options.inputRoot);
  const expected = expectedArtifactManifest(packageMetadata.version);
  for (const artifact of expected) {
    const matches = inputFiles.filter(
      (filePath) => path.basename(filePath) === artifact.name,
    );
    if (matches.length !== 1) {
      throw new Error(
        `${artifact.name} must occur exactly once before assembly`,
      );
    }
    await copyFile(matches[0]!, path.join(options.outputRoot, artifact.name));
  }

  const finalNames = expected.map(({ name }) => name).sort();
  const checksumLines = await Promise.all(
    finalNames.map(async (name) =>
      checksumLine(await sha256(path.join(options.outputRoot, name)), name),
    ),
  );
  await writeFile(
    path.join(options.outputRoot, checksumManifestName),
    `${checksumLines.join('\n')}\n`,
  );
  await verifyChecksumManifest(options.outputRoot);
}

export function releaseNotes(options: { commit: string; tag: string }): string {
  return (
    `# Daymark ${options.tag}\n\n` +
    `Tagged commit: \`${options.commit}\`\n\n` +
    `> **Unsigned personal-testing prerelease.** The macOS artifacts are not signed or notarized, so Gatekeeper may warn or block first launch. Install only files obtained from this repository's own GitHub Release page when you intentionally accept that warning. Checksums verify transfer integrity; they do not authenticate the publisher.\n\n` +
    `## Downloads\n\n` +
    `| Target | File |\n| --- | --- |\n` +
    `| macOS 15+, Apple silicon | \`Daymark-${packageMetadata.version}-darwin-arm64.dmg\` |\n` +
    `| macOS 15+, Intel | \`Daymark-${packageMetadata.version}-darwin-x64.dmg\` |\n` +
    `| Ubuntu 24.04 LTS x64 | \`Daymark-${packageMetadata.version}-linux-x64.deb\` |\n\n` +
    `Verify downloads with \`SHA256SUMS.txt\` before installation.\n\n` +
    `## Expected unsigned warnings\n\n` +
    `On macOS, first try opening Daymark, then use **System Settings → Privacy & Security → Open Anyway** for this application. Do not disable Gatekeeper or other machine-wide security controls.\n\n` +
    `## Limitations and acceptance status\n\n` +
    `- Intended only for personal installation and testing; this is not a general-public production release.\n` +
    `- Automatic updates and update checks are unavailable.\n` +
    `- Uninstall removes installer-owned files but preserves the per-user Daymark profile and personal data.\n` +
    `- Downgrades are unsupported.\n` +
    `- Windows packaging and distribution are deferred to SPEC-019 and are not part of this prerelease.\n` +
    `- Linux temporarily uses \`isaaczepeda@users.noreply.github.com\` as maintainer metadata and omits a homepage; both must be confirmed before signed or general-public distribution.\n` +
    `- Required clean-system installation and data-preservation acceptance evidence is **pending**. Keep this release draft until every required environment passes and a person approves publication.\n`
  );
}

export async function runReleaseAssemblyCli(
  args: readonly string[],
): Promise<void> {
  const command = args[0];
  if (command === 'assemble') {
    const outputRoot = option(args, '--output');
    await assembleReleaseFiles({
      commit: option(args, '--commit'),
      inputRoot: option(args, '--input'),
      outputRoot,
      tag: option(args, '--tag'),
    });
    process.stdout.write(`Assembled and verified ${outputRoot}\n`);
    return;
  }
  if (command === 'verify') {
    await verifyChecksumManifest(option(args, '--input'));
    process.stdout.write('Release checksums are valid\n');
    return;
  }
  if (command === 'notes') {
    await writeFile(
      option(args, '--output'),
      releaseNotes({
        commit: option(args, '--commit'),
        tag: option(args, '--tag'),
      }),
    );
    return;
  }
  throw new Error('command must be assemble, verify, or notes');
}

const isDirectRun =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  runReleaseAssemblyCli(process.argv.slice(2)).catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
