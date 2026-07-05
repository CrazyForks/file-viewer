import type {
  FileViewerBrandLicenseInput,
  FileViewerBrandingOptions,
} from '../contracts/types';

export const FILE_VIEWER_BRAND_LICENSE_FORMAT = 'flyfish-viewer-brand-license-v1';
export const FILE_VIEWER_BRAND_LICENSE_PRODUCT = 'flyfish-viewer';
export const FILE_VIEWER_BRAND_LICENSE_PROJECT = 'file-viewer';
export const FILE_VIEWER_BRAND_LICENSE_KIND = 'brand-removal';
export const FILE_VIEWER_BRAND_LICENSE_PERMISSION = 'remove-branding';

export interface FileViewerBrandingPresentationState {
  visible: boolean;
  licenseValid: boolean;
  text: string;
  href: string;
  title: string;
  inlineStyle: string;
}

const DEFAULT_BRANDING_TEXT = 'Powered by Flyfish Viewer';
const DEFAULT_BRANDING_HREF = '';
const DEFAULT_BRANDING_TITLE = 'Flyfish Viewer';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const readJson = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const normalizeLicenseInput = (input: FileViewerBrandLicenseInput | undefined) => {
  const value = typeof input === 'string' ? readJson(input) : input;
  if (!isRecord(value)) {
    return null;
  }
  const certificateValue = 'certificate' in value ? value.certificate : value;
  const certificate = typeof certificateValue === 'string'
    ? readJson(certificateValue)
    : certificateValue;
  if (!isRecord(certificate)) {
    return null;
  }
  return {
    certificate,
    signature: typeof value.signature === 'string' ? value.signature.trim() : '',
  };
};

const getString = (record: Record<string, unknown>, key: string) => {
  const value = record[key];
  return typeof value === 'string' ? value.trim() : '';
};

const hasPermission = (record: Record<string, unknown>, permission: string) => {
  const permissions = record.permissions;
  return Array.isArray(permissions) && permissions.some(item => item === permission);
};

const isWithinValidTime = (record: Record<string, unknown>, now: number) => {
  const expiresAt = getString(record, 'expiresAt');
  if (!expiresAt) {
    return true;
  }
  const timestamp = Date.parse(expiresAt);
  return Number.isFinite(timestamp) && timestamp >= now;
};

export const isFileViewerBrandRemovalLicense = (
  input: FileViewerBrandLicenseInput | undefined,
  now = Date.now()
) => {
  const normalized = normalizeLicenseInput(input);
  if (!normalized || !normalized.signature) {
    return false;
  }
  const certificate = normalized.certificate;
  return getString(certificate, 'format') === FILE_VIEWER_BRAND_LICENSE_FORMAT
    && getString(certificate, 'product') === FILE_VIEWER_BRAND_LICENSE_PRODUCT
    && getString(certificate, 'project') === FILE_VIEWER_BRAND_LICENSE_PROJECT
    && getString(certificate, 'licenseKind') === FILE_VIEWER_BRAND_LICENSE_KIND
    && hasPermission(certificate, FILE_VIEWER_BRAND_LICENSE_PERMISSION)
    && isWithinValidTime(certificate, now);
};

const normalizeBrandingOptions = (
  branding?: boolean | FileViewerBrandingOptions
): FileViewerBrandingOptions | null => {
  if (branding === undefined || branding === false) {
    return null;
  }
  if (branding === true) {
    return { enabled: true };
  }
  return branding;
};

const resolvePositionStyle = (position: FileViewerBrandingOptions['position']) => {
  switch (position) {
    case 'bottom-left':
      return 'left:10px;bottom:10px;';
    case 'top-left':
      return 'left:10px;top:10px;';
    case 'top-right':
      return 'right:10px;top:10px;';
    case 'bottom-right':
    default:
      return 'right:10px;bottom:10px;';
  }
};

export const buildFileViewerBrandingInlineStyle = (
  branding?: boolean | FileViewerBrandingOptions
) => {
  const normalized = normalizeBrandingOptions(branding);
  if (!normalized) {
    return '';
  }
  return [
    'position:absolute',
    resolvePositionStyle(normalized.position),
    'z-index:30',
    'display:inline-flex',
    'align-items:center',
    'max-width:calc(100% - 20px)',
    'height:24px',
    'padding:0 9px',
    'border-radius:999px',
    'box-sizing:border-box',
    'background:rgba(15,23,42,0.68)',
    'color:#fff',
    'font:500 11px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    'text-decoration:none',
    'white-space:nowrap',
    'overflow:hidden',
    'text-overflow:ellipsis',
    'backdrop-filter:blur(8px)',
    'box-shadow:0 6px 18px rgba(15,23,42,0.18)',
  ].join(';');
};

export const resolveFileViewerBrandingPresentationState = (
  branding?: boolean | FileViewerBrandingOptions,
  now = Date.now()
): FileViewerBrandingPresentationState => {
  const normalized = normalizeBrandingOptions(branding);
  const licenseValid = !!normalized && isFileViewerBrandRemovalLicense(normalized.license, now);
  const visible = !!normalized && (normalized.enabled !== false || !licenseValid);

  return {
    visible,
    licenseValid,
    text: normalized?.text?.trim() || DEFAULT_BRANDING_TEXT,
    href: normalized?.href?.trim() || DEFAULT_BRANDING_HREF,
    title: normalized?.title?.trim() || DEFAULT_BRANDING_TITLE,
    inlineStyle: visible ? buildFileViewerBrandingInlineStyle(normalized || undefined) : '',
  };
};
