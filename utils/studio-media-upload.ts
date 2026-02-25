import 'server-only';

import { randomUUID } from 'crypto';

export const MAX_STUDIO_MEDIA_BYTES = 2 * 1024 * 1024 * 1024; // 2GB

const STUDIO_POST_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isValidStudioPostId = (value: string) =>
  STUDIO_POST_ID_REGEX.test(value.trim());

export const normalizeStudioMediaKind = (value: unknown): 'image' | 'video' | null => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (normalized === 'image' || normalized === 'video') return normalized;
  return null;
};

export const validateStudioMediaMime = (kind: 'image' | 'video', mime: string) => {
  const normalized = mime.trim().toLowerCase();
  if (!normalized) return false;
  if (kind === 'image') return normalized.startsWith('image/');
  return normalized.startsWith('video/');
};

export const normalizeBytes = (value: unknown) => {
  const numeric = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.floor(numeric);
};

export const isWithinStudioMediaSizeLimit = (bytes: number) =>
  bytes > 0 && bytes <= MAX_STUDIO_MEDIA_BYTES;

export const sanitizeUploadFilename = (filename: string) => {
  const trimmed = filename.trim();
  const normalized = trimmed
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_\.]+|[_\.]+$/g, '');

  return (normalized || 'file').slice(0, 120);
};

export const buildStudioR2Key = (studioPostId: string, filename: string) => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const safeFilename = sanitizeUploadFilename(filename);

  return `studio/${studioPostId}/${year}-${month}/${randomUUID()}_${safeFilename}`;
};

export const isAllowedStudioR2Key = (studioPostId: string, r2Key: string) =>
  r2Key.startsWith(`studio/${studioPostId}/`);

