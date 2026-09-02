// File: index.js (Example main entry point)

// Export the main client class
export { QBenchClient } from './src/client.js';

// Token storage adapters. The QBenchClient uses MemoryTokenStore by default;
// Cloudflare and AWS consumers can inject their platform adapter.
export {
  MemoryTokenStore,
  sharedMemoryTokenStore,
} from './src/token-stores/memory.js';
export { CloudflareKvTokenStore } from './src/token-stores/cloudflare-kv.js';
export { DynamoDbTokenStore } from './src/token-stores/dynamodb.js';

// Optionally export error classes for consumers to catch specific errors
export {
  QBenchSdkError,
  QBenchAuthError,
  QBenchApiError,
  QBenchRateLimitError,
  QBenchValidationError,
  QBenchForbiddenError,
  QBenchNotFoundError,
} from './src/errors.js';

// --- End of File: index.js ---
