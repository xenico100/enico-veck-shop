import assert from 'node:assert/strict';
import test from 'node:test';

import { loadAdminMemberProfiles } from '../utils/admin-member-profiles.ts';

const createClient = (results) => {
  const selections = [];
  return {
    selections,
    from(table) {
      assert.equal(table, 'users');
      return {
        async select(columns) {
          selections.push(columns);
          assert.ok(results.length, 'unexpected profile query');
          return results.shift();
        }
      };
    }
  };
};

const profile = { id: 'test-member', phone: '010-0000-0000', address: '테스트 주소' };

test('missing name column preserves stored phone and address', async () => {
  const client = createClient([
    { data: null, error: { code: '42703', message: 'column users.name does not exist' } },
    { data: [profile], error: null }
  ]);
  const result = await loadAdminMemberProfiles(client);
  assert.deepEqual(result.data, [profile]);
  assert.deepEqual(result.missingColumns, ['name']);
  assert.deepEqual(client.selections, ['id,full_name,name,phone,address', 'id,full_name,phone,address']);
});

test('missing phone keeps address and missing address keeps phone', async () => {
  for (const missing of ['phone', 'address']) {
    const row = { ...profile };
    delete row[missing];
    const client = createClient([
      { data: null, error: { code: 'PGRST204', message: `Could not find the '${missing}' column of 'users' in the schema cache` } },
      { data: [row], error: null }
    ]);
    const result = await loadAdminMemberProfiles(client);
    assert.deepEqual(result.data, [row]);
    assert.deepEqual(result.missingColumns, [missing]);
    assert.ok(!client.selections[1].split(',').includes(missing));
  }
});

test('multiple missing optional columns are removed individually', async () => {
  const client = createClient([
    { data: null, error: { code: '42703', message: 'column users.name does not exist' } },
    { data: null, error: { code: '42703', message: 'column users.phone does not exist' } },
    { data: [{ id: profile.id, address: profile.address }], error: null }
  ]);
  const result = await loadAdminMemberProfiles(client);
  assert.equal(result.data[0].address, profile.address);
  assert.deepEqual(result.missingColumns, ['name', 'phone']);
  assert.equal(client.selections[2], 'id,full_name,address');
});

test('permission, network, mandatory id and unrelated schema errors stop immediately', async () => {
  for (const error of [
    { code: '42501', message: 'permission denied for table users' },
    { code: '08006', message: 'connection failed' },
    { code: '42703', message: 'column users.id does not exist' },
    { code: '42703', message: 'column another_table.phone does not exist' },
    { code: '42703', message: 'column users.phone_hash does not exist' }
  ]) {
    const client = createClient([{ data: null, error }]);
    const result = await loadAdminMemberProfiles(client);
    assert.equal(result.error, error);
    assert.deepEqual(result.data, []);
    assert.equal(client.selections.length, 1);
  }
});
