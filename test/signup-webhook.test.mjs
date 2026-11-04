import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { registerHooks } from 'node:module';

const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export {}', shortCircuit: true };
  return nextResolve(specifier === './signup-eligibility' ? `${specifier}.ts` : specifier, context);
} });
after(() => hooks.deregister());
const { createSignupWebhookHandler, SIGNUP_ALERT_MARKER } = await import('../utils/signup-webhook.ts');
const { sendSignupNotificationEmail } = await import('../utils/signup-notification-email.ts');
const { getAdminEmailConfig, getAdminSignupEmailConfig } = await import('../utils/admin-alert-config.ts');

const SECRET = 'test-only-webhook-secret-with-32-characters';
const USER_ID = '11111111-2222-4333-8444-555555555555';
const NOW = Date.parse('2026-11-04T10:00:00Z');
const EVENT = { type: 'INSERT', schema: 'auth', table: 'users', record: { id: USER_ID } };

const member = (overrides = {}) => ({
  id: USER_ID,
  email: 'new-member@example.com',
  is_anonymous: false,
  created_at: '2026-11-04T09:59:00Z',
  app_metadata: {},
  ...overrides
});

const request = (event = EVENT, secret = SECRET, headers = {}) => new Request(
  'https://app.example.com/api/auth/signup-webhook',
  { method: 'POST', body: typeof event === 'string' ? event : JSON.stringify(event),
    headers: { 'x-signup-webhook-secret': secret, ...headers } }
);

const setup = (options = {}) => {
  const calls = { lookups: [], notifications: [], markers: [] };
  const user = options.user === undefined ? member() : options.user;
  const handler = createSignupWebhookHandler({
    secret: () => options.secret ?? SECRET,
    enabledAt: () => options.enabledAt,
    getUser: async (id) => { calls.lookups.push(id); return user; },
    notify: async (record) => {
      calls.notifications.push(record);
      return { sent: options.sent ?? true };
    },
    markNotified: async (id, at) => {
      calls.markers.push([id, at]);
      if (options.markerFails) throw new Error('mock marker failure');
      user.app_metadata = { ...user.app_metadata, [SIGNUP_ALERT_MARKER]: at };
    },
    now: () => NOW
  });
  return { handler, calls };
};

test('successful signup is read from Auth and marked once; repeated event does not send', async () => {
  const { handler, calls } = setup();
  const first = await handler(request());
  assert.equal(first.status, 200);
  assert.deepEqual(await first.json(), { sent: true });
  assert.deepEqual(calls.lookups, [USER_ID]);
  assert.equal(calls.notifications.length, 1);
  assert.deepEqual(calls.markers, [[USER_ID, new Date(NOW).toISOString()]]);
  const again = await handler(request());
  assert.deepEqual(await again.json(), { skipped: 'already_notified' });
  assert.equal(calls.notifications.length, 1);
});

test('missing configuration and incorrect secret cannot query or send', async () => {
  for (const [config, supplied, status] of [
    [{ secret: 'short' }, SECRET, 503],
    [{}, '', 401],
    [{}, 'different-value', 401],
    [{}, 'x'.repeat(SECRET.length), 401]
  ]) {
    const { handler, calls } = setup(config);
    assert.equal((await handler(request(EVENT, supplied))).status, status);
    assert.equal(calls.lookups.length, 0);
    assert.equal(calls.notifications.length, 0);
  }
});

test('only auth.users INSERT and a valid UUID are accepted', async () => {
  for (const event of [
    null, [], 'not json', { ...EVENT, type: 'UPDATE' },
    { ...EVENT, schema: 'public' }, { ...EVENT, table: 'profiles' },
    { ...EVENT, record: {} }, { ...EVENT, record: { id: 'not-a-user-id' } }
  ]) {
    const { handler, calls } = setup();
    assert.equal((await handler(request(event))).status, 400);
    assert.equal(calls.lookups.length, 0);
  }
});

test('oversized streams and declared bodies are rejected before Auth lookup', async () => {
  for (const headers of [{}, { 'content-length': '17000' }]) {
    const { handler, calls } = setup();
    assert.equal((await handler(request('x'.repeat(17000), SECRET, headers))).status, 413);
    assert.equal(calls.lookups.length, 0);
  }
});

test('anonymous and email-less canonical accounts never send, regardless of forged event data', async () => {
  for (const user of [
    member({ is_anonymous: true }), member({ is_anonymous: undefined, app_metadata: { provider: 'anonymous' } }),
    member({ email: null }), member({ email: '   ' }), member({ email: 'invalid' })
  ]) {
    const { handler, calls } = setup({ user });
    const forged = { ...EVENT, record: { ...EVENT.record, email: 'forged@example.com', is_anonymous: false } };
    const response = await handler(request(forged));
    assert.deepEqual(await response.json(), { skipped: 'not_registered_member' });
    assert.equal(calls.notifications.length, 0);
  }
});

test('canonical registered flag overrides stale anonymous provider metadata', async () => {
  const { handler, calls } = setup({ user: member({ is_anonymous: false, app_metadata: { provider: 'anonymous', providers: ['anonymous', 'email'] } }) });
  assert.equal((await handler(request())).status, 200);
  assert.equal(calls.notifications.length, 1);
});

test('configured cutoff prevents old-login backfill and malformed cutoff fails closed', async () => {
  const before = setup({ enabledAt: new Date(NOW).toISOString() });
  assert.deepEqual(await (await before.handler(request())).json(), { skipped: 'not_enabled_yet' });
  assert.equal(before.calls.notifications.length, 0);
  for (const enabledAt of ['', 'not-a-date', '2026-02-30T10:00:00Z']) {
    const invalid = setup({ enabledAt });
    assert.equal((await invalid.handler(request())).status, 503);
    assert.equal(invalid.calls.lookups.length, 0); assert.equal(invalid.calls.notifications.length, 0);
  }
});

test('missing accounts and mismatched canonical IDs do not send', async () => {
  for (const user of [null, member({ id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' })]) {
    const { handler, calls } = setup({ user });
    const response = await handler(request());
    assert.deepEqual(await response.json(), { skipped: 'missing_user' });
    assert.equal(calls.notifications.length, 0);
  }
});

test('old, invalid and future creation timestamps do not become new signup alerts', async () => {
  for (const created_at of ['2026-11-03T09:59:59Z', 'not-a-date', '2026-11-04T10:00:01Z']) {
    const { handler, calls } = setup({ user: member({ created_at }) });
    const response = await handler(request());
    assert.deepEqual(await response.json(), { skipped: 'not_new_signup' });
    assert.equal(calls.notifications.length, 0);
  }
});

test('failed provider sends do not mark the user as notified', async () => {
  const { handler, calls } = setup({ sent: false });
  assert.equal((await handler(request())).status, 503);
  assert.equal(calls.markers.length, 0);
});

test('marker failures ask the hook to retry without returning private provider details', async () => {
  const { handler } = setup({ markerFails: true });
  const response = await handler(request());
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'notification_unavailable' });
});

test('mail uses the configured receiver and a stable service-specific idempotency key', async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push([url, init]);
    return new Response('{"id":"fixture-message-id"}', { status: 200 });
  };
  const config = { to: 'owner@example.com', from: 'alerts@example.com', resendApiKey: 'test-only-key' };
  for (let i = 0; i < 2; i++) {
    assert.deepEqual(await sendSignupNotificationEmail(member(), config, fetcher), { sent: true });
  }
  assert.equal(calls.length, 2);
  for (const [url, init] of calls) {
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(init.redirect, 'error');
    assert.equal(init.headers['Idempotency-Key'], `mongsangin-signup/${USER_ID}`);
    const payload = JSON.parse(init.body);
    assert.deepEqual(payload.to, ['owner@example.com']);
    assert.equal(payload.from, 'alerts@example.com');
    assert.ok(!payload.text.includes('new-member@example.com'));
    assert.ok(payload.text.includes(USER_ID));
    assert.ok(payload.text.includes('site=mongsangin&view=members'));
  }
});

test('email edits do not change the retry payload under the same signup idempotency key', async () => {
  const calls = [];
  const fetcher = async (_url, init) => {
    calls.push(init);
    return new Response('{"id":"stable-email-receipt"}', { status: 200 });
  };
  const config = { to: 'owner@example.com', from: 'alerts@example.com', resendApiKey: 'test-only-key' };
  await sendSignupNotificationEmail(member(), config, fetcher);
  await sendSignupNotificationEmail(member({ email: 'changed-member@example.com' }), config, fetcher);
  assert.equal(calls[0].headers['Idempotency-Key'], calls[1].headers['Idempotency-Key']);
  assert.equal(calls[0].body, calls[1].body);
});

test('malformed success receipts never mark a signup as notified', async () => {
  for (const body of ['{}', '{"id":null}', '{"id":" "}', 'not-json']) {
    let markers = 0;
    const handler = createSignupWebhookHandler({
      secret: () => SECRET,
      getUser: async () => member(),
      notify: user => sendSignupNotificationEmail(user,
        { to: 'owner@example.com', from: 'alerts@example.com', resendApiKey: 'test-only-key' },
        async () => new Response(body, { status: 200 })),
      markNotified: async () => { markers++; },
      now: () => NOW
    });
    assert.equal((await handler(request())).status, 503);
    assert.equal(markers, 0);
  }
});

test('unconfigured mail does not call a provider and non-OK response is a failure', async () => {
  let sends = 0;
  const fetcher = async () => { sends++; return new Response('{}', { status: 429 }); };
  const config = { to: 'owner@example.com', from: 'alerts@example.com', resendApiKey: '' };
  assert.deepEqual(await sendSignupNotificationEmail(member(), config, fetcher), { sent: false });
  assert.equal(sends, 0);
  assert.deepEqual(await sendSignupNotificationEmail(member(), { ...config, resendApiKey: 'test-key' }, fetcher), { sent: false });
  assert.equal(sends, 1);
});

test('dedicated signup credentials override only signup mail while sales settings stay unchanged', () => {
  const values = {
    RESEND_API_KEY: 'fixture-sales-key', SALES_ALERT_FROM_EMAIL: 'sales@example.com', SALES_ALERT_TO_EMAIL: 'sales-owner@example.com',
    SIGNUP_NOTIFICATION_RESEND_API_KEY: 'fixture-signup-only-key', SIGNUP_NOTIFICATION_FROM_EMAIL: 'signup@example.com', SIGNUP_NOTIFICATION_EMAIL: 'signup-owner@example.com'
  };
  const saved = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  try {
    Object.assign(process.env, values);
    assert.deepEqual(getAdminSignupEmailConfig(), { resendApiKey: 'fixture-signup-only-key', from: 'signup@example.com', to: 'signup-owner@example.com' });
    assert.deepEqual(getAdminEmailConfig(), { resendApiKey: 'fixture-sales-key', from: 'sales@example.com', to: 'sales-owner@example.com' });
    delete process.env.SIGNUP_NOTIFICATION_RESEND_API_KEY;
    delete process.env.SIGNUP_NOTIFICATION_FROM_EMAIL;
    delete process.env.SIGNUP_NOTIFICATION_EMAIL;
    assert.deepEqual(getAdminSignupEmailConfig(), getAdminEmailConfig());
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
