import 'server-only';

const normalizeText = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const toHost = (value: string) => {
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return '';
  }
};

const parseCsv = (value: string) =>
  value
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

const getTrustedProofHosts = () => {
  const hosts = new Set<string>();

  const supabaseHost = toHost(normalizeText(process.env.NEXT_PUBLIC_SUPABASE_URL));
  if (supabaseHost) hosts.add(supabaseHost);

  const customHosts = parseCsv(
    normalizeText(process.env.BANK_TRANSFER_PROOF_ALLOWED_HOSTS)
  );
  for (const host of customHosts) hosts.add(host);

  return hosts;
};

const hasTrustedPath = (pathname: string) =>
  pathname.includes('/bank-transfer-proofs/');

export const isTrustedBankTransferProofUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;

    const trustedHosts = getTrustedProofHosts();
    if (!trustedHosts.has(parsed.host.toLowerCase())) return false;

    return hasTrustedPath(parsed.pathname.toLowerCase());
  } catch {
    return false;
  }
};
