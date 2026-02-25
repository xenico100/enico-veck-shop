import 'server-only';

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

type R2Config = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

let r2Client: S3Client | null = null;

const getR2Config = (): R2Config => {
  const endpoint =
    process.env.R2_ENDPOINT?.trim() ||
    (process.env.R2_ACCOUNT_ID?.trim()
      ? `https://${process.env.R2_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com`
      : '');
  const bucket = process.env.R2_BUCKET?.trim() || '';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() || '';
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() || '';

  if (!endpoint) {
    throw new Error('Missing R2_ENDPOINT');
  }

  if (!bucket) {
    throw new Error('Missing R2_BUCKET');
  }

  if (!accessKeyId) {
    throw new Error('Missing R2_ACCESS_KEY_ID');
  }

  if (!secretAccessKey) {
    throw new Error('Missing R2_SECRET_ACCESS_KEY');
  }

  return {
    endpoint,
    bucket,
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

const clampTtl = (value?: number) => {
  const numeric = Number(value ?? 180);
  if (!Number.isFinite(numeric)) return 180;
  return Math.min(300, Math.max(60, Math.floor(numeric)));
};

export async function signR2GetUrl(
  key: string,
  options?: { expiresIn?: number; bucket?: string }
) {
  if (!key.trim()) {
    throw new Error('Missing R2 object key');
  }

  const config = getR2Config();
  const client = getR2Client();
  const command = new GetObjectCommand({
    Bucket: options?.bucket?.trim() || config.bucket,
    Key: key
  });

  return getSignedUrl(client, command, { expiresIn: clampTtl(options?.expiresIn) });
}

export const getDefaultR2Bucket = () => getR2Config().bucket;

