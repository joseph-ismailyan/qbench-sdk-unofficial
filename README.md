# QBench SDK Unofficial

> [!IMPORTANT]
> This is an unofficial community SDK. This project is not affiliated with, endorsed by, sponsored by, or supported
> by QBench, Inc. QBench and related marks belong to their respective owners.

Developed by das.dev and maintained by Joseph Ismailyan at [joe@das.dev](mailto:joe@das.dev).

An ES module SDK for the QBench API with expiry-aware OAuth token reuse and pluggable token storage. It is designed
for Node.js services, AWS Lambda, Cloudflare Workers, and other serverless runtimes where authenticating before every
API request wastes requests and reaches rate limits faster.

Current package version: `0.1.1`.

## Why use it?

- Reuses an access token until shortly before it expires instead of authenticating for every API call
- Coalesces concurrent authentication inside one client
- Shares tokens across processes or isolates through optional adapters
- Includes adapters for in-memory storage, Cloudflare Workers KV, and DynamoDB
- Accepts a fully custom token-store adapter or access-token provider
- Enforces QBench's maximum `page_size` of 50 before a request is sent
- Avoids automatic replay of `POST`, `PATCH`, and `DELETE` requests after transient failures
- Requires HTTPS and redacts sensitive API error details by default

## Requirements

- Node.js 22 or later, or a compatible serverless runtime
- A QBench HTTPS base URL
- A QBench client ID and client secret, unless using a custom access-token provider
- Fetch and Web Crypto-compatible runtime APIs

Cloudflare Workers also require Node.js compatibility because the attachment and report file helpers use `Buffer`
and Node.js HTTP modules.

## Install

```bash
npm install qbench-sdk-unofficial
```

## Quick start

```js
import { QBenchClient } from 'qbench-sdk-unofficial';

const qbench = new QBenchClient({
  baseUrl: process.env.QBENCH_BASE_URL,
  clientId: process.env.QBENCH_CLIENT_ID,
  clientSecret: process.env.QBENCH_CLIENT_SECRET,
});

const orders = await qbench.order.listOrders({ page_num: 1, page_size: 50 });
```

Create the client once and reuse it whenever the runtime permits. The default memory store is shared by clients in
the same JavaScript process.

## TypeScript and custom fields

The package includes TypeScript declarations for the client, every resource handler, errors, token records, and token
storage adapters. QBench request payloads and responses remain intentionally open-ended because each tenant can define
its own fields and schemas. No tenant-specific schemas or business mappings are bundled with this package.

Validate or narrow response data inside your application according to that tenant's configuration:

```ts
import { QBenchClient, type QBenchPayload } from 'qbench-sdk-unofficial';

const customOrder: QBenchPayload = {
  customer_id: 42,
  my_custom_field: 'tenant-defined value',
};

await qbench.order.createOrders([customOrder]);
```

## How token reuse works

For each API operation, the SDK:

1. Reuses the current client's valid in-memory token.
2. Checks the configured token store for a reusable token.
3. Authenticates with QBench only when no safe token exists.
4. Saves the new token with its absolute expiration time.
5. Stops using the token shortly before expiration. The default refresh buffer is 120 seconds.
6. If QBench rejects a token with `401`, invalidates that token, refreshes, and retries the API operation once.

The SDK caches the returned bearer token. It does not cache the signed JWT assertion or the QBench client secret.
Token-store failures are treated as cache failures: authentication continues and warnings never contain the token.

## Memory adapter

No configuration is required. Use an explicit store when a client should not share tokens with other clients in the
same process:

```js
import {
  MemoryTokenStore,
  QBenchClient,
} from 'qbench-sdk-unofficial';

const qbench = new QBenchClient({
  baseUrl,
  clientId,
  clientSecret,
  tokenStore: new MemoryTokenStore(),
});
```

Memory storage lasts only as long as the process or warm serverless execution environment.

## AWS Lambda with DynamoDB

Create the DynamoDB client, token store, and QBench client outside the Lambda handler so warm invocations reuse the
same in-memory token. DynamoDB lets cold execution environments reuse it too.

```bash
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

```js
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import {
  DynamoDbTokenStore,
  QBenchClient,
} from 'qbench-sdk-unofficial';

const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tokenStore = new DynamoDbTokenStore({
  client: dynamodb,
  tableName: process.env.QBENCH_TOKEN_TABLE,
});

const qbench = new QBenchClient({
  baseUrl: process.env.QBENCH_BASE_URL,
  clientId: process.env.QBENCH_CLIENT_ID,
  clientSecret: process.env.QBENCH_CLIENT_SECRET,
  tokenStore,
});

export async function handler() {
  return qbench.order.listOrders({ page_size: 50 });
}
```

The table needs:

- A string partition key named `pk`
- DynamoDB TTL enabled on `expiresAtEpochSeconds` for eventual cleanup
- `dynamodb:GetItem`, `dynamodb:PutItem`, and `dynamodb:DeleteItem` permission for the Lambda role
- Encryption and access controls appropriate for bearer credentials

The field names can be changed with `partitionKey`, `ttlAttribute`, and `keyPrefix`. Reads are strongly consistent by
default. DynamoDB TTL is only cleanup; the SDK always validates `expiresAt` itself.

This adapter has no distributed refresh lock. Simultaneous cold starts can occasionally obtain more than one token
during the same expiration window, but ordinary requests still reuse the stored token.

## Cloudflare Workers with KV

Create a dedicated KV namespace for QBench bearer tokens and use separate namespaces for separate environments.

```jsonc
{
  "compatibility_date": "2026-08-29",
  "compatibility_flags": ["nodejs_compat"],
  "kv_namespaces": [
    {
      "binding": "QBENCH_TOKEN_CACHE",
      "id": "your-kv-namespace-id"
    }
  ]
}
```

The example uses a current compatibility date and explicitly enables Node.js compatibility. With a compatibility
date earlier than `2025-08-15`, also add `enable_nodejs_http_modules` for the attachment upload helper. See
[Cloudflare's Node.js compatibility documentation](https://developers.cloudflare.com/workers/runtime-apis/nodejs/).

```js
import {
  CloudflareKvTokenStore,
  QBenchClient,
} from 'qbench-sdk-unofficial';

export default {
  async fetch(_request, env) {
    const qbench = new QBenchClient({
      baseUrl: env.QBENCH_BASE_URL,
      clientId: env.QBENCH_CLIENT_ID,
      clientSecret: env.QBENCH_CLIENT_SECRET,
      tokenStore: new CloudflareKvTokenStore(env.QBENCH_TOKEN_CACHE),
    });

    const orders = await qbench.order.listOrders({ page_size: 50 });
    return Response.json(orders);
  },
};
```

Create the Worker client inside the request handler. The KV adapter provides cross-request token reuse without
keeping request-scoped I/O objects in module-level mutable state.

Workers KV is eventually consistent. Different locations can occasionally see the same cache miss and each
authenticate, especially on first use or near expiration. KV still avoids authentication before every ordinary
request; it does not guarantee exactly one global refresh. A Durable Object is not required.

KV cannot atomically compare and delete a value. After a `401`, the SDK bypasses that cached value, authenticates,
and overwrites it. The adapter also skips KV writes for tokens that expire in less than KV's 60-second minimum.

For a deployable, protected end-to-end verification fixture, see the
[Cloudflare Worker live smoke test](examples/cloudflare-worker-smoke/README.md).

## Custom token-store adapter

Implement this asynchronous contract for any other storage platform:

```js
class CustomTokenStore {
  async get(key) {
    // Return null on a miss, or a token record:
    return {
      accessToken: 'bearer-token',
      tokenType: 'Bearer',
      expiresAt: 1700003600000,
      refreshAt: 1700003480000, // optional
    };
  }

  async set(key, token) {
    // Persist the complete token record.
  }

  async deleteIfMatch(key, rejectedAccessToken) {
    // Optional. Delete only if the stored token still matches.
    return true;
  }
}

const qbench = new QBenchClient({
  baseUrl,
  clientId,
  clientSecret,
  tokenStore: new CustomTokenStore(),
});
```

`deleteIfMatch` is optional and should be implemented only when the backing store supports a safe conditional delete.
The SDK's default cache key is a SHA-256 digest of the normalized token endpoint and client ID; it contains no client
secret.

## Fully custom access-token provider

Replace the built-in JWT authentication manager when tokens come from a broker or another credential system:

```js
const qbench = new QBenchClient({
  baseUrl,
  accessTokenProvider: {
    async getAccessToken({ forceRefresh = false } = {}) {
      return obtainTokenFromYourBroker({ forceRefresh });
    },

    async invalidateAccessToken(rejectedAccessToken) {
      return invalidateOnlyIfCurrent(rejectedAccessToken);
    },
  },
});
```

`getAccessToken()` must return the bearer token string. `invalidateAccessToken()` is optional and should return
`false` when a newer token has already replaced the rejected token.

## Pagination safety

QBench accepts a maximum `page_size` of 50. The SDK enforces an integer range from 1 through 50 for every request and
throws `QBenchValidationError` before sending an invalid value. Do not request 100 records in one page.

```js
const first = await qbench.order.listOrders({ page_num: 1, page_size: 50 });
const second = await qbench.order.listOrders({ page_num: 2, page_size: 50 });
```

## Retry safety

Transient retries apply only to `GET` and `HEAD` requests. The SDK retries rate limits, server errors, and connection
resets with bounded exponential backoff. It never automatically replays `POST`, `PATCH`, or `DELETE` after those
failures, because the original mutation might already have been applied.

The separate one-time `401` recovery applies to all methods: an unauthorized request is rejected before the operation
is authorized, so the SDK refreshes the rejected bearer token and tries once with the replacement.

## Error handling and redaction

Catch the exported error classes when status-specific behavior is needed:

```js
import {
  QBenchRateLimitError,
  QBenchValidationError,
} from 'qbench-sdk-unofficial';

try {
  await qbench.order.listOrders({ page_size: 50 });
} catch (error) {
  if (error instanceof QBenchRateLimitError) {
    // Apply application-level backpressure.
  } else if (error instanceof QBenchValidationError) {
    // Correct the request.
  } else {
    throw error;
  }
}
```

By default, thrown API errors include the HTTP status, method, path, stable QBench error codes when present, and a
small allowlist of operational headers. They exclude request query parameters, request bodies, response descriptions,
response bodies, error tokens, and unsafe response headers.

For isolated debugging only, `includeSensitiveErrorDetails: true` restores raw API error details. Never enable it in
an environment where errors are logged, reported to telemetry, returned to users, or retained in support systems.

## API surface

The client groups methods by QBench resource:

`accessioningType`, `apiClient`, `assayCategory`, `assay`, `attachment`, `authentication`, `batch`, `comment`,
`contact`, `customer`, `division`, `epic`, `integration`, `invoiceItem`, `invoice`, `label`, `locationType`, `location`,
`order`, `panel`, `payment`, `printdoc`, `project`, `quotation`, `report`, `sample`, `source`, `team`, `test`,
`turnaround`, `user`, and `worksheet`.

Each handler exposes resource-specific list, get, create, update, delete, and relationship helpers where the QBench
API supports them. Inputs use QBench's native field casing.

The `authentication` handler is exposed for API-shape compatibility, but its raw token helper methods are deliberately
disabled. Configure authentication through `QBenchClient` or `accessTokenProvider` instead.

Attachment uploads and report or attachment downloads may return a time-limited presigned URL as `sourceUrl`. Treat
that URL as a credential: do not log it or store it longer than necessary. The SDK rejects non-HTTPS presigned URLs.
File downloads use the runtime's global `fetch`; attachment uploads use Node.js HTTPS modules to preserve the
presigned request exactly.

## Constructor options

| Option | Required | Purpose |
| --- | --- | --- |
| `baseUrl` | Yes | QBench instance HTTPS base URL |
| `clientId` | Normally | JWT subject and credential identity |
| `clientSecret` | Normally | HMAC secret used to sign the JWT assertion |
| `tokenStore` | No | Memory, KV, DynamoDB, or custom token persistence |
| `accessTokenProvider` | No | Replaces built-in authentication; makes client ID and secret optional |
| `tokenCacheKey` | No | Overrides the automatically derived token key |
| `tokenExpiryBufferSeconds` | No | Early refresh buffer; default 120 seconds |
| `authTimeoutMs` | No | Authentication timeout; default 30 seconds |
| `fetch` | No | Fetch implementation for authentication and normal API requests |
| `webCrypto` | No | Web Crypto implementation used for JWT signing |
| `maxRetries` | No | Transient retry count for `GET` and `HEAD` only; default 3 |
| `initialBackoffMs` | No | Initial transient retry delay; default 1 second |
| `maxConcurrentRequests` | No | Per-client concurrency limit; default 10 |
| `timeoutMs` | No | Normal API request timeout; default 30 seconds |
| `includeSensitiveErrorDetails` | No | Opt in to raw request and API error details; default `false` |

The concurrency limit is local to one `QBenchClient`; it is not a fleet-wide rate limiter.

## Security

- Use a secrets manager or encrypted runtime secrets for the QBench client secret.
- Restrict KV, DynamoDB, and custom-store access because cached bearer tokens are credentials.
- Never log client secrets, JWT assertions, bearer tokens, presigned URLs, or raw request and response bodies.
- Use separate token stores and credentials for separate environments.
- Keep `includeSensitiveErrorDetails` disabled outside tightly controlled local debugging.

Report vulnerabilities privately according to [SECURITY.md](SECURITY.md). Never disclose a credential, token,
customer record, production URL, or other sensitive material in a public channel.

## Development

```bash
npm test
npm run test:coverage
npm run check
npm run release:check
```

The test suite uses synthetic credentials and mocked responses. The coverage command enforces source-only minimums of
95% for lines, branches, and functions, including explicit tests for the `page_size <= 50` rule and mutation retry
safety.

## Project policies

- [Security policy](SECURITY.md)
- [Changelog](CHANGELOG.md)
- [Release guide](RELEASING.md)
- [MIT license](LICENSE)
