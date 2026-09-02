# Cloudflare Worker live smoke test

This protected test Worker verifies the SDK against a real QBench account
without returning order contents.

Each `POST /smoke/order` request creates a new `QBenchClient`, fetches at most
one order with `page_size: 1`, and reports only request counts and whether an
order was present. Run it twice: the first request should report one OAuth
request, while the second should report zero because the new client loads the
unexpired token from Workers KV.

`POST /smoke/suite` runs a broader read-only suite. It verifies concurrent
requests share one authentication operation, a new client reuses the KV token,
`page_size: 50` succeeds, and `page_size: 100` is rejected without an outbound
request. The suite returns counts and booleans only.

`POST /smoke/concurrent-ten` runs exactly ten simultaneous page-size-1 order
list requests through one SDK client. A cold run passes only when all ten order
responses succeed with no more than one OAuth request.

The endpoint requires a bearer token stored as the `SMOKE_TOKEN` Worker secret.
QBench credentials must also be stored as Worker secrets. Never place them in
this directory or in `wrangler.jsonc`.

## Run the smoke test

1. Install the fixture and confirm the active Cloudflare account:

   ```sh
   npm install
   npx wrangler whoami
   ```

2. Create a dedicated KV namespace, then replace
   `REPLACE_WITH_KV_NAMESPACE_ID` in `wrangler.jsonc` with its ID:

   ```sh
   npx wrangler kv namespace create qbench-sdk-unofficial-smoke-token-cache
   ```

3. Generate types, validate the bundle, and deploy:

   ```sh
   npm run types
   npm run check
   npm run deploy
   ```

4. Store the QBench credentials and a random endpoint token as encrypted
   Worker secrets:

   ```sh
   npx wrangler secret put QBENCH_BASE_URL
   npx wrangler secret put QBENCH_CLIENT_ID
   npx wrangler secret put QBENCH_CLIENT_SECRET
   export QBENCH_SMOKE_TOKEN="$(openssl rand -hex 32)"
   printf '%s' "$QBENCH_SMOKE_TOKEN" | npx wrangler secret put SMOKE_TOKEN
   ```

5. Invoke the protected endpoint twice, replacing the URL with the one printed
   by Wrangler:

   ```sh
   curl --request POST \
     --header "Authorization: Bearer $QBENCH_SMOKE_TOKEN" \
     https://your-worker.workers.dev/smoke/order
   curl --request POST \
     --header "Authorization: Bearer $QBENCH_SMOKE_TOKEN" \
     https://your-worker.workers.dev/smoke/order
   unset QBENCH_SMOKE_TOKEN
   ```

The first response should contain `"oauthRequests":1`; the second should
contain `"oauthRequests":0`. Both should contain `"apiRequests":1`.

To run the broader suite, call its endpoint twice with the same bearer token:

```sh
curl --request POST \
  --header "Authorization: Bearer $QBENCH_SMOKE_TOKEN" \
  https://your-worker.workers.dev/smoke/suite
curl --request POST \
  --header "Authorization: Bearer $QBENCH_SMOKE_TOKEN" \
  https://your-worker.workers.dev/smoke/suite
```

The first suite response should report `"cacheState":"cold"` with at most one
OAuth request. The second should report `"cacheState":"warm"` with zero OAuth
requests. Every check should report `"passed":true`.

To run the focused ten-request concurrency check:

```sh
curl --request POST \
  --header "Authorization: Bearer $QBENCH_SMOKE_TOKEN" \
  https://your-worker.workers.dev/smoke/concurrent-ten
```

The response should report `"concurrentGets":10`, `"apiRequests":10`,
`"orderResponses":10`, and no more than one OAuth request.

Delete the temporary Worker and KV namespace after testing if they are no
longer needed. Deleting the namespace also removes its cached access token.
