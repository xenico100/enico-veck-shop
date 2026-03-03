import 'server-only';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

type R2Config = {
  endpoint: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
};

type SignedGetUrlCacheEntry = {
  url: string;
  expiresAt: number;
};

let r2Client: S3Client | null = null;
const signedGetUrlCache = new Map<string, SignedGetUrlCacheEntry>();
const SIGNED_GET_URL_CACHE_LIMIT = 800;
const SIGNED_GET_URL_MIN_VALID_MS = 15 * 1000;

const getR2Config = (): R2Config => {
  const endpoint = process.env.R2_ENDPOINT?.trim() || '';
  const bucketName = process.env.R2_BUCKET_NAME?.trim() || '';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() || '';
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() || '';

  if (!endpoint) {
    throw new Error('Missing R2_ENDPOINT');
  }

  if (!bucketName) {
    throw new Error('Missing R2_BUCKET_NAME');
  }

  if (!accessKeyId) {
    throw new Error('Missing R2_ACCESS_KEY_ID');
  }

  if (!secretAccessKey) {
    throw new Error('Missing R2_SECRET_ACCESS_KEY');
  }

  return {
    endpoint,
    bucketName,
    accessKeyId,
    secretAccessKey
  };
};

const getR2Client = () => {
  if (r2Client) return r2Client;

  const { endpoint, accessKeyId, secretAccessKey } = getR2Config();
  r2Client = new S3Client({
    region: 'auto',
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });

  return r2Client;
};

const clampTtl = (value: number | undefined, min: number, max: number, fallback: number) => {
  const numeric = Number(value ?? fallback);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(numeric)));
};

const buildSignedGetUrlCacheKey = (bucketName: string, key: string, expiresIn: number) =>
  `${bucketName}::${key}::${expiresIn}`;

const compactSignedGetUrlCache = () => {
  if (signedGetUrlCache.size < SIGNED_GET_URL_CACHE_LIMIT) return;

  const now = Date.now();
  const expiredKeys: string[] = [];
  signedGetUrlCache.forEach((entry, cacheKey) => {
    if (entry.expiresAt <= now) {
      expiredKeys.push(cacheKey);
    }
  });
  expiredKeys.forEach((cacheKey) => {
    signedGetUrlCache.delete(cacheKey);
  });

  if (signedGetUrlCache.size < SIGNED_GET_URL_CACHE_LIMIT) return;

  const overflow = signedGetUrlCache.size - SIGNED_GET_URL_CACHE_LIMIT + 1;
  const keysToDelete: string[] = [];
  signedGetUrlCache.forEach((_entry, cacheKey) => {
    if (keysToDelete.length < overflow) {
      keysToDelete.push(cacheKey);
    }
  });
  keysToDelete.forEach((cacheKey) => {
    signedGetUrlCache.delete(cacheKey);
  });
};

export async function signR2GetUrl(
  key: string,
  options?: { expiresIn?: number; bucketName?: string }
) {
  if (!key.trim()) {
    throw new Error('Missing R2 object key');
  }

  const config = getR2Config();
  const bucketName = options?.bucketName?.trim() || config.bucketName;
  const expiresIn = clampTtl(options?.expiresIn, 60, 300, 180);
  const cacheKey = buildSignedGetUrlCacheKey(bucketName, key, expiresIn);
  const cached = signedGetUrlCache.get(cacheKey);
  const now = Date.now();
  if (cached && cached.expiresAt - now > SIGNED_GET_URL_MIN_VALID_MS) {
    return cached.url;
  }

  const client = getR2Client();
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key
  });

  const signedUrl = await getSignedUrl(client, command, { expiresIn });
  compactSignedGetUrlCache();
  signedGetUrlCache.set(cacheKey, {
    url: signedUrl,
    expiresAt: now + expiresIn * 1000
  });

  return signedUrl;
}

export async function signR2PutUrl(
  key: string,
  options: {
    contentType: string;
    expiresIn?: number;
    bucketName?: string;
  }
) {
  if (!key.trim()) {
    throw new Error('Missing R2 object key');
  }

  const contentType = options.contentType?.trim();
  if (!contentType) {
    throw new Error('Missing contentType for R2 PUT presign');
  }

  const config = getR2Config();
  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: options.bucketName?.trim() || config.bucketName,
    Key: key,
    ContentType: contentType
  });

  return getSignedUrl(client, command, {
    expiresIn: clampTtl(options.expiresIn, 60, 300, 300)
  });
}

export async function deleteR2Object(
  key: string,
  options?: { bucketName?: string }
) {
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    throw new Error('Missing R2 object key');
  }

  const config = getR2Config();
  const client = getR2Client();
  const command = new DeleteObjectCommand({
    Bucket: options?.bucketName?.trim() || config.bucketName,
    Key: normalizedKey
  });

  await client.send(command);
}

export async function deleteR2Objects(
  objects: Array<{ key: string; bucketName?: string | null }>
) {
  const deleted: Array<{ key: string; bucketName: string }> = [];
  const failed: Array<{
    key: string;
    bucketName: string | null;
    reason: string;
  }> = [];

  for (const object of objects) {
    const key = object.key.trim();
    const bucketName = object.bucketName?.trim() || null;
    if (!key) continue;

    try {
      await deleteR2Object(key, { bucketName: bucketName || undefined });
      deleted.push({ key, bucketName: bucketName || getR2Config().bucketName });
    } catch (error) {
      failed.push({
        key,
        bucketName,
        reason: error instanceof Error ? error.message : 'Unknown R2 delete error'
      });
    }
  }

  return {
    deleted,
    failed
  };
}

export const getDefaultR2BucketName = () => getR2Config().bucketName;
