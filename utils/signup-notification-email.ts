import type { SignupRecord } from './signup-webhook';

type Config = { to: string; from: string; resendApiKey: string; relaySecret?: string };

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

export function buildSignupNotificationEmail(user: SignupRecord, config: Pick<Config, 'to' | 'from'>) {
  const text = [
    '몽상인에 신규 회원이 가입했습니다.',
    `회원 ID: ${user.id}`,
    `가입 시각: ${user.created_at}`,
    '',
    '회원 정보 확인: https://enico-mongsangin-admin.vercel.app/?site=mongsangin&view=members'
  ].join('\n');
  return {
    from: config.from,
    to: [config.to],
    subject: '[몽상인] 신규 회원가입 알림',
    text,
    html: `<div lang="ko" style="font-family:Arial,sans-serif;line-height:1.6"><h2>신규 회원가입</h2><p style="white-space:pre-wrap">${escapeHtml(text)}</p></div>`
  };
}

export async function sendSignupNotificationEmail(
  user: SignupRecord,
  config: Config,
  fetcher: typeof fetch = fetch
) {
  if (!config.resendApiKey) {
    // Only the already-validated server-side signup processor can reach this
    // fixed relay. Never transmit either storefront's Supabase/Resend key.
    if (!config.relaySecret || Buffer.byteLength(config.relaySecret) < 48) return { sent: false };
    const response = await fetcher('https://enicoveck.com/api/auth/signup-relay', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15_000),
      headers: { 'Content-Type': 'application/json', 'x-signup-relay-secret': config.relaySecret },
      body: JSON.stringify({ site: 'mongsangin', userId: user.id, createdAt: user.created_at })
    });
    if (!response.ok) return { sent: false };
    const receipt = await response.json().catch(() => null) as { id?: unknown } | null;
    return { sent: Boolean(receipt && typeof receipt.id === 'string' && receipt.id.trim()) };
  }
  if (!config.to || !config.from) return { sent: false };
  const response = await fetcher('https://api.resend.com/emails', {
    method: 'POST',
    redirect: 'error',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `mongsangin-signup/${user.id}`
    },
    body: JSON.stringify(buildSignupNotificationEmail(user, config)),
    signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) return { sent: false };
  const receipt = await response.json().catch(() => null) as { id?: unknown } | null;
  // A 2xx response alone is not proof that the provider accepted an email.
  // Preserve retryability unless Resend returns the actual message receipt.
  return { sent: Boolean(receipt && typeof receipt.id === 'string' && receipt.id.trim()) };
}
