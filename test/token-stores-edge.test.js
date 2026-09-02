import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MemoryTokenStore,
  CloudflareKvTokenStore,
  DynamoDbTokenStore,
} from '../index.js';
import { normalizeTokenRecord } from '../src/token-stores/token-record.js';

const NOW = 1_700_000_000_000;

for (const [name, value] of [
  ['null records', null],
  ['empty access tokens', { accessToken: '', tokenType: 'Bearer', expiresAt: NOW + 1000 }],
  ['empty token types', { accessToken: 'token', tokenType: '', expiresAt: NOW + 1000 }],
  ['non-numeric expiry', { accessToken: 'token', tokenType: 'Bearer', expiresAt: 'later' }],
  [
    'non-numeric refresh time',
    { accessToken: 'token', tokenType: 'Bearer', expiresAt: NOW + 1000, refreshAt: 'soon' },
  ],
]) {
  test(`normalizeTokenRecord rejects ${name}`, () => {
    assert.throws(() => normalizeTokenRecord(value), TypeError);
  });
}

test('normalizeTokenRecord clones valid records and preserves optional refreshAt', () => {
  const source = validToken();
  const normalized = normalizeTokenRecord(source);

  assert.deepEqual(normalized, source);
  assert.notEqual(normalized, source);
});

test('MemoryTokenStore rejects a non-function clock', () => {
  assert.throws(() => new MemoryTokenStore({ now: 123 }), /must be a function/);
});

test('MemoryTokenStore returns clones rather than mutable internal records', async () => {
  const store = new MemoryTokenStore({ now: () => NOW });
  await store.set('key', validToken());

  const first = await store.get('key');
  first.accessToken = 'mutated';

  assert.equal((await store.get('key')).accessToken, 'token');
});

test('MemoryTokenStore removes expired records', async () => {
  let now = NOW;
  const store = new MemoryTokenStore({ now: () => now });
  await store.set('key', validToken({ expiresAt: NOW + 1000 }));

  now += 1000;

  assert.equal(await store.get('key'), null);
});

test('MemoryTokenStore conditional deletion preserves a replacement token', async () => {
  const store = new MemoryTokenStore({ now: () => NOW });
  await store.set('key', validToken({ accessToken: 'replacement' }));

  assert.equal(await store.deleteIfMatch('key', 'old-token'), false);
  assert.equal((await store.get('key')).accessToken, 'replacement');
});

test('MemoryTokenStore conditional deletion removes the matching token', async () => {
  const store = new MemoryTokenStore({ now: () => NOW });
  await store.set('key', validToken());

  assert.equal(await store.deleteIfMatch('key', 'token'), true);
  assert.equal(await store.get('key'), null);
});

test('MemoryTokenStore clear removes all credential identities', async () => {
  const store = new MemoryTokenStore({ now: () => NOW });
  await store.set('a', validToken({ accessToken: 'a' }));
  await store.set('b', validToken({ accessToken: 'b' }));

  await store.clear();

  assert.equal(await store.get('a'), null);
  assert.equal(await store.get('b'), null);
});

test('MemoryTokenStore validates records before saving them', async () => {
  const store = new MemoryTokenStore();
  await assert.rejects(() => store.set('key', { accessToken: 'bad' }), TypeError);
});

for (const [name, namespace, options, message] of [
  ['a missing namespace', null, undefined, /requires a Workers KV namespace/],
  ['a namespace without put', { get() {} }, undefined, /requires a Workers KV namespace/],
  [
    'a non-string key prefix',
    { get() {}, put() {} },
    { keyPrefix: 12 },
    /keyPrefix.*must be a string/,
  ],
  [
    'a non-function clock',
    { get() {}, put() {} },
    { now: 12 },
    /now.*must be a function/,
  ],
]) {
  test(`CloudflareKvTokenStore rejects ${name}`, () => {
    assert.throws(() => new CloudflareKvTokenStore(namespace, options), message);
  });
}

test('CloudflareKvTokenStore returns null for a cache miss', async () => {
  const store = new CloudflareKvTokenStore({
    async get() {
      return null;
    },
    async put() {},
  });
  assert.equal(await store.get('missing'), null);
});

test('CloudflareKvTokenStore validates values read from KV', async () => {
  const store = new CloudflareKvTokenStore({
    async get() {
      return { accessToken: 'malformed' };
    },
    async put() {},
  });
  await assert.rejects(() => store.get('key'), /invalid token record/);
});

test('CloudflareKvTokenStore prefixes keys and forwards KV write failures', async () => {
  let observedKey;
  const store = new CloudflareKvTokenStore(
    {
      async get() {
        return null;
      },
      async put(key) {
        observedKey = key;
        throw new Error('synthetic KV failure');
      },
    },
    { keyPrefix: 'isolated:', now: () => NOW }
  );

  await assert.rejects(() => store.set('credential', validToken()), /synthetic KV failure/);
  assert.equal(observedKey, 'isolated:credential');
});

test('DynamoDbTokenStore rejects a missing document client', () => {
  assert.throws(
    () => new DynamoDbTokenStore({ tableName: 'tokens' }),
    /requires a DynamoDB document client/
  );
});

test('DynamoDbTokenStore rejects a missing table name', () => {
  assert.throws(
    () => new DynamoDbTokenStore({ client: { send() {} } }),
    /requires a tableName/
  );
});

test('DynamoDbTokenStore returns null when DynamoDB has no item', async () => {
  const { store, inputs } = createDynamoStore(async () => ({}));

  assert.equal(await store.get('missing'), null);
  assert.equal(inputs[0].ConsistentRead, true);
});

test('DynamoDbTokenStore supports custom key, TTL, prefix, and consistency settings', async () => {
  const { store, inputs } = createDynamoStore(async (commandName) =>
    commandName === 'GetCommand' ? {} : {}
  , {
    partitionKey: 'id',
    ttlAttribute: 'ttl',
    keyPrefix: 'custom#',
    consistentRead: false,
  });

  await store.set('credential', validToken());
  await store.get('credential');

  assert.equal(inputs[0].Item.id, 'custom#credential');
  assert.equal(inputs[0].Item.ttl, Math.floor((NOW + 3_600_000) / 1000));
  assert.equal(inputs[1].Key.id, 'custom#credential');
  assert.equal(inputs[1].ConsistentRead, false);
});

test('DynamoDbTokenStore validates token maps returned by DynamoDB', async () => {
  const { store } = createDynamoStore(async (commandName) =>
    commandName === 'GetCommand' ? { Item: { token: { accessToken: 'bad' } } } : {}
  );
  await assert.rejects(() => store.get('key'), /invalid token record/);
});

test('DynamoDbTokenStore forwards non-conditional delete failures', async () => {
  const { store } = createDynamoStore(async (commandName) => {
    if (commandName === 'DeleteCommand') throw new Error('synthetic DynamoDB failure');
    return {};
  });

  await assert.rejects(
    () => store.deleteIfMatch('key', 'token'),
    /synthetic DynamoDB failure/
  );
});

function validToken(overrides = {}) {
  return {
    accessToken: 'token',
    tokenType: 'Bearer',
    expiresAt: NOW + 3_600_000,
    refreshAt: NOW + 3_480_000,
    ...overrides,
  };
}

function createDynamoStore(respond, adapterOptions = {}) {
  const inputs = [];
  class GetCommand {
    constructor(input) {
      this.input = input;
      this.name = 'GetCommand';
    }
  }
  class PutCommand {
    constructor(input) {
      this.input = input;
      this.name = 'PutCommand';
    }
  }
  class DeleteCommand {
    constructor(input) {
      this.input = input;
      this.name = 'DeleteCommand';
    }
  }
  const client = {
    async send(command) {
      inputs.push(command.input);
      return respond(command.name, command.input);
    },
  };
  return {
    store: new DynamoDbTokenStore({
      client,
      tableName: 'synthetic-token-table',
      commands: { GetCommand, PutCommand, DeleteCommand },
      ...adapterOptions,
    }),
    inputs,
  };
}
