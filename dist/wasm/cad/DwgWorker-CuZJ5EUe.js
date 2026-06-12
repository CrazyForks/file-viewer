function D(e) {
  return {
    format: e.format,
    sourceName: e.sourceName,
    units: e.units,
    header: e.header ?? {},
    layers: e.layers ?? {},
    blocks: e.blocks ?? {},
    entities: e.entities ?? [],
    pages: e.pages,
    metadata: e.metadata ?? {},
    warnings: e.warnings ?? [],
    raw: e.raw
  };
}
function L(e) {
  switch (String(e ?? "").toUpperCase()) {
    case "LINE":
      return "line";
    case "CIRCLE":
      return "circle";
    case "ARC":
      return "arc";
    case "LWPOLYLINE":
    case "POLYLINE":
    case "POLYLINE_2D":
    case "POLYLINE2D":
    case "POLYLINE_3D":
    case "POLYLINE3D":
    case "LEADER":
    case "MULTILEADER":
      return "polyline";
    case "ELLIPSE":
      return "ellipse";
    case "TEXT":
    case "MTEXT":
    case "ATTRIB":
    case "ATTDEF":
    case "DIMENSION":
      return "text";
    case "POINT":
      return "point";
    case "INSERT":
      return "insert";
    case "SOLID":
    case "TRACE":
    case "3DFACE":
      return "solid";
    case "HATCH":
      return "hatch";
    case "SPLINE":
      return "spline";
    case "PATH":
    case "XPS_PATH":
    case "DWF_PATH":
      return "path";
    case "IMAGE":
    case "RASTER_IMAGE":
    case "DWF_IMAGE":
      return "image";
    case "VIEWPORT":
      return "viewport";
    default:
      return "unsupported";
  }
}
function M(e, t, o = {}) {
  const i = t ?? String(e.type ?? e.entityType ?? e.objectName ?? "UNKNOWN").toUpperCase(), n = o.includeUnknownProperties === !1 ? { type: i, kind: L(i) } : { ...e, type: i, kind: L(i) };
  o.keepRaw && (n.raw = e), n.handle = g(e.handle ?? e.id), n.layer = g(e.layer ?? e.layerName), n.lineType = g(e.lineType ?? e.linetype);
  const c = o.numericColorMode ?? "auto", s = u(e.color), r = u(e.colorIndex ?? e.colorNumber ?? e.aci ?? e.aciColor ?? e.color_index);
  n.colorIndex = r ?? (c !== "rgb" && s !== void 0 && Math.abs(s) <= 257 ? s : void 0);
  const a = e.trueColor ?? e.true_color ?? e.truecolor ?? e.colorRGB ?? e.colorRgb ?? e.rgbColor ?? e.rgb, d = s !== void 0 && s >= 0 && s <= 16777215 && (c === "rgb" || c === "auto" && Math.abs(s) > 257);
  n.trueColor = a ?? (d ? s : void 0), (typeof e.color == "string" || typeof e.color == "number") && (n.color = e.color), n.colorNumber = u(e.colorNumber) ?? n.colorNumber, n.colorName = g(e.colorName ?? e.color_name) ?? n.colorName, n.fillColor = e.fillColor ?? e.fill_color, n.fillColorIndex = u(e.fillColorIndex ?? e.fill_color_index ?? e.fillColorNumber) ?? n.fillColorIndex, n.opacity = u(e.opacity ?? e.alpha) ?? n.opacity, n.lineweight = u(e.lineweight ?? e.lineWeight), n.isVisible = !(e.isVisible === !1 || e.visible === !1), n.startPoint = p(e.startPoint ?? e.start ?? e.p0 ?? e.from) ?? n.startPoint, n.endPoint = p(e.endPoint ?? e.end ?? e.p1 ?? e.to) ?? n.endPoint, n.center = p(e.center ?? e.centerPoint) ?? n.center, n.insertionPoint = p(e.insertionPoint ?? e.position ?? e.location ?? e.point ?? e.basePoint) ?? n.insertionPoint, n.radius = u(e.radius) ?? n.radius, n.startAngle = u(e.startAngle ?? e.start_angle) ?? n.startAngle, n.endAngle = u(e.endAngle ?? e.end_angle) ?? n.endAngle, n.majorAxisEndPoint = p(e.majorAxisEndPoint ?? e.majorAxis ?? e.major) ?? n.majorAxisEndPoint, n.axisRatio = u(e.axisRatio ?? e.ratio) ?? n.axisRatio, n.height = u(e.height ?? e.textHeight) ?? n.height, n.textHeight = u(e.textHeight ?? e.height) ?? n.textHeight, n.rotation = u(e.rotation ?? e.angle) ?? n.rotation, n.text = g(e.text ?? e.value ?? e.string ?? e.contents) ?? n.text, n.name = g(e.name ?? e.blockName) ?? n.name, n.blockName = g(e.blockName ?? e.name) ?? n.blockName;
  const f = N(e.vertices ?? e.points);
  f.length > 0 && (n.vertices = f);
  const l = N(e.controlPoints ?? e.control_points);
  l.length > 0 && (n.controlPoints = l);
  const m = N(e.fitPoints ?? e.fit_points);
  return m.length > 0 && (n.fitPoints = m), n;
}
function p(e) {
  if (!e || typeof e != "object") return;
  const t = e, o = Number(t.x ?? t.X ?? t[0]), i = Number(t.y ?? t.Y ?? t[1]), n = t.z ?? t.Z ?? t[2], c = n === void 0 ? void 0 : Number(n);
  if (!(!Number.isFinite(o) || !Number.isFinite(i)))
    return Number.isFinite(c) ? { x: o, y: i, z: c } : { x: o, y: i };
}
function N(e) {
  if (!Array.isArray(e)) return [];
  const t = [];
  for (const o of e) {
    const i = p(o);
    if (!i) continue;
    const n = o, c = i, s = u(n.bulge);
    s !== void 0 && (c.bulge = s);
    const r = u(n.startWidth ?? n.start_width);
    r !== void 0 && (c.startWidth = r);
    const a = u(n.endWidth ?? n.end_width);
    a !== void 0 && (c.endWidth = a), t.push(c);
  }
  return t;
}
function T(e, t) {
  t.name && (e[t.name] = t, e[t.name.toLowerCase()] = t);
}
function _(e, t) {
  t.name && (e[t.name] = t, e[t.name.toLowerCase()] = t);
}
function u(e) {
  const t = Number(e);
  return Number.isFinite(t) ? t : void 0;
}
function g(e) {
  if (typeof e != "string" && typeof e != "number") return;
  const t = String(e);
  return t.length > 0 ? t : void 0;
}
function O(e) {
  return e.byteOffset === 0 && e.byteLength === e.buffer.byteLength ? e.buffer : e.slice().buffer;
}
const S = {
  AC1009: "R12",
  AC1012: "R13",
  AC1014: "R14",
  AC1015: "R2000",
  AC1018: "R2004",
  AC1021: "R2007",
  AC1024: "R2010",
  AC1027: "R2013",
  AC1032: "R2018"
};
function U(e) {
  const t = Array.from(e.slice(0, 6), (i) => String.fromCharCode(i)).join(""), o = S[t] ?? "UNKNOWN";
  return {
    signature: t,
    release: o,
    supportedByOpenDesignSpec: o !== "UNKNOWN",
    notes: o === "UNKNOWN" ? "Unknown or unsupported DWG signature." : void 0
  };
}
const C = /* @__PURE__ */ new Map();
async function B(e, t = {}) {
  var m, y, b, A, w, R;
  const o = performance.now(), i = t.sourceName;
  (m = t.onProgress) == null || m.call(t, { phase: "detect", format: "dwg", message: "Validating DWG header…", total: e.byteLength });
  const n = U(e);
  if (!n.signature.startsWith("AC"))
    throw new Error(`Invalid DWG header: ${JSON.stringify(n.signature)}.`);
  (y = t.onProgress) == null || y.call(t, { phase: "wasm-init", format: "dwg", message: "Initializing LibreDWG WebAssembly…", total: e.byteLength });
  const c = await k(t.wasmPath ?? "/wasm/");
  (b = t.onProgress) == null || b.call(t, { phase: "parse", format: "dwg", message: `Decoding ${n.signature} DWG…`, total: e.byteLength, percent: 35 });
  const s = O(e), r = ((A = c.Dwg_File_Type) == null ? void 0 : A.DWG) ?? 0, a = c.instance.dwg_read_data(s, r);
  if (!a) throw new Error("LibreDWG returned an empty DWG result.");
  if (typeof a.error == "number" && a.error !== 0) throw new Error(`LibreDWG parse error code: ${a.error}.`);
  (w = t.onProgress) == null || w.call(t, { phase: "normalize", format: "dwg", message: "Normalizing DWG database…", total: e.byteLength, percent: 72 });
  const d = typeof c.instance.convert == "function" ? c.instance.convert(a) : a;
  try {
    typeof c.instance.dwg_free == "function" && c.instance.dwg_free(a);
  } catch {
  }
  const f = z(d, i, n, { keepRaw: !!t.keepRaw }), l = performance.now() - o;
  return (R = t.onProgress) == null || R.call(t, { phase: "done", format: "dwg", message: "DWG loaded.", total: e.byteLength, percent: 100, elapsedMs: l }), {
    document: f,
    raw: t.keepRaw ? d : void 0,
    bytes: e.byteLength,
    elapsedMs: l,
    format: "dwg",
    warnings: f.warnings
  };
}
async function k(e = "/wasm/") {
  const t = H(e);
  let o = C.get(t);
  o || (o = import("./index-C365l3i9.js").then(async (c) => {
    const s = c, r = s.LibreDwg;
    if (!r || typeof r.create != "function")
      throw new Error("@mlightcad/libredwg-web did not expose LibreDwg.create().");
    try {
      if (typeof s.createModule == "function" && typeof r.createByWasmInstance == "function") {
        const a = E(t), d = await V(a), f = await s.createModule({
          wasmBinary: d,
          locateFile: (l) => new URL(l, x(t)).href
        });
        return r.createByWasmInstance(f);
      }
      return await r.create(t);
    } catch (a) {
      const d = a instanceof Error ? a.message : String(a);
      throw new Error(`Failed to initialize LibreDWG WebAssembly from ${t}. Ensure libredwg-web.wasm is deployed at ${E(t)} and wasmPath is resolved relative to the page, not the worker script. Run npm run copy:wasm before dev/build. Original error: ${d}`);
    }
  }), C.set(t, o));
  const i = await o, n = await import("./index-C365l3i9.js");
  return { module: n, instance: i, Dwg_File_Type: n.Dwg_File_Type };
}
function z(e, t, o, i = {}) {
  const n = e && typeof e == "object" ? e : {}, c = F(n, i), s = $(n, i), r = Array.isArray(n.entities) ? n.entities : [], a = { keepRaw: !!i.keepRaw, includeUnknownProperties: !!i.keepRaw }, d = r.filter((l) => !!l && typeof l == "object").map((l) => I(l, a)), f = D({
    format: "dwg",
    sourceName: t,
    header: j(n.header, o),
    layers: c,
    blocks: s,
    entities: d,
    metadata: {
      parser: "@mlightcad/libredwg-web",
      parserMode: "wasm",
      version: o
    },
    warnings: [],
    raw: i.keepRaw ? e : void 0
  });
  return d.length === 0 && f.warnings.push("DWG parsed successfully but no model-space entities were exposed by the converter. Check layout/paper-space content or unsupported proxy objects."), f;
}
function I(e, t) {
  const o = M(e, void 0, { ...t, numericColorMode: "rgb" }), i = u(e.color);
  return i !== void 0 && i >= 0 && i <= 16777215 && (o.color = i, o.trueColor = i), o.colorIndex = u(e.colorIndex ?? e.colorNumber ?? e.aci) ?? o.colorIndex, o.colorName = g(e.colorName ?? e.color_name) ?? o.colorName, o;
}
function G(e) {
  return typeof e == "number" && Number.isFinite(e) && Math.abs(Math.trunc(e)) >= 1 && Math.abs(Math.trunc(e)) <= 255;
}
function j(e, t) {
  const o = e && typeof e == "object" ? { ...e } : {};
  return t && (o.dwgVersion = t), o;
}
function F(e, t) {
  const o = {}, i = [], n = e.tables;
  for (const c of ["LAYER", "layer", "layers"]) {
    const s = e[c] ?? (n == null ? void 0 : n[c]);
    s && i.push(s);
  }
  for (const c of i)
    for (const s of W(c)) {
      const r = s, a = g(r.name ?? r.layerName ?? r.entryName);
      if (!a) continue;
      const d = u(r.colorIndex ?? r.colorNumber), f = u(r.trueColor ?? r.true_color ?? r.truecolor ?? r.colorRGB ?? r.colorRgb ?? r.rgbColor ?? r.rgb), l = u(r.color), m = G(d), y = f ?? (!m && l !== void 0 && l >= 0 && l <= 16777215 ? l : void 0), b = {
        name: a,
        color: m ? void 0 : r.color ?? r.colorName,
        colorIndex: d ?? (l !== void 0 && Math.abs(l) <= 257 ? l : void 0),
        trueColor: y,
        lineType: g(r.lineType ?? r.linetype),
        lineweight: u(r.lineweight ?? r.lineWeight),
        isVisible: !(r.isVisible === !1 || r.off === !0 || Number(d ?? r.color ?? 1) < 0),
        isFrozen: !!(r.isFrozen ?? r.frozen),
        isLocked: !!(r.isLocked ?? r.locked),
        raw: t.keepRaw ? r : void 0
      };
      T(o, b);
    }
  return o;
}
function $(e, t) {
  const o = {}, i = [e.blocks, e.blockHeaders, e.block_records, e.blockRecords], n = e.tables;
  i.push(n == null ? void 0 : n.BLOCK, n == null ? void 0 : n.BLOCK_RECORD, n == null ? void 0 : n.blocks);
  const c = { keepRaw: !!t.keepRaw, includeUnknownProperties: !!t.keepRaw };
  for (const s of i)
    for (const r of W(s)) {
      const a = r, d = g(a.name ?? a.blockName ?? a.name2);
      if (!d) continue;
      const l = (Array.isArray(a.entities) ? a.entities : Array.isArray(a.ownedObjects) ? a.ownedObjects : []).filter((m) => !!m && typeof m == "object").map((m) => I(m, c));
      _(o, {
        name: d,
        basePoint: p(a.basePoint ?? a.origin) ?? { x: 0, y: 0 },
        entities: l,
        raw: t.keepRaw ? a : void 0
      });
    }
  return o;
}
function W(e) {
  if (!e) return [];
  if (Array.isArray(e)) return e;
  if (typeof e != "object") return [];
  const t = e, o = Object.values(t).filter((n) => n && typeof n == "object"), i = ["entries", "records", "items", "values", "layers", "blocks"].flatMap((n) => Array.isArray(t[n]) ? t[n] : []);
  return i.length > 0 ? i : o;
}
function H(e) {
  const t = e.trim() || "/wasm";
  if (t === "/") return P();
  const o = t.replace(/\/+$/, "");
  return q(o) ? o : o.startsWith("/") ? `${P()}${o}` : new URL(o, v()).href.replace(/\/+$/, "");
}
function E(e) {
  return new URL("libredwg-web.wasm", x(e)).href;
}
function x(e) {
  return e.endsWith("/") ? e : `${e}/`;
}
function q(e) {
  return /^[a-z][a-z0-9+.-]*:/i.test(e);
}
function v() {
  return typeof document < "u" && document.baseURI ? document.baseURI : typeof location < "u" && location.href ? location.href : "http://localhost/";
}
function P() {
  return typeof location < "u" && location.origin ? location.origin : new URL(v()).origin;
}
async function V(e) {
  if (typeof fetch != "function")
    throw new Error("fetch() is not available, so the LibreDWG WASM binary cannot be loaded.");
  const t = await fetch(e, { credentials: "same-origin", cache: "force-cache" });
  if (!t.ok)
    throw new Error(`WASM asset request failed with HTTP ${t.status} for ${e}.`);
  const o = new Uint8Array(await t.arrayBuffer());
  if (!Y(o)) {
    const i = X(o), n = t.headers.get("content-type") ?? "unknown content-type";
    throw new Error(`Invalid WASM asset at ${e}. Expected bytes 00 61 73 6d, got ${K(o)} (${n}). The server probably returned an HTML fallback page instead of libredwg-web.wasm. Response preview: ${i}`);
  }
  return o;
}
function Y(e) {
  return e.length >= 4 && e[0] === 0 && e[1] === 97 && e[2] === 115 && e[3] === 109;
}
function K(e) {
  return Array.from(e.slice(0, 4)).map((t) => t.toString(16).padStart(2, "0")).join(" ");
}
function X(e) {
  const t = Array.from(e.slice(0, 32)).map((o) => o >= 32 && o <= 126 ? String.fromCharCode(o) : ".").join("");
  return JSON.stringify(t);
}
const h = self;
h.postMessage({ type: "ready" });
h.onmessage = async (e) => {
  var n, c;
  const t = e.data;
  if (!t) return;
  const o = performance.now(), i = (s) => {
    h.postMessage({ type: "progress", requestId: t.requestId, progress: s });
  };
  try {
    if (t.type === "warmup") {
      i({ phase: "wasm-init", format: "dwg", message: "Warming LibreDWG WebAssembly instance…" }), await k(((n = t.options) == null ? void 0 : n.wasmPath) ?? "/wasm/"), h.postMessage({ type: "warmup-result", requestId: t.requestId, elapsedMs: performance.now() - o });
      return;
    }
    if (t.type !== "load") return;
    i({ phase: "worker-ready", format: "dwg", message: "DWG worker received file bytes.", total: t.bytes.byteLength });
    const s = await B(new Uint8Array(t.bytes), {
      ...t.options,
      sourceName: t.fileName,
      keepRaw: !!((c = t.options) != null && c.keepRaw),
      onProgress: i
    });
    s.document.metadata.loaderMode = "worker", s.elapsedMs = performance.now() - o, h.postMessage({ type: "result", requestId: t.requestId, result: s });
  } catch (s) {
    const r = J(s);
    h.postMessage({ type: "error", requestId: t.requestId, error: r });
  }
};
function J(e) {
  return e instanceof Error ? { name: e.name, message: e.message, stack: e.stack } : { message: String(e) };
}
//# sourceMappingURL=DwgWorker-CuZJ5EUe.js.map
