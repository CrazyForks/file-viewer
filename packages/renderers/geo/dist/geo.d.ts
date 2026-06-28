import { createFileViewerTranslator, type FileRenderContext, type FileViewerGeoOptions, type FileViewerRenderedInstance } from '@file-viewer/core';
type Position = [number, number, ...number[]];
type Geometry = {
    type: 'Point';
    coordinates: Position;
} | {
    type: 'MultiPoint';
    coordinates: Position[];
} | {
    type: 'LineString';
    coordinates: Position[];
} | {
    type: 'MultiLineString';
    coordinates: Position[][];
} | {
    type: 'Polygon';
    coordinates: Position[][];
} | {
    type: 'MultiPolygon';
    coordinates: Position[][][];
} | {
    type: 'GeometryCollection';
    geometries: Geometry[];
};
interface Feature {
    type: 'Feature';
    geometry: Geometry | null;
    properties?: Record<string, unknown>;
    id?: string | number;
}
interface FeatureCollection {
    type: 'FeatureCollection';
    features: Feature[];
}
interface Bounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}
interface ParseGeoResult {
    collection: FeatureCollection;
    bounds: Bounds | null;
    sourceProjection: string;
    displayProjection: string;
}
type FileViewerTranslator = ReturnType<typeof createFileViewerTranslator>;
export declare const parseFileViewerGeoData: (buffer: ArrayBuffer, type: string | undefined, options: FileViewerGeoOptions | undefined, t: FileViewerTranslator) => Promise<ParseGeoResult>;
export default function renderGeo(buffer: ArrayBuffer, target: HTMLDivElement, type?: string, context?: FileRenderContext): Promise<FileViewerRenderedInstance>;
export {};
