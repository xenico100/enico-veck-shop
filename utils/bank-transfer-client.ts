export const MAX_BANK_TRANSFER_PROOF_BYTES = 8 * 1024 * 1024;

const ALLOWED_PROOF_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif'
]);

const normalizeText = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const isAllowedProofMime = (mimeType: string) => {
  if (!mimeType) return false;
  if (ALLOWED_PROOF_IMAGE_TYPES.has(mimeType)) return true;
  return mimeType.startsWith('image/');
};

export const validateBankTransferProofFile = (
  file: File | null | undefined
) => {
  if (!file) {
    return { ok: false as const, message: '이체인증 이미지를 첨부해 주세요.' };
  }
  if (file.size <= 0) {
    return { ok: false as const, message: '첨부한 파일이 비어 있습니다.' };
  }
  if (file.size > MAX_BANK_TRANSFER_PROOF_BYTES) {
    return {
      ok: false as const,
      message: '이체인증 이미지는 최대 8MB까지 업로드할 수 있습니다.'
    };
  }

  const mimeType = normalizeText(file.type).toLowerCase();
  if (!isAllowedProofMime(mimeType)) {
    return { ok: false as const, message: '이미지 파일만 첨부할 수 있습니다.' };
  }

  return { ok: true as const };
};

export type BankTransferProofUploadResult = {
  url: string;
  path: string | null;
  bucket: string | null;
};

export async function uploadBankTransferProofFile(
  file: File
): Promise<BankTransferProofUploadResult> {
  const validated = validateBankTransferProofFile(file);
  if (!validated.ok) {
    throw new Error(validated.message);
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/orders/bank-transfer/proof-upload', {
    method: 'POST',
    body: formData
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload?.message || '이체인증 이미지 업로드에 실패했습니다.'
    );
  }

  const url = normalizeText(payload?.data?.url);
  if (!url) {
    throw new Error('업로드된 이미지 URL을 확인할 수 없습니다.');
  }

  return {
    url,
    path: normalizeText(payload?.data?.path) || null,
    bucket: normalizeText(payload?.data?.bucket) || null
  };
}
