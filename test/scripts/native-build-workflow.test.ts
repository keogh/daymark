import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const workflowPath = '.github/workflows/native-builds.yml';

describe('native distribution build workflow', () => {
  it('uses a tag/manual trigger and globally read-only permissions', async () => {
    const workflow = await readFile(workflowPath, 'utf8');
    expect(workflow).toContain("- 'v*'");
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toMatch(/permissions:\n {2}contents: read/);
    expect(workflow.match(/contents:\s*write/g)).toHaveLength(1);
  });

  it('validates once before four stable native runner jobs fan out', async () => {
    const workflow = await readFile(workflowPath, 'utf8');
    for (const contract of [
      'macos-arm64:',
      'runs-on: macos-15',
      'macos-x64:',
      'runs-on: macos-15-intel',
      'windows-x64:',
      'runs-on: windows-2025',
      'linux-x64:',
      'runs-on: ubuntu-24.04',
    ]) {
      expect(workflow).toContain(contract);
    }
    expect(workflow.match(/needs: validate/g)).toHaveLength(4);
    expect(workflow.match(/run: npm ci/g)).toHaveLength(5);
    expect(workflow).toContain('ref: ${{ needs.validate.outputs.commit }}');
  });

  it('uploads isolated artifacts and gates complete-set validation on every build', async () => {
    const workflow = await readFile(workflowPath, 'utf8');
    expect(workflow.match(/actions\/upload-artifact@v4/g)).toHaveLength(4);
    expect(workflow).toContain('actions/download-artifact@v4');
    expect(workflow).toMatch(
      /artifacts-valid:[\s\S]*needs:[\s\S]*- macos-arm64[\s\S]*- macos-x64[\s\S]*- windows-x64[\s\S]*- linux-x64/,
    );
    expect(workflow).toContain('scripts/workflow-artifacts.ts validate');
  });

  it('gates a tag-only draft prerelease on every build and checksum validation', async () => {
    const workflow = await readFile(workflowPath, 'utf8');
    expect(workflow).toMatch(
      /release-draft:[\s\S]*if: github\.event_name == 'push'[\s\S]*needs:[\s\S]*- macos-arm64[\s\S]*- macos-x64[\s\S]*- windows-x64[\s\S]*- linux-x64[\s\S]*- artifacts-valid/,
    );
    expect(workflow).toMatch(
      /release-draft:[\s\S]*permissions:\n {6}contents: write/,
    );
    expect(workflow).toContain('npm run release:assemble');
    expect(workflow).toContain('gh release create');
    expect(workflow).toContain('--draft --prerelease');
    expect(workflow).not.toMatch(/gh release (edit|create)[^\n]*--draft=false/);
  });
});
