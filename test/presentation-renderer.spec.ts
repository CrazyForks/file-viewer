import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) => {
  return readFileSync(join(process.cwd(), relativePath), 'utf8');
};

describe('@file-viewer/renderer-presentation regressions', () => {
  it('keeps PPTX worker assets configurable for self-hosted deployments', () => {
    const source = readSource('packages/renderers/presentation/src/pptx.ts');

    expect(source).toContain('const presentationOptions = context?.options?.presentation');
    expect(source).toContain('workerUrl: presentationOptions?.workerUrl');
    expect(source).toContain('workerType: presentationOptions?.workerType');
  });
});
