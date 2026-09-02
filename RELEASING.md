# Releasing

Only a maintainer should publish `qbench-sdk-unofficial`. Publishing to npm is intentionally separate from preparing
or tagging a release because an npm package name and version cannot be reused after publication.

## First public release

1. Confirm the reviewed source is pushed to the public GitHub repository and that `package.json` contains its exact
   `repository` and `homepage` URLs.
2. Confirm the package name is still available:

   ```sh
   npm view qbench-sdk-unofficial version
   ```

   A registry `404` means no published package currently owns that exact name. Stop if the command returns a version.
3. Authenticate the npm CLI with the intended personal account and verify the identity:

   ```sh
   npm login
   npm whoami
   ```

4. Run the complete local release gate and inspect the displayed tarball file list:

   ```sh
   npm run release:check
   npm publish --dry-run
   ```

5. Confirm that no `.env` files, credentials, access tokens, local Wrangler state, coverage output, test fixtures with
   customer data, or unrelated workspace files appear in the tarball.
6. Publish the first release explicitly as a public package:

   ```sh
   npm publish --access public
   ```

7. Verify the registry result from a clean temporary directory:

   ```sh
   npm view qbench-sdk-unofficial@0.1.0 --json
   npm install qbench-sdk-unofficial@0.1.0
   node -e "import('qbench-sdk-unofficial').then((sdk) => console.log(typeof sdk.QBenchClient))"
   ```

8. Create and push the matching `v0.1.0` Git tag only after the registry verification succeeds.

## Later releases

- Update `CHANGELOG.md` and the version in `package.json` and `package-lock.json` together.
- Run `npm run release:check`, which includes declaration type-checking and the tenant-boundary tarball scan. Then
  inspect `npm publish --dry-run` and install the generated tarball in a clean temporary project before publishing.
- Publish each version once. Never try to replace an existing version.
- After the first release exists, configure npm trusted publishing for the exact GitHub repository and a dedicated
  release workflow. Grant that workflow only `contents: read` and `id-token: write`; do not store a long-lived npm
  token in GitHub Actions.
