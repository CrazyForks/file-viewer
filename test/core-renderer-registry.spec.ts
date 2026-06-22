import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RENDERER_DEFINITIONS,
  DEFAULT_SUPPORTED_EXTENSIONS,
  CORE_LITE_RENDERER_IDS,
  createFileViewerCoreRendererRegistry,
  createRendererRegistry,
  fileViewerCoreRendererRegistry,
  missingFileViewerCoreRendererHandlers,
} from '../packages/core/src';

describe('core renderer registry alignment', () => {
  it('uses the core format matrix as the extension source', () => {
    const supported = [...DEFAULT_SUPPORTED_EXTENSIONS];
    const registry = createRendererRegistry(DEFAULT_RENDERER_DEFINITIONS);

    expect(registry.listExtensions()).toEqual(supported);
    expect(registry.getByExtension('xlsx')?.id).toBe(registry.getByExtension('xls')?.id);
    expect(registry.getByExtension('dwg')?.id).toBe(registry.getByExtension('dwf')?.id);
    expect(registry.getByExtension('zip')?.id).toBe(registry.getByExtension('rar')?.id);
  });

  it('keeps key renderer definitions available through core', () => {
    const supported = [...DEFAULT_SUPPORTED_EXTENSIONS];
    const registry = createRendererRegistry(DEFAULT_RENDERER_DEFINITIONS);

    expect(registry.listExtensions()).toEqual(supported);
    expect(registry.getByExtension('docx')?.id).toBe('office-word-openxml');
    expect(registry.getByExtension('pdf')?.id).toBe('pdf');
    expect(registry.getByExtension('dwf')?.id).toBe('cad');
  });

  it('exposes migrated browser renderers through the core renderer registry', () => {
    expect(missingFileViewerCoreRendererHandlers).not.toContain('audio');
    expect(missingFileViewerCoreRendererHandlers).not.toContain('video');
    expect(missingFileViewerCoreRendererHandlers).not.toContain('code');
    expect(missingFileViewerCoreRendererHandlers).not.toContain('image');
    expect(missingFileViewerCoreRendererHandlers).not.toContain('umd');
    expect(missingFileViewerCoreRendererHandlers).not.toContain('geo');
    expect(missingFileViewerCoreRendererHandlers).not.toContain('open-document');
    expect(missingFileViewerCoreRendererHandlers).not.toContain('office-word-openxml');
    expect(missingFileViewerCoreRendererHandlers).not.toContain('office-word-binary');
    expect(missingFileViewerCoreRendererHandlers).not.toContain('spreadsheet-openxml');
    expect(missingFileViewerCoreRendererHandlers).not.toContain('email');
    expect(missingFileViewerCoreRendererHandlers).not.toContain('eda');
    expect(missingFileViewerCoreRendererHandlers).not.toContain('cad');
    expect(missingFileViewerCoreRendererHandlers).not.toContain('typst');
    expect(missingFileViewerCoreRendererHandlers).not.toContain('office-presentation');
    expect(missingFileViewerCoreRendererHandlers).not.toContain('epub');
    expect(missingFileViewerCoreRendererHandlers).not.toContain('model');
    expect(missingFileViewerCoreRendererHandlers).not.toContain('drawing');
    expect(missingFileViewerCoreRendererHandlers).not.toContain('data-asset');
    expect(missingFileViewerCoreRendererHandlers).not.toContain('archive');
    expect(fileViewerCoreRendererRegistry.getByExtension('mp3')?.load).toBeTypeOf('function');
    expect(fileViewerCoreRendererRegistry.getByExtension('mp4')?.load).toBeTypeOf('function');
    expect(fileViewerCoreRendererRegistry.getByExtension('ts')?.load).toBeTypeOf('function');
    expect(fileViewerCoreRendererRegistry.getByExtension('png')?.load).toBeTypeOf('function');
    expect(fileViewerCoreRendererRegistry.getByExtension('umd')?.load).toBeTypeOf('function');
    expect(fileViewerCoreRendererRegistry.getByExtension('geojson')?.load).toBeTypeOf('function');
    expect(fileViewerCoreRendererRegistry.getByExtension('odt')?.load).toBeTypeOf('function');
    expect(fileViewerCoreRendererRegistry.getByExtension('docx')?.load).toBeTypeOf('function');
    expect(fileViewerCoreRendererRegistry.getByExtension('doc')?.load).toBeTypeOf('function');
    expect(fileViewerCoreRendererRegistry.getByExtension('xlsx')?.load).toBeTypeOf('function');
    expect(fileViewerCoreRendererRegistry.getByExtension('eml')?.load).toBeTypeOf('function');
    expect(fileViewerCoreRendererRegistry.getByExtension('olb')?.load).toBeTypeOf('function');
    expect(fileViewerCoreRendererRegistry.getByExtension('dwg')?.load).toBeTypeOf('function');
    expect(fileViewerCoreRendererRegistry.getByExtension('typ')?.load).toBeTypeOf('function');
    expect(fileViewerCoreRendererRegistry.getByExtension('pptx')?.load).toBeTypeOf('function');
    expect(fileViewerCoreRendererRegistry.getByExtension('epub')?.load).toBeTypeOf('function');
    expect(fileViewerCoreRendererRegistry.getByExtension('glb')?.load).toBeTypeOf('function');
    expect(fileViewerCoreRendererRegistry.getByExtension('drawio')?.load).toBeTypeOf('function');
    expect(fileViewerCoreRendererRegistry.getByExtension('sqlite')?.load).toBeTypeOf('function');
    expect(fileViewerCoreRendererRegistry.getByExtension('zip')?.load).toBeTypeOf('function');
  });

  it('can build explicit lite and empty built-in renderer registries', () => {
    const lite = createFileViewerCoreRendererRegistry({ builtinRenderers: 'lite' });
    const none = createFileViewerCoreRendererRegistry({ builtinRenderers: 'none' });

    expect(lite.missingRendererIds).toEqual([]);
    expect(lite.registry.list().map(definition => definition.id).sort()).toEqual(
      [...CORE_LITE_RENDERER_IDS].sort()
    );
    expect(lite.registry.getByExtension('png')?.load).toBeTypeOf('function');
    expect(lite.registry.getByExtension('mp3')?.load).toBeTypeOf('function');
    expect(lite.registry.getByExtension('pdf')).toBeUndefined();
    expect(lite.registry.getByExtension('docx')).toBeUndefined();

    expect(none.registry.list()).toEqual([]);
    expect(none.registry.getByExtension('png')).toBeUndefined();
    expect(none.registry.getByExtension('pdf')).toBeUndefined();
  });
});
