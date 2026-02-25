import 'server-only';

import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

type R2Config = {
  endpoint: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
};

let r2Client: S3Client | null = null;

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

export async function signR2GetUrl(
  key: string,
  options?: { expiresIn?: number; bucketName?: string }
) {
  if (!key.trim()) {
    throw new Error('Missing R2 object key');
  }

  const config = getR2Config();
  const client = getR2Client();
  const command = new GetObjectCommand({
    Bucket: options?.bucketName?.trim() || config.bucketName,
    Key: key
  });

  return getSignedUrl(client, command, {
    expiresIn: clampTtl(options?.expiresIn, 60, 300, 180)
  });
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

export const getDefaultR2BucketName = () => getR2Config().bucketName;
