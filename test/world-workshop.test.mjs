import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test, { after } from 'node:test';
import {
  decideWorldOwnerAccess,
  parseWorldOwnerUserId
} from '../utils/world-owner-policy.ts';

const OWNER = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const PRIVATE_LINK =
  'https://drive.google.com/drive/folders/test_private_folder';
const createClientKey = Symbol.for('world-workshop:test:createClient');

// Exercise the real route and server module without loading Next's cookie store,
// contacting Supabase, reading local credentials, or creating a development server.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'server-only') {
      return { url: 'data:text/javascript,export {}', shortCircuit: true };
    }
    if (specifier === '@/utils/supabase/server') {
      return {
        url:
          'data:text/javascript,' +
          encodeURIComponent(
            "export const createClient = () => globalThis[Symbol.for('world-workshop:test:createClient')]();"
          ),
        shortCircuit: true
      };
    }
    if (specifier.startsWith('@/utils/world-')) {
      return {
        url: new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href,
        shortCircuit: true
      };
    }
    return nextResolve(specifier, context);
  }
});

const { GET } = await import('../app/api/world/workshop/route.ts');
const { validateWorldWorkshopDriveUrl } =
  await import('../utils/world-workshop-server.ts');
after(() => hooks.deregister());

async function requestWorkshop({
  user = null,
  error = null,
  ownerId = OWNER,
  driveUrl = PRIVATE_LINK,
  authThrows = false,
  supabaseUrl = 'https://test-project.supabase.co'
} = {}) {
  const env = {
    WORLD_OWNER_USER_ID: ownerId,
    WORLD_WORKSHOP_DRIVE_URL: driveUrl,
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-publishable-placeholder'
  };
  const previous = new Map(
    Object.keys(env).map((key) => [key, process.env[key]])
  );
  let authCalls = 0;
  globalThis[createClientKey] = () => ({
    auth: {
      getUser: async () => {
        authCalls += 1;
        if (authThrows) throw new Error('private Auth diagnostics');
        return { data: { user }, error };
      }
    }
  });

  try {
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined || value === null) delete process.env[key];
      else process.env[key] = value;
    }
    const response = await GET();
    const body = await response.json();
    return { response, body, authCalls };
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    delete globalThis[createClientKey];
  }
}

function assertPrivateResponse(response) {
  assert.match(response.headers.get('Cache-Control'), /private/);
  assert.match(response.headers.get('Cache-Control'), /no-store/);
  assert.equal(response.headers.get('CDN-Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Vercel-CDN-Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Vary'), 'Cookie');
}

function assertDenied(result, status, code) {
  assert.equal(result.response.status, status);
  assert.equal(result.body.code, code);
  assert.equal('data' in result.body, false);
  const serialized = JSON.stringify(result.body);
  assert.equal(serialized.includes(OWNER), false);
  assert.equal(serialized.includes('drive.google.com'), false);
  assert.equal(serialized.includes('private'), false);
  assertPrivateResponse(result.response);
}

test('owner configuration requires one complete UUID and rejects empty allowlists', () => {
  assert.equal(parseWorldOwnerUserId(` ${OWNER.toUpperCase()} `), OWNER);
  for (const value of [
    undefined,
    null,
    '',
    '*',
    'owner@example.com',
    OWNER + ',' + OTHER,
    1
  ]) {
    assert.equal(parseWorldOwnerUserId(value), null);
    assert.deepEqual(
      decideWorldOwnerAccess({ id: OWNER, is_anonymous: false }, value),
      {
        allowed: false,
        reason: 'unavailable'
      }
    );
  }
});

test('pure policy denies anonymous, missing anonymity claims, managers and editable metadata', () => {
  for (const user of [null, { id: OWNER }, { id: OWNER, is_anonymous: true }]) {
    assert.deepEqual(decideWorldOwnerAccess(user, OWNER), {
      allowed: false,
      reason: 'unauthenticated'
    });
  }
  for (const role of ['manager', 'admin', 'owner']) {
    assert.deepEqual(
      decideWorldOwnerAccess(
        {
          id: OTHER,
          is_anonymous: false,
          app_metadata: { role },
          user_metadata: { role, owner_id: OWNER, is_owner: true }
        },
        OWNER
      ),
      { allowed: false, reason: 'forbidden' }
    );
  }
  assert.deepEqual(
    decideWorldOwnerAccess({ id: OWNER, is_anonymous: false }, OWNER),
    {
      allowed: true
    }
  );
});

test('GET denies unauthenticated and Supabase anonymous sessions before returning any data', async () => {
  for (const user of [null, { id: OWNER }, { id: OWNER, is_anonymous: true }]) {
    const result = await requestWorkshop({ user });
    assertDenied(result, 401, 'NOT_AUTHENTICATED');
    assert.equal(result.authCalls, 1);
  }
  assertDenied(
    await requestWorkshop({ error: { name: 'AuthSessionMissingError' } }),
    401,
    'NOT_AUTHENTICATED'
  );
  assertDenied(
    await requestWorkshop({ error: { status: 401 } }),
    401,
    'NOT_AUTHENTICATED'
  );
});

test('GET denies a signed-in manager and forged metadata owner', async () => {
  const result = await requestWorkshop({
    user: {
      id: OTHER,
      is_anonymous: false,
      app_metadata: { role: 'manager' },
      user_metadata: { role: 'owner', id: OWNER, is_owner: true }
    }
  });
  assertDenied(result, 403, 'OWNER_ONLY');
  assert.equal(result.authCalls, 1);
});

test('GET returns sample states and optional Drive link only for the verified owner', async () => {
  const { response, body, authCalls } = await requestWorkshop({
    user: { id: OWNER, is_anonymous: false },
    driveUrl: `${PRIVATE_LINK}?usp=drive_link#private-fragment`
  });
  assert.equal(response.status, 200);
  assert.equal(authCalls, 1);
  assert.equal(body.data.isSample, true);
  assert.match(body.data.notice, /샘플/);
  assert.equal(body.data.latestPreview.url, '/world');
  assert.match(body.data.version, /prototype/);
  assert.deepEqual(
    body.data.stages.map((stage) => stage.id),
    ['making', 'backed-up', 'restore-verified']
  );
  assert.ok(
    body.data.stages.every((stage) => stage.actualStatus === 'unknown')
  );
  assert.equal(body.data.lastVerifiedAt, null);
  assert.equal(body.data.driveUrl, PRIVATE_LINK);
  assert.equal(JSON.stringify(body).includes(OWNER), false);
  assertPrivateResponse(response);
});

test('missing or invalid configuration safely disables the endpoint without consulting Auth', async () => {
  for (const ownerId of [null, '', 'not-a-uuid', `${OWNER},${OTHER}`]) {
    const result = await requestWorkshop({
      ownerId,
      user: { id: OWNER, is_anonymous: false }
    });
    assertDenied(result, 503, 'WORKSHOP_UNAVAILABLE');
    assert.equal(result.authCalls, 0);
  }
  const result = await requestWorkshop({ supabaseUrl: null });
  assertDenied(result, 503, 'WORKSHOP_UNAVAILABLE');
  assert.equal(result.authCalls, 0);
});

test('Auth outages and thrown errors never return diagnostics or private configuration', async () => {
  for (const input of [
    { authThrows: true },
    {
      error: {
        name: 'AuthRetryableFetchError',
        status: 503,
        message: PRIVATE_LINK
      }
    }
  ]) {
    assertDenied(await requestWorkshop(input), 503, 'WORKSHOP_UNAVAILABLE');
  }
});

test('Drive links accept only HTTPS Google Drive folder/file paths and omit query data', async () => {
  assert.equal(validateWorldWorkshopDriveUrl(PRIVATE_LINK), PRIVATE_LINK);
  assert.equal(
    validateWorldWorkshopDriveUrl(
      'https://drive.google.com/file/d/test_file/view?usp=sharing'
    ),
    'https://drive.google.com/file/d/test_file/view'
  );
  for (const value of [
    null,
    '',
    'http://drive.google.com/drive/folders/test',
    'https://drive.google.com.evil.example/drive/folders/test',
    'https://drive.google.com@evil.example/drive/folders/test',
    'https://user:secret@drive.google.com/drive/folders/test',
    'https://drive.google.com:444/drive/folders/test',
    'https://drive.google.com/open?id=test',
    'https://evil.example/drive/folders/test',
    'javascript:alert(1)'
  ]) {
    assert.equal(validateWorldWorkshopDriveUrl(value), null);
  }
  const result = await requestWorkshop({
    user: { id: OWNER, is_anonymous: false },
    driveUrl: 'https://evil.example/drive/folders/test'
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.data.driveUrl, null);
});
