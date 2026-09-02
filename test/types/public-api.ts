import {
  CloudflareKvTokenStore,
  DynamoDbTokenStore,
  MemoryTokenStore,
  QBenchApiError,
  QBenchClient,
  type QBenchAccessTokenProvider,
  type QBenchPayload,
  type QBenchTokenRecord,
  type QBenchTokenStore,
} from "qbench-sdk-unofficial";

const customPayload: QBenchPayload = {
  standard_field: 42,
  arbitrary_tenant_field: "supported",
  nested_custom_data: { enabled: true },
};

const memoryStore: QBenchTokenStore = new MemoryTokenStore();
const client = new QBenchClient({
  baseUrl: "https://example.qbench.net",
  clientId: "client-id",
  clientSecret: "client-secret",
  tokenStore: memoryStore,
});

void client.order.listOrders({ page_num: 1, page_size: 50 });
void client.order.createOrders([customPayload]);
void client.sample.createSamples([customPayload]);
void client.test.createTests([customPayload]);

const token: QBenchTokenRecord = {
  accessToken: "token",
  tokenType: "Bearer",
  expiresAt: Date.now() + 60_000,
};
void memoryStore.set("key", token);

const customStore: QBenchTokenStore = {
  async get() {
    return token;
  },
  async set(_key, _token) {},
  async deleteIfMatch() {
    return true;
  },
};

const customProvider: QBenchAccessTokenProvider = {
  async getAccessToken({ forceRefresh } = {}) {
    return forceRefresh ? "refreshed" : "cached";
  },
};

new QBenchClient({
  baseUrl: "https://example.qbench.net",
  tokenStore: customStore,
  accessTokenProvider: customProvider,
});

const kv = {
  async get(_key: string, _type: "json") {
    return token;
  },
  async put(_key: string, _value: string, _options?: { expiration?: number }) {},
};
new CloudflareKvTokenStore(kv, { keyPrefix: "qbench:" });

class Command {
  constructor(_input: QBenchPayload) {}
}
new DynamoDbTokenStore({
  client: { async send(_command: object) { return {}; } },
  tableName: "token-cache",
  commands: { GetCommand: Command, PutCommand: Command, DeleteCommand: Command },
});

function statusOf(error: unknown): number | null {
  return error instanceof QBenchApiError ? error.status : null;
}
void statusOf;
