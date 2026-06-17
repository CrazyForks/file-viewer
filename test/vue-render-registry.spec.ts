import { describe, expect, it } from 'vitest';
import { DEFAULT_SUPPORTED_EXTENSIONS } from '../packages/core/src';
import renders, { missingCoreRendererHandlers } from '../src/package/vendors/renders';

describe('Vue renderer registry alignment', () => {
  it('uses the core format matrix as the Vue renderer extension source', () => {
    const supported = [...DEFAULT_SUPPORTED_EXTENSIONS];
    const renderExtensions = [...renders.keys()].filter(extension => extension !== 'error').sort();

    expect(missingCoreRendererHandlers).toEqual([]);
    expect(renderExtensions).toEqual(supported);
    expect(renders.get('xlsx')).toBe(renders.get('xls'));
    expect(renders.get('dwg')).toBe(renders.get('dwf'));
    expect(renders.get('zip')).toBe(renders.get('rar'));
    expect(renders.has('error')).toBe(true);
  });
});
