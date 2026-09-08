import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isAdminUserLike,
  resolveUserRoleForUserLike
} from '../utils/service-posts.ts';

const resolveAuthRole = (user) =>
  resolveUserRoleForUserLike(
    user
      ? {
          email: user.email,
          app_metadata: user.app_metadata
        }
      : null
  );

const hasAuthAdminAccess = (user) =>
  isAdminUserLike(
    user
      ? {
          email: user.email,
          app_metadata: user.app_metadata
        }
      : null
  );

test('configured owner email is an admin without trusting editable metadata', () => {
  const previousEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS;
  process.env.NEXT_PUBLIC_ADMIN_EMAILS = 'configured-owner@example.com';

  try {
    const user = {
      email: 'configured-owner@example.com',
      app_metadata: { role: 'user' },
      user_metadata: { role: 'user' }
    };

    assert.equal(resolveAuthRole(user), 'admin');
    assert.equal(hasAuthAdminAccess(user), true);
  } finally {
    if (previousEmails === undefined) {
      delete process.env.NEXT_PUBLIC_ADMIN_EMAILS;
    } else {
      process.env.NEXT_PUBLIC_ADMIN_EMAILS = previousEmails;
    }
  }
});

test('app metadata roles map to the canonical access policy', () => {
  for (const role of ['admin', 'sub_admin', 'manager']) {
    const user = { email: `${role}@example.com`, app_metadata: { role } };
    assert.equal(resolveAuthRole(user), role);
    assert.equal(hasAuthAdminAccess(user), true);
  }
});

test('ordinary and missing roles do not receive admin access', () => {
  assert.equal(
    resolveAuthRole({
      email: 'member@example.com',
      app_metadata: { role: 'user' }
    }),
    'user'
  );
  assert.equal(
    hasAuthAdminAccess({ email: 'member@example.com', app_metadata: null }),
    false
  );
  assert.equal(resolveAuthRole(null), 'user');
  assert.equal(hasAuthAdminAccess(null), false);
});

test('a forged user metadata admin role is rejected by the safe auth projection', () => {
  const forgedUser = {
    email: 'member@example.com',
    app_metadata: { role: 'user' },
    user_metadata: { role: 'admin' }
  };

  assert.equal(resolveAuthRole(forgedUser), 'user');
  assert.equal(hasAuthAdminAccess(forgedUser), false);
  assert.equal(isAdminUserLike(forgedUser), false);
  assert.equal(isAdminUserLike({ email: 'member@example.com', user_metadata: { role: 'admin' } }), false);
});
