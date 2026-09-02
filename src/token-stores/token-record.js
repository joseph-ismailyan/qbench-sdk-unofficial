/**
 * Validates and clones a token record returned by a token store.
 *
 * Token stores persist bearer credentials, so callers should never log the
 * returned value or include it in error messages.
 *
 * @param {unknown} value
 * @returns {{ accessToken: string, tokenType: string, expiresAt: number, refreshAt?: number }}
 */
export function normalizeTokenRecord(value) {
  if (!value || typeof value !== 'object') {
    throw new TypeError('Token store returned a non-object token record.');
  }

  const { accessToken, tokenType, expiresAt, refreshAt } = value;
  if (
    typeof accessToken !== 'string' ||
    accessToken.length === 0 ||
    typeof tokenType !== 'string' ||
    tokenType.length === 0 ||
    typeof expiresAt !== 'number' ||
    !Number.isFinite(expiresAt)
  ) {
    throw new TypeError('Token store returned an invalid token record.');
  }

  if (refreshAt !== undefined && (typeof refreshAt !== 'number' || !Number.isFinite(refreshAt))) {
    throw new TypeError('Token store returned an invalid refresh time.');
  }

  return refreshAt === undefined
    ? { accessToken, tokenType, expiresAt }
    : { accessToken, tokenType, expiresAt, refreshAt };
}
