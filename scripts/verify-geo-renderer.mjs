import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { DOMParser } from 'linkedom'
import { createFileViewerTranslator } from '../packages/core/dist/index.js'
import { parseFileViewerGeoData } from '../packages/renderers/geo/dist/geo.js'

globalThis.DOMParser ||= DOMParser

const root = process.cwd()
const examplesRoot = join(root, 'apps', 'viewer-demo', 'public', 'example')
const encoder = new TextEncoder()
const t = createFileViewerTranslator({ locale: 'en-US' })

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[geo-renderer] ${message}`)
  }
}

function near(actual, expected, tolerance, label) {
  assert(
    Math.abs(actual - expected) <= tolerance,
    `${label} expected ${expected} ± ${tolerance}, got ${actual}`
  )
}

function lonLatToMercator(lng, lat) {
  const x = lng * 20037508.34 / 180
  const y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180)
  return [x, y * 20037508.34 / 180]
}

async function parseExample(sample, type, options) {
  const buffer = await readFile(join(examplesRoot, sample))
  return parseFileViewerGeoData(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), type, options, t)
}

const geojson = await parseExample('map.geojson', 'geojson')
assert(geojson.collection.features.length === 3, 'GeoJSON sample should expose 3 features')
assert(geojson.sourceProjection === 'EPSG:4326', 'GeoJSON sample should remain WGS84')
near(geojson.bounds.minX, 121.458, 0.00001, 'GeoJSON min longitude')
near(geojson.bounds.maxY, 31.242, 0.00001, 'GeoJSON max latitude')

const kml = await parseExample('route.kml', 'kml')
assert(kml.collection.features.length >= 2, 'KML sample should expose route features')
assert(kml.sourceProjection === 'EPSG:4326', 'KML should be treated as WGS84')

const gpx = await parseExample('track.gpx', 'gpx')
assert(gpx.collection.features.length >= 1, 'GPX sample should expose track features')
assert(gpx.sourceProjection === 'EPSG:4326', 'GPX should be treated as WGS84')

const [mercatorX, mercatorY] = lonLatToMercator(121.4737, 31.2304)
const projectedGeoJson = {
  type: 'FeatureCollection',
  crs: {
    type: 'name',
    properties: { name: 'urn:ogc:def:crs:EPSG::3857' }
  },
  features: [{
    type: 'Feature',
    properties: { name: 'Mercator point' },
    geometry: { type: 'Point', coordinates: [mercatorX, mercatorY] }
  }]
}
const projected = await parseFileViewerGeoData(
  encoder.encode(JSON.stringify(projectedGeoJson)).buffer,
  'geojson',
  undefined,
  t
)
assert(projected.sourceProjection === 'EPSG:3857', 'GeoJSON crs metadata should select EPSG:3857')
near(projected.bounds.minX, 121.4737, 0.0001, 'EPSG:3857 converted longitude')
near(projected.bounds.minY, 31.2304, 0.0001, 'EPSG:3857 converted latitude')

const inferredGeoJson = {
  type: 'FeatureCollection',
  features: projectedGeoJson.features
}
const inferred = await parseFileViewerGeoData(
  encoder.encode(JSON.stringify(inferredGeoJson)).buffer,
  'geojson',
  undefined,
  t
)
assert(inferred.sourceProjection === 'EPSG:3857', 'GeoJSON with large Web Mercator coordinates should infer EPSG:3857')
near(inferred.bounds.minX, 121.4737, 0.0001, 'Inferred EPSG:3857 longitude')
near(inferred.bounds.minY, 31.2304, 0.0001, 'Inferred EPSG:3857 latitude')

console.log('[geo-renderer] Verified GeoJSON, KML, GPX, EPSG:3857 CRS metadata, and Web Mercator inference.')
