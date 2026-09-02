// File: src/client.js
import { AuthManager } from './auth.js';
import { RequestHandler } from './request.js';
import { QBenchSdkError } from './errors.js';

// Import Tag Handlers (assuming they exist in ./tags/)
import { AccessioningTypeHandler } from './tags/accessioningType.js';
import { ApiClientHandler } from './tags/apiClient.js';
import { AssayCategoryHandler } from './tags/assayCategory.js';
import { AssayHandler } from './tags/assay.js';
import { AttachmentHandler } from './tags/attachment.js';
import { AuthenticationHandler } from './tags/authentication.js';
import { BatchHandler } from './tags/batch.js';
import { CommentHandler } from './tags/comment.js';
import { ContactHandler } from './tags/contact.js';
import { CustomerHandler } from './tags/customer.js';
import { DivisionHandler } from './tags/division.js';
import { EpicHandler } from './tags/epic.js';
import { IntegrationHandler } from './tags/integration.js';
import { InvoiceItemHandler } from './tags/invoiceItem.js';
import { InvoiceHandler } from './tags/invoice.js';
import { LabelHandler } from './tags/label.js';
import { LocationTypeHandler } from './tags/locationType.js';
import { LocationHandler } from './tags/location.js';
import { OrderHandler } from './tags/order.js';
import { PanelHandler } from './tags/panel.js';
import { PaymentHandler } from './tags/payment.js';
import { PrintDocHandler } from './tags/printdoc.js';
import { ProjectHandler } from './tags/project.js';
import { QuotationHandler } from './tags/quotation.js';
import { ReportHandler } from './tags/report.js';
import { SampleHandler } from './tags/sample.js';
import { SourceHandler } from './tags/source.js';
import { TeamHandler } from './tags/team.js';
import { TestHandler } from './tags/test.js';
import { TurnaroundHandler } from './tags/turnaround.js';
import { UserHandler } from './tags/user.js';
import { WorksheetHandler } from './tags/worksheet.js';

/**
 * QBench API Client.
 */
export class QBenchClient {
  #requestHandler;

  // Tag-based handlers
  accessioningType;
  apiClient;
  assayCategory;
  assay;
  attachment;
  authentication; // Exposed for completeness, but internal auth is preferred
  batch;
  comment;
  contact;
  customer;
  division;
  epic;
  integration;
  invoiceItem;
  invoice;
  label;
  locationType;
  location;
  order;
  panel;
  payment;
  printdoc;
  project;
  quotation;
  report;
  sample;
  source;
  team;
  test;
  turnaround;
  user;
  worksheet;

  /**
   * Creates a new QBenchClient instance.
   * @param {object} config Configuration options.
   * @param {string} [config.clientId] Your QBench API Client ID.
   * @param {string} [config.clientSecret] Your QBench API Client Secret.
   * @param {string} config.baseUrl The base URL of your QBench instance (e.g., 'https://yourcompany.qbench.net').
   * @param {{ get: Function, set: Function, deleteIfMatch?: Function }} [config.tokenStore] Token persistence adapter.
   * @param {{ getAccessToken: Function, invalidateAccessToken?: Function }} [config.accessTokenProvider] Fully custom authentication provider.
   * @param {string} [config.tokenCacheKey] Override the derived credential cache key.
   * @param {number} [config.tokenExpiryBufferSeconds=120] Refresh this many seconds before expiry.
   * @param {number} [config.authTimeoutMs=30000] Authentication timeout in milliseconds.
   * @param {typeof fetch} [config.fetch=globalThis.fetch] Fetch implementation used for auth and API calls.
   * @param {Crypto} [config.webCrypto=globalThis.crypto] Web Crypto implementation used for JWT signing.
   * @param {number} [config.maxRetries=3] Maximum transient retries for GET and HEAD requests.
   * @param {number} [config.initialBackoffMs=1000] Initial delay (ms) for exponential backoff.
   * @param {number} [config.maxConcurrentRequests=10] Maximum concurrent requests allowed.
   * @param {number} [config.timeoutMs=30000] Request timeout in milliseconds.
   * @param {boolean} [config.includeSensitiveErrorDetails=false] Include request data and raw API error details in thrown errors. Never enable this when errors may be logged.
   */
  constructor(config) {
    if (!config || !config.baseUrl) {
      throw new QBenchSdkError('Configuration object with baseUrl is required.');
    }

    let baseUrl;
    try {
      baseUrl = new URL(config.baseUrl);
      if (baseUrl.protocol !== 'https:') throw new Error('baseUrl must use HTTPS.');
    } catch (error) {
      throw new QBenchSdkError(`Invalid QBench baseUrl. ${error.message}`);
    }

    let authManager;
    if (config.accessTokenProvider) {
      if (typeof config.accessTokenProvider.getAccessToken !== 'function') {
        throw new QBenchSdkError(
          'accessTokenProvider must implement async getAccessToken(options).'
        );
      }
      authManager = config.accessTokenProvider;
    } else {
      if (!config.clientId || !config.clientSecret) {
        throw new QBenchSdkError(
          'clientId and clientSecret are required when accessTokenProvider is not supplied.'
        );
      }
      authManager = new AuthManager(config.clientId, config.clientSecret, baseUrl, {
        tokenStore: config.tokenStore,
        tokenCacheKey: config.tokenCacheKey,
        tokenExpiryBufferSeconds: config.tokenExpiryBufferSeconds,
        authTimeoutMs: config.authTimeoutMs,
        fetch: config.fetch,
        webCrypto: config.webCrypto,
        now: config.now,
        includeSensitiveErrorDetails: config.includeSensitiveErrorDetails,
      });
    }

    this.#requestHandler = new RequestHandler(authManager, baseUrl, {
      maxRetries: config.maxRetries,
      initialBackoffMs: config.initialBackoffMs,
      maxConcurrentRequests: config.maxConcurrentRequests,
      timeoutMs: config.timeoutMs,
      fetch: config.fetch,
      includeSensitiveErrorDetails: config.includeSensitiveErrorDetails,
    });

    // Initialize tag handlers, passing the request handler
    this.accessioningType = new AccessioningTypeHandler(this.#requestHandler);
    this.apiClient = new ApiClientHandler(this.#requestHandler);
    this.assayCategory = new AssayCategoryHandler(this.#requestHandler);
    this.assay = new AssayHandler(this.#requestHandler);
    this.attachment = new AttachmentHandler(this.#requestHandler);
    this.authentication = new AuthenticationHandler(this.#requestHandler);
    this.batch = new BatchHandler(this.#requestHandler);
    this.comment = new CommentHandler(this.#requestHandler);
    this.contact = new ContactHandler(this.#requestHandler);
    this.customer = new CustomerHandler(this.#requestHandler);
    this.division = new DivisionHandler(this.#requestHandler);
    this.epic = new EpicHandler(this.#requestHandler);
    this.integration = new IntegrationHandler(this.#requestHandler);
    this.invoiceItem = new InvoiceItemHandler(this.#requestHandler);
    this.invoice = new InvoiceHandler(this.#requestHandler);
    this.label = new LabelHandler(this.#requestHandler);
    this.locationType = new LocationTypeHandler(this.#requestHandler);
    this.location = new LocationHandler(this.#requestHandler);
    this.order = new OrderHandler(this.#requestHandler);
    this.panel = new PanelHandler(this.#requestHandler);
    this.payment = new PaymentHandler(this.#requestHandler);
    this.printdoc = new PrintDocHandler(this.#requestHandler);
    this.project = new ProjectHandler(this.#requestHandler);
    this.quotation = new QuotationHandler(this.#requestHandler);
    this.report = new ReportHandler(this.#requestHandler);
    this.sample = new SampleHandler(this.#requestHandler);
    this.source = new SourceHandler(this.#requestHandler);
    this.team = new TeamHandler(this.#requestHandler);
    this.test = new TestHandler(this.#requestHandler);
    this.turnaround = new TurnaroundHandler(this.#requestHandler);
    this.user = new UserHandler(this.#requestHandler);
    this.worksheet = new WorksheetHandler(this.#requestHandler);
  }
}

// --- End of File: src/client.js ---
