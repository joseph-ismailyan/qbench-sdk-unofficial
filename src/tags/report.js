// File: src/tags/report.js
import { BaseHandler } from './baseHandler.js';

/**
 * Parses QBench's `date_generated` field (format: "MM/DD/YYYY hh:mm AM/PM")
 * into a Date. Returns 0-epoch on parse failure so it sorts last.
 */
function parseQbenchDateTime(value) {
  if (!value || typeof value !== 'string') return new Date(0);
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? new Date(ts) : new Date(0);
}

function unwrapData(response) {
  if (response && typeof response === 'object' && response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
    return response.data;
  }
  return response;
}

function unwrapList(response) {
  if (Array.isArray(response)) return response;
  if (response && Array.isArray(response.data)) return response.data;
  if (response && Array.isArray(response.results)) return response.results;
  return [];
}

/**
 * Extracts a filename from a presigned URL's path. Returns a sensible
 * fallback if the path doesn't contain one.
 */
function fileNameFromUrl(url, fallback) {
  try {
    const parsed = new URL(url);
    const last = parsed.pathname.split('/').filter(Boolean).pop();
    if (last) return decodeURIComponent(last);
  } catch {
    // fall through
  }
  return fallback;
}

function requireHttpsDownloadUrl(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch {
    const err = new Error('QBench report download URL is invalid.');
    err.name = 'QBenchReportError';
    throw err;
  }

  if (url.protocol !== 'https:') {
    const err = new Error('QBench report download URL must use HTTPS.');
    err.name = 'QBenchReportError';
    throw err;
  }

  return url;
}

export class ReportHandler extends BaseHandler {
  /**
   * Retrieves a list of generated reports.
   *
   * Corresponds to `GET /qbench/api/v2/reports`
   *
   * Response shape (verified against sandbox 2026-04):
   *   { data: [ { id, order_id, render_status, url, date_generated, ... }, ... ] }
   *
   * Each record includes a presigned S3 download URL in the `url` field.
   * That URL is time-limited (carries an `Expires=` query param) — fetch the
   * file as soon as you receive it.
   *
   * @param {object} [params] Filters/pagination, e.g.
   *   `{ page_num, page_size, order_ids, sample_ids, test_ids, statuses }`.
   * @returns {Promise<object>} `{ data, page_number, total_count, total_pages }`.
   */
  async listReports(params) {
    return this._requestHandler.request('GET', '/qbench/api/v2/reports', params);
  }

  /**
   * Creates (generates) a list of new reports.
   * Corresponds to `POST /qbench/api/v2/reports`
   * @param {Array<object>} reportsData Generation requests (CreateGenReportSchema).
   * @returns {Promise<object>} Generated report metadata.
   */
  async createReports(reportsData) {
    if (!Array.isArray(reportsData) || reportsData.length === 0) {
      throw new Error('reportsData must be a non-empty array.');
    }
    return this._requestHandler.request('POST', '/qbench/api/v2/reports', null, reportsData);
  }

  /**
   * Retrieves a single generated report's metadata by its ID.
   *
   * Corresponds to `GET /qbench/api/v2/reports/{report_id}`
   *
   * Response shape (verified): `{ data: { id, url, render_status, ... } }`.
   * The `url` field is a presigned S3 V2 download link that returns the
   * generated PDF on a plain GET (no auth headers required). The URL
   * carries an `Expires=` query param and will reject the request after
   * that time, so fetch the bytes immediately if you intend to forward
   * them to another system.
   *
   * @param {number} report_id The ID of the generated report.
   * @returns {Promise<object>} Wrapped record (use {@link ReportHandler#getReportRecordById}
   *   if you want the unwrapped inner object).
   */
  async getReportById(report_id) {
    if (!report_id) {
      throw new Error('Report ID is required.');
    }
    return this._requestHandler.request('GET', `/qbench/api/v2/reports/${report_id}`);
  }

  /**
   * Same as {@link ReportHandler#getReportById} but returns the inner
   * record (unwraps the outer `{ data: ... }` envelope).
   * @param {number} report_id
   * @returns {Promise<object>} The bare report record.
   */
  async getReportRecordById(report_id) {
    const wrapped = await this.getReportById(report_id);
    return unwrapData(wrapped);
  }

  /**
   * Returns the most-recently-generated SUCCESSFUL report for an order, or
   * `null` if none exist. "Most recent" is determined by parsing
   * `date_generated` (format: "MM/DD/YYYY hh:mm AM/PM"); ties fall back to
   * the highest report `id`.
   *
   * @param {number} order_id
   * @returns {Promise<object|null>} The latest report record (with `url`),
   *   or `null` when the order has no SUCCESSFUL reports.
   */
  async getLatestSuccessfulReportForOrder(order_id) {
    if (!order_id) {
      throw new Error('order_id is required.');
    }
    const response = await this.listReports({ order_ids: [order_id] });
    const records = unwrapList(response);
    const successful = records.filter((r) => r && r.render_status === 'SUCCESSFUL');
    if (successful.length === 0) return null;

    successful.sort((a, b) => {
      const ta = parseQbenchDateTime(a.date_generated).getTime();
      const tb = parseQbenchDateTime(b.date_generated).getTime();
      if (ta !== tb) return tb - ta; // newest first
      return (b.id ?? 0) - (a.id ?? 0);
    });
    return successful[0];
  }

  /**
   * Downloads the generated PDF for a report by ID.
   *
   * Two-step: fetch metadata via {@link ReportHandler#getReportRecordById}
   * to get the presigned `url`, then GET the URL with the global `fetch`.
   * The URL is fully self-authenticating (S3 V2 presigned), so no headers
   * are forwarded other than what `fetch` adds by default.
   *
   * @param {number} report_id
   * @returns {Promise<{ buffer: Buffer, fileName: string, contentType: string|null, reportId: number, sourceUrl: string }>}
   */
  async downloadReportPdf(report_id) {
    if (!report_id) {
      throw new Error('Report ID is required.');
    }
    const record = await this.getReportRecordById(report_id);
    if (!record || !record.url) {
      const err = new Error(
        `QBench report ${report_id} has no url field. Render status: ${record?.render_status ?? 'unknown'}`
      );
      err.name = 'QBenchReportError';
      throw err;
    }

    requireHttpsDownloadUrl(record.url);
    const res = await fetch(record.url);
    if (!res.ok) {
      await res.text().catch(() => '');
      const err = new Error(`Failed to download report ${report_id}: HTTP ${res.status}.`);
      err.name = 'QBenchReportError';
      err.status = res.status;
      throw err;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type');
    const fileName = fileNameFromUrl(record.url, `report-${report_id}.pdf`);

    return { buffer, fileName, contentType, reportId: report_id, sourceUrl: record.url };
  }

  /**
   * Convenience: returns the PDF for the latest SUCCESSFUL report on an
   * order. Returns `null` if the order has no SUCCESSFUL reports.
   *
   * @param {number} order_id
   * @returns {Promise<({ buffer: Buffer, fileName: string, contentType: string|null, reportId: number, sourceUrl: string })|null>}
   */
  async downloadLatestReportPdfForOrder(order_id) {
    const latest = await this.getLatestSuccessfulReportForOrder(order_id);
    if (!latest) return null;
    return this.downloadReportPdf(latest.id);
  }

  /**
   * Publishes one or more generated reports, potentially sending emails.
   * Corresponds to `POST /qbench/api/v2/reports/publish`
   * @param {Array<object>} publishData Items must include `id`.
   * @returns {Promise<null>} Resolves with null on 204 No Content.
   */
  async publishReports(publishData) {
    if (!Array.isArray(publishData) || publishData.length === 0) {
      throw new Error('publishData must be a non-empty array.');
    }
    if (!publishData.every((item) => item && typeof item === 'object' && item.id !== undefined)) {
      throw new Error("Each item in publishData must be an object with an 'id' property.");
    }
    return this._requestHandler.request(
      'POST',
      '/qbench/api/v2/reports/publish',
      null,
      publishData
    );
  }
}

// --- End of File: src/tags/report.js ---
