declare module 'shpjs' {
  const shp: (input: ArrayBuffer) => Promise<unknown>;
  export default shp;
}

declare module '@kenjiuno/msgreader' {
  const MsgReader: any;
  export default MsgReader;
}

declare module 'postal-mime' {
  const PostalMime: any;
  export default PostalMime;
}

declare module 'sql.js' {
  const initSqlJs: any;
  export default initSqlJs;
}

declare module 'avsc/etc/browser/avsc.js' {
  const avsc: any;
  export = avsc;
}

declare module '@ljheee/xmind-parser' {
  export function parseXmind8Xml(
    xmlString: string,
    options?: Record<string, unknown>
  ): Promise<any[]>;
  export function parseXmind2020Json(
    contentJson: string | unknown[],
    options?: Record<string, unknown>
  ): any[];
}
