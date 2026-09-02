// File: src/tags/attachment.js
import https from 'https';
import { BaseHandler } from './baseHandler.js';

function requireHttpsUrl(urlString, errorName, purpose) {
  let url;
  try {
    url = new URL(urlString);
  } catch {
    const err = new Error(`QBench ${purpose} URL is invalid.`);
    err.name = errorName;
    throw err;
  }

  if (url.protocol !== 'https:') {
    const err = new Error(`QBench ${purpose} URL must use HTTPS.`);
    err.name = errorName;
    throw err;
  }

  return url;
}

/**
 * Extracts a query parameter value from a URL string using string operations
 * + `decodeURIComponent`. Avoids `URLSearchParams`, which form-decodes `+`
 * to space — that mangles base64-ish values like AWS STS tokens that contain
 * literal `+` characters when the signer didn't percent-encode them.
 *
 * @returns { value: string, urlWithoutParam: string } or null if not found
 */
function extractQueryParamCaseInsensitive(urlString, paramName) {
  // Match `?name=val` or `&name=val`, where val runs to the next `&` or end.
  // Capture the leading separator, the matched name, the value, and the trailing boundary.
  const re = new RegExp(
    `([?&])(${paramName})=([^&]*)(?=&|$)`,
    'i'
  );
  const m = urlString.match(re);
  if (!m) return null;

  const sep = m[1];
  const fullMatch = m[0];
  const idx = m.index;
  const after = idx + fullMatch.length;

  // Decode the value. decodeURIComponent does NOT convert `+` to space,
  // so it works whether the value used literal `+` or percent-encoded `%2B`.
  let decoded;
  try {
    decoded = decodeURIComponent(m[3]);
  } catch {
    decoded = m[3];
  }

  // Remove the matched segment, fixing up surrounding `?` / `&` boundaries.
  let urlWithoutParam;
  const charAfter = urlString[after];
  if (sep === '?' && charAfter === '&') {
    // ?name=v&rest... → ?rest...
    urlWithoutParam = urlString.slice(0, idx) + '?' + urlString.slice(after + 1);
  } else if (sep === '?' && charAfter === undefined) {
    // ?name=v (only param) → drop the ?
    urlWithoutParam = urlString.slice(0, idx);
  } else {
    // &name=v (anywhere) → drop &name=v entirely
    urlWithoutParam = urlString.slice(0, idx) + urlString.slice(after);
  }

  return { value: decoded, urlWithoutParam };
}

/**
 * PUT a Buffer to an absolute URL (typically an S3 V2 presigned upload URL
 * returned by QBench's POST /attachments response).
 *
 * QBench signs these URLs using V2 with STS session credentials. The signer
 * places `x-amz-security-token` into the StringToSign's CanonicalizedAmzHeaders
 * section, which means S3 expects the client to send it as an HTTP header
 * (not as a URL query param). This function:
 *   1. Extracts `x-amz-security-token` from the URL's query string (using
 *      `decodeURIComponent`, NOT `URLSearchParams`, to preserve literal `+`).
 *   2. Strips it from the URL.
 *   3. Sends it as an `x-amz-security-token` HTTP header.
 *
 * Only headers included in the StringToSign are sent (anything else changes
 * S3's recomputed StringToSign and causes SignatureDoesNotMatch):
 *   - Content-Type             (only if explicitly provided)
 *   - x-amz-security-token     (promoted from URL query string)
 */
async function putBinaryToUrl(uploadUrl, buffer, contentType) {
  requireHttpsUrl(uploadUrl, 'QBenchUploadError', 'attachment upload');

  const headers = {};
  if (contentType) headers['Content-Type'] = contentType;

  let urlToFetch = uploadUrl;
  const extracted =
    extractQueryParamCaseInsensitive(urlToFetch, 'x-amz-security-token') ||
    extractQueryParamCaseInsensitive(urlToFetch, 'X-Amz-Security-Token');
  if (extracted) {
    headers['x-amz-security-token'] = extracted.value;
    urlToFetch = extracted.urlWithoutParam;
  }

  const res = await rawHttpsPut(urlToFetch, buffer, headers);

  if (res.status < 200 || res.status >= 300) {
    const err = new Error(`Upload to presigned URL failed with status ${res.status}.`);
    err.name = 'QBenchUploadError';
    err.status = res.status;
    throw err;
  }
  return { status: res.status };
}

/**
 * Send a PUT request using Node's raw https.request — no fetch/undici layer
 * between us and the wire. We do this because fetch/undici has been observed
 * to subtly mutate URLs/headers in ways that break S3 V2 presigned URL
 * signature verification (re-encoding query strings, normalizing Content-Type,
 * etc.).
 *
 * The path is built by extracting `pathname + search` from the URL via
 * `new URL()` — this preserves percent-encoding exactly as-is.
 *
 * Only the headers in `headers` are sent. Content-Length is set explicitly
 * from the Buffer; Host is set explicitly from the URL.
 */
function rawHttpsPut(urlString, buffer, headers) {
  return new Promise((resolve, reject) => {
    const url = requireHttpsUrl(urlString, 'QBenchUploadError', 'attachment upload');

    const reqHeaders = {
      Host: url.host,
      'Content-Length': buffer.length,
      ...headers,
    };

    const req = https.request(
      {
        method: 'PUT',
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        headers: reqHeaders,
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body,
          });
        });
      }
    );
    req.on('error', reject);
    req.write(buffer);
    req.end();
  });
}

function firstRecord(response) {
  if (!response) return null;
  if (Array.isArray(response)) return response[0] ?? null;
  if (Array.isArray(response.data)) return response.data[0] ?? null;
  if (typeof response === 'object') return response;
  return null;
}

function pickUploadUrl(record) {
  if (!record || typeof record !== 'object') return null;
  return (
    record.upload_url ||
    record.uploadUrl ||
    record.presigned_url ||
    record.presignedUrl ||
    record.url ||
    null
  );
}

function unwrapData(response) {
  if (
    response &&
    typeof response === 'object' &&
    response.data &&
    typeof response.data === 'object' &&
    !Array.isArray(response.data)
  ) {
    return response.data;
  }
  return response;
}

function pickDownloadUrl(record) {
  if (!record || typeof record !== 'object') return null;
  return (
    record.download_url ||
    record.downloadUrl ||
    record.file_url ||
    record.fileUrl ||
    record.url ||
    null
  );
}

function fileNameFromRecord(record, fallback) {
  if (record && typeof record === 'object') {
    const direct = record.file_name || record.fileName || record.filename || record.name;
    if (direct) return String(direct);
  }
  return fallback;
}

async function downloadFileFromRecord(record, fallbackId) {
  const downloadUrl = pickDownloadUrl(record);
  if (!downloadUrl) {
    const err = new Error(
      `QBench attachment ${fallbackId ?? '(unknown)'} has no download URL field.`
    );
    err.name = 'QBenchAttachmentDownloadError';
    throw err;
  }

  requireHttpsUrl(downloadUrl, 'QBenchAttachmentDownloadError', 'attachment download');
  const res = await fetch(downloadUrl);
  if (!res.ok) {
    await res.text().catch(() => '');
    const err = new Error(
      `Failed to download attachment ${fallbackId ?? '(unknown)'}: HTTP ${res.status}.`
    );
    err.name = 'QBenchAttachmentDownloadError';
    err.status = res.status;
    throw err;
  }

  const attachmentId = record?.id ?? fallbackId;
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type');
  const fileName = fileNameFromRecord(record, `attachment-${attachmentId ?? 'unknown'}`);
  return { buffer, fileName, contentType, attachmentId, sourceUrl: downloadUrl };
}

export class AttachmentHandler extends BaseHandler {
  /**
   * Creates attachment records from a JSON metadata array. QBench validates
   * that the body is a JSON array of attachment objects:
   *   [{ attachment_type, object_id, file_name }, ...]
   *
   * For real file uploads, prefer {@link AttachmentHandler#createAttachmentWithFile}
   * — calling this alone creates an empty attachment row with no binary data.
   *
   * Corresponds to `POST /qbench/api/v2/attachments`
   * @param {Array<object>} attachmentsData Attachment metadata objects.
   * @returns {Promise<object>} QBench response (array of created records).
   */
  async createAttachments(attachmentsData) {
    if (!Array.isArray(attachmentsData) || attachmentsData.length === 0) {
      throw new Error('attachmentsData must be a non-empty array.');
    }
    return this._requestHandler.request(
      'POST',
      '/qbench/api/v2/attachments',
      null,
      attachmentsData
    );
  }

  /**
   * Creates an attachment AND uploads its file bytes.
   *
   * Two-step flow (QBench v2 attachments pattern):
   *   1. POST JSON metadata to /qbench/api/v2/attachments → returns the
   *      attachment record with a pre-signed upload URL
   *   2. PUT the raw file bytes to that URL
   *
   * @param {object} params
   * @param {string} params.attachment_type Attachment scope (e.g. "ORDER").
   * @param {number|string} params.object_id Parent entity ID.
   * @param {string} params.file_name Display filename (with extension).
   * @param {Buffer|string} params.file Binary content as Buffer, or a base64 string
   *   (use `params.fileEncoding: 'base64'` to decode).
   * @param {'base64'|'binary'} [params.fileEncoding='binary']
   * @param {string} [params.contentType='application/pdf']
   * @returns {Promise<object>} The created attachment record.
   * @throws {Error} If QBench responds without an upload URL we cannot recognize.
   */
  async createAttachmentWithFile({
    attachment_type,
    object_id,
    file_name,
    file,
    fileEncoding = 'binary',
    contentType,
  }) {
    if (!attachment_type) throw new Error('attachment_type is required.');
    if (object_id === undefined || object_id === null) {
      throw new Error('object_id is required.');
    }
    if (!file_name) throw new Error('file_name is required.');
    if (!file) throw new Error('file is required.');

    const fileBuffer = Buffer.isBuffer(file)
      ? file
      : fileEncoding === 'base64'
      ? Buffer.from(file, 'base64')
      : Buffer.from(file);

    // Step 1: create metadata record — QBench requires a JSON array body
    const created = await this._requestHandler.request(
      'POST',
      '/qbench/api/v2/attachments',
      null,
      [
        {
          attachment_type,
          object_id: typeof object_id === 'string' ? parseInt(object_id, 10) : object_id,
          file_name,
        },
      ]
    );

    const record = firstRecord(created);
    const uploadUrl = pickUploadUrl(record);

    if (!uploadUrl) {
      const err = new Error(
        'QBench attachment create succeeded but no upload URL was returned.'
      );
      err.name = 'QBenchUploadError';
      throw err;
    }

    // Step 2: PUT the binary to the pre-signed URL
    await putBinaryToUrl(uploadUrl, fileBuffer, contentType);

    return record;
  }

  /**
   * Updates a list of existing attachments.
   * Corresponds to `PATCH /qbench/api/v2/attachments`
   * @param {Array<object>} attachmentsUpdates An array of attachment update objects (must include 'id', structure defined by UpdateAttachmentSchema). Use API's casing for keys.
   * @returns {Promise<object>} Response object containing updated attachment metadata (structure defined by QBench API).
   */
  async updateAttachments(attachmentsUpdates) {
    if (!Array.isArray(attachmentsUpdates) || attachmentsUpdates.length === 0) {
      throw new Error('attachmentsUpdates must be a non-empty array.');
    }
    if (
      !attachmentsUpdates.every((item) => item && typeof item === 'object' && item.id !== undefined)
    ) {
      throw new Error("Each item in attachmentsUpdates must be an object with an 'id' property.");
    }
    return this._requestHandler.request(
      'PATCH',
      '/qbench/api/v2/attachments',
      null,
      attachmentsUpdates
    );
  }

  /**
   * Retrieves a single attachment's metadata by its ID.
   * Corresponds to `GET /qbench/api/v2/attachments/{attachment_id}`
   * @param {number} attachment_id The ID of the attachment.
   * @returns {Promise<object>} The attachment metadata object (structure defined by QBench API). Does not contain file content.
   */
  async getAttachmentById(attachment_id) {
    if (!attachment_id) {
      throw new Error('Attachment ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/attachments/${attachment_id}`);
  }

  /**
   * Downloads attachment file content from a listed attachment record. QBench
   * normally exposes a presigned download URL on the record as `url` or a
   * similarly named field.
   *
   * @param {object} record Attachment metadata record.
   * @returns {Promise<{ buffer: Buffer, fileName: string, contentType: string|null, attachmentId: number|string|undefined, sourceUrl: string }>}
   */
  async downloadAttachmentRecordFile(record) {
    if (!record || typeof record !== 'object') {
      throw new Error('Attachment record is required.');
    }
    return downloadFileFromRecord(record, record.id);
  }

  /**
   * Downloads an attachment file by first fetching fresh attachment metadata,
   * then following the presigned download URL returned by QBench.
   *
   * @param {number} attachment_id The ID of the attachment.
   * @returns {Promise<{ buffer: Buffer, fileName: string, contentType: string|null, attachmentId: number, sourceUrl: string }>}
   */
  async downloadAttachmentFile(attachment_id) {
    if (!attachment_id) {
      throw new Error('Attachment ID is required.');
    }
    const record = unwrapData(await this.getAttachmentById(attachment_id));
    return downloadFileFromRecord(record, attachment_id);
  }

  /**
   * Deletes a single attachment by its ID.
   * Corresponds to `DELETE /qbench/api/v2/attachments/{attachment_id}`
   * @param {number} attachment_id The ID of the attachment to delete.
   * @returns {Promise<null>} Resolves with null on success (204 No Content).
   */
  async deleteAttachment(attachment_id) {
    if (!attachment_id) {
      throw new Error('Attachment ID is required.');
    }
    return this._requestHandler.request('DELETE', `/qbench/api/v2/attachments/${attachment_id}`);
  }

  // QBench exposes attachment file bytes through presigned URL fields on the
  // attachment metadata; downloadAttachmentFile/downloadAttachmentRecordFile
  // follow those URLs when present.
}

// --- End of File: src/tags/attachment.js ---
