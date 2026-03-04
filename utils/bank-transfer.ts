type BankTransferInfo = {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  notice: string;
};

const normalizeText = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const getFirstEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = normalizeText(process.env[key]);
    if (value) return value;
  }
  return '';
};

const DEFAULT_NOTICE =
  '입금자명을 주문자명과 동일하게 입력해 주세요. 입금 확인 후 관리자 승인으로 처리됩니다.';
const DEFAULT_BANK_NAME = '카카오뱅크';
const DEFAULT_ACCOUNT_NUMBER = '3333-09-2834969';
const DEFAULT_ACCOUNT_HOLDER = '백형석';

export const getBankTransferInfo = (): BankTransferInfo => ({
  bankName:
    getFirstEnv('BANK_TRANSFER_BANK', 'NEXT_PUBLIC_BANK_TRANSFER_BANK') ||
    DEFAULT_BANK_NAME,
  accountNumber:
    getFirstEnv(
      'BANK_TRANSFER_ACCOUNT_NUMBER',
      'NEXT_PUBLIC_BANK_TRANSFER_ACCOUNT_NUMBER'
    ) || DEFAULT_ACCOUNT_NUMBER,
  accountHolder:
    getFirstEnv(
      'BANK_TRANSFER_ACCOUNT_HOLDER',
      'NEXT_PUBLIC_BANK_TRANSFER_ACCOUNT_HOLDER'
    ) || DEFAULT_ACCOUNT_HOLDER,
  notice:
    getFirstEnv('BANK_TRANSFER_NOTICE', 'NEXT_PUBLIC_BANK_TRANSFER_NOTICE') ||
    DEFAULT_NOTICE
});

export const hasBankTransferAccountConfigured = (info: BankTransferInfo) =>
  Boolean(
    normalizeText(info.bankName) &&
    normalizeText(info.accountNumber) &&
    normalizeText(info.accountHolder)
  );

export type { BankTransferInfo };
