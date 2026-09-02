export type QBenchId = string | number;

export type QBenchQueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly (string | number | boolean)[];

/** QBench query parameters use the API's native field names. */
export type QBenchQuery = Record<string, QBenchQueryValue>;

/**
 * QBench payloads are intentionally open-ended because fields and schemas can
 * be customized independently by each QBench tenant.
 */
export type QBenchPayload = Record<string, unknown>;

/** Raw response data is tenant- and endpoint-specific and must be narrowed by consumers. */
export type QBenchResponse = unknown;

export interface QBenchTokenRecord {
  accessToken: string;
  tokenType: string;
  expiresAt: number;
  refreshAt?: number;
}

export interface QBenchTokenStore {
  get(key: string): Promise<QBenchTokenRecord | null>;
  set(key: string, token: QBenchTokenRecord): Promise<void>;
  deleteIfMatch?(key: string, rejectedAccessToken: string): Promise<boolean>;
}

export interface QBenchAccessTokenProvider {
  getAccessToken(options?: { forceRefresh?: boolean }): Promise<string>;
  invalidateAccessToken?(rejectedAccessToken: string): Promise<boolean>;
}

export interface QBenchClientConfig {
  baseUrl: string;
  clientId?: string;
  clientSecret?: string;
  tokenStore?: QBenchTokenStore;
  accessTokenProvider?: QBenchAccessTokenProvider;
  tokenCacheKey?: string;
  tokenExpiryBufferSeconds?: number;
  authTimeoutMs?: number;
  fetch?: typeof fetch;
  webCrypto?: Crypto;
  maxRetries?: number;
  initialBackoffMs?: number;
  maxConcurrentRequests?: number;
  timeoutMs?: number;
  includeSensitiveErrorDetails?: boolean;
}

export interface QBenchDownloadedFile {
  buffer: Uint8Array;
  fileName: string;
  contentType: string | null;
  sourceUrl: string;
}

export interface AccessioningTypeHandler {
  listAccessioningTypes(params?: QBenchQuery): Promise<QBenchResponse>;
  getAccessioningTypeById(id: QBenchId): Promise<QBenchResponse>;
}

export interface ApiClientHandler {
  listApiClients(params?: QBenchQuery): Promise<QBenchResponse>;
  getApiClientById(id: QBenchId): Promise<QBenchResponse>;
  listCustomersForApiClient(
    id: QBenchId,
    params?: QBenchQuery,
  ): Promise<QBenchResponse>;
}

export interface AssayCategoryHandler {
  listAssayCategories(params?: QBenchQuery): Promise<QBenchResponse>;
  getAssayCategoryById(id: QBenchId): Promise<QBenchResponse>;
}

export interface AssayHandler {
  listAssays(params?: QBenchQuery): Promise<QBenchResponse>;
  createAssays(data: QBenchPayload[]): Promise<QBenchResponse>;
  updateAssays(data: QBenchPayload[]): Promise<QBenchResponse>;
  getAssayById(id: QBenchId): Promise<QBenchResponse>;
  deleteAssay(id: QBenchId): Promise<null>;
  listAccessioningTypesForAssay(
    id: QBenchId,
    params?: QBenchQuery,
  ): Promise<QBenchResponse>;
  listAttachmentsForAssay(
    id: QBenchId,
    params?: QBenchQuery,
  ): Promise<QBenchResponse>;
  listDivisionsForAssay(
    id: QBenchId,
    params?: QBenchQuery,
  ): Promise<QBenchResponse>;
  listPanelsForAssay(
    id: QBenchId,
    params?: QBenchQuery,
  ): Promise<QBenchResponse>;
  listTurnaroundsForAssay(
    id: QBenchId,
    params?: QBenchQuery,
  ): Promise<QBenchResponse>;
}

export interface AttachmentHandler {
  createAttachments(data: QBenchPayload[]): Promise<QBenchResponse>;
  createAttachmentWithFile(options: {
    attachment_type: string;
    object_id: QBenchId;
    file_name: string;
    file: Uint8Array | string;
    fileEncoding?: "base64" | "binary";
    contentType?: string;
  }): Promise<QBenchResponse>;
  updateAttachments(data: QBenchPayload[]): Promise<QBenchResponse>;
  getAttachmentById(id: QBenchId): Promise<QBenchResponse>;
  downloadAttachmentRecordFile(
    record: QBenchPayload,
  ): Promise<QBenchDownloadedFile & { attachmentId?: QBenchId }>;
  downloadAttachmentFile(
    id: QBenchId,
  ): Promise<QBenchDownloadedFile & { attachmentId: QBenchId }>;
  deleteAttachment(id: QBenchId): Promise<null>;
}

export interface AuthenticationHandler {
  getAccessToken(formData: QBenchPayload): Promise<QBenchResponse>;
  refreshAccessToken(formData: QBenchPayload): Promise<QBenchResponse>;
  getTokenInfo(): Promise<QBenchResponse>;
}

export interface BatchHandler {
  listBatches(params?: QBenchQuery): Promise<QBenchResponse>;
  getBatchById(id: QBenchId): Promise<QBenchResponse>;
  listAttachmentsForBatch(
    id: QBenchId,
    params?: QBenchQuery,
  ): Promise<QBenchResponse>;
  listChildBatches(id: QBenchId, params?: QBenchQuery): Promise<QBenchResponse>;
  listParentBatches(id: QBenchId, params?: QBenchQuery): Promise<QBenchResponse>;
  listSamplesForBatch(id: QBenchId, params?: QBenchQuery): Promise<QBenchResponse>;
  listTestsForBatch(id: QBenchId, params?: QBenchQuery): Promise<QBenchResponse>;
  getBatchWorksheetData(
    id: QBenchId,
    params?: QBenchQuery,
  ): Promise<QBenchResponse>;
}

export interface CommentHandler {
  listComments(params?: QBenchQuery): Promise<QBenchResponse>;
}

export interface ContactHandler {
  listContacts(params?: QBenchQuery): Promise<QBenchResponse>;
  createContacts(data: QBenchPayload[]): Promise<QBenchResponse>;
  updateContacts(data: QBenchPayload[]): Promise<QBenchResponse>;
  getContactById(id: QBenchId): Promise<QBenchResponse>;
  deleteContact(id: QBenchId): Promise<null>;
  listCustomersForContact(
    id: QBenchId,
    params?: QBenchQuery,
  ): Promise<QBenchResponse>;
  associateContactWithCustomers(
    id: QBenchId,
    data: QBenchPayload[],
  ): Promise<null>;
}

export interface CustomerHandler {
  listCustomers(params?: QBenchQuery): Promise<QBenchResponse>;
  createCustomers(data: QBenchPayload[]): Promise<QBenchResponse>;
  updateCustomers(data: QBenchPayload[]): Promise<QBenchResponse>;
  getCustomerById(id: QBenchId): Promise<QBenchResponse>;
  deleteCustomer(id: QBenchId): Promise<null>;
  listAttachmentsForCustomer(
    id: QBenchId,
    params?: QBenchQuery,
  ): Promise<QBenchResponse>;
  listContactsForCustomer(
    id: QBenchId,
    params?: QBenchQuery,
  ): Promise<QBenchResponse>;
  associateCustomerWithContacts(
    id: QBenchId,
    data: QBenchPayload[],
  ): Promise<null>;
  disassociateContactFromCustomer(
    customerId: QBenchId,
    contactId: QBenchId,
  ): Promise<null>;
  listDivisionsForCustomer(
    id: QBenchId,
    params?: QBenchQuery,
  ): Promise<QBenchResponse>;
  listSourcesForCustomer(
    id: QBenchId,
    params?: QBenchQuery,
  ): Promise<QBenchResponse>;
}

export interface DivisionHandler {
  listDivisions(params?: QBenchQuery): Promise<QBenchResponse>;
  getDivisionById(id: QBenchId): Promise<QBenchResponse>;
}

export interface EpicHandler {
  listEpics(params?: QBenchQuery): Promise<QBenchResponse>;
  getEpicById(id: QBenchId): Promise<QBenchResponse>;
}

export interface IntegrationHandler {
  listAssayIntegrationRelationships(
    integrationId: QBenchId,
    params?: QBenchQuery,
  ): Promise<QBenchResponse>;
  createAssayIntegrationRelationships(
    integrationId: QBenchId,
    data: QBenchPayload[],
  ): Promise<QBenchResponse>;
  getAssayIntegrationRelationship(
    integrationId: QBenchId,
    entityId: QBenchId,
  ): Promise<QBenchResponse>;
  listContactIntegrationRelationships(
    integrationId: QBenchId,
    params?: QBenchQuery,
  ): Promise<QBenchResponse>;
  createContactIntegrationRelationships(
    integrationId: QBenchId,
    data: QBenchPayload[],
  ): Promise<QBenchResponse>;
  getContactIntegrationRelationship(
    integrationId: QBenchId,
    entityId: QBenchId,
  ): Promise<QBenchResponse>;
  listCustomerIntegrationRelationships(
    integrationId: QBenchId,
    params?: QBenchQuery,
  ): Promise<QBenchResponse>;
  createCustomerIntegrationRelationships(
    integrationId: QBenchId,
    data: QBenchPayload[],
  ): Promise<QBenchResponse>;
  getCustomerIntegrationRelationship(
    integrationId: QBenchId,
    entityId: QBenchId,
  ): Promise<QBenchResponse>;
  listInvoicePaymentIntegrationRelationships(
    integrationId: QBenchId,
    params?: QBenchQuery,
  ): Promise<QBenchResponse>;
  createInvoicePaymentIntegrationRelationships(
    integrationId: QBenchId,
    data: QBenchPayload[],
  ): Promise<QBenchResponse>;
  getInvoicePaymentIntegrationRelationship(
    integrationId: QBenchId,
    entityId: QBenchId,
  ): Promise<QBenchResponse>;
  deleteInvoicePaymentIntegrationRelationship(
    integrationId: QBenchId,
    entityId: QBenchId,
  ): Promise<null>;
  listInvoiceIntegrationRelationships(
    integrationId: QBenchId,
    params?: QBenchQuery,
  ): Promise<QBenchResponse>;
  createInvoiceIntegrationRelationships(
    integrationId: QBenchId,
    data: QBenchPayload[],
  ): Promise<QBenchResponse>;
  getInvoiceIntegrationRelationship(
    integrationId: QBenchId,
    entityId: QBenchId,
  ): Promise<QBenchResponse>;
  listPaymentIntegrationRelationships(
    integrationId: QBenchId,
    params?: QBenchQuery,
  ): Promise<QBenchResponse>;
  createPaymentIntegrationRelationships(
    integrationId: QBenchId,
    data: QBenchPayload[],
  ): Promise<QBenchResponse>;
  getPaymentIntegrationRelationship(
    integrationId: QBenchId,
    entityId: QBenchId,
  ): Promise<QBenchResponse>;
}

export interface InvoiceHandler {
  listInvoices(params?: QBenchQuery): Promise<QBenchResponse>;
  createInvoices(data: QBenchPayload[]): Promise<QBenchResponse>;
  updateInvoices(data: QBenchPayload[]): Promise<QBenchResponse>;
  getInvoiceById(id: QBenchId): Promise<QBenchResponse>;
  deleteInvoice(id: QBenchId): Promise<null>;
  listItemsForInvoice(id: QBenchId, params?: QBenchQuery): Promise<QBenchResponse>;
  listOrdersForInvoice(id: QBenchId, params?: QBenchQuery): Promise<QBenchResponse>;
  listPaymentsForInvoice(
    id: QBenchId,
    params?: QBenchQuery,
  ): Promise<QBenchResponse>;
  sendInvoiceEmail(
    id: QBenchId,
    emailData?: QBenchPayload,
  ): Promise<QBenchResponse>;
  syncInvoice(id: QBenchId): Promise<null>;
}

export interface InvoiceItemHandler {
  listInvoiceItems(params?: QBenchQuery): Promise<QBenchResponse>;
  createInvoiceItems(data: QBenchPayload[]): Promise<QBenchResponse>;
  updateInvoiceItems(data: QBenchPayload[]): Promise<QBenchResponse>;
  getInvoiceItemById(id: QBenchId): Promise<QBenchResponse>;
  deleteInvoiceItem(id: QBenchId): Promise<null>;
}

export interface LabelHandler {
  generateLabels(
    labelId: QBenchId,
    dataType: string,
    entities: QBenchPayload[],
  ): Promise<QBenchResponse>;
}

export interface LocationHandler {
  listLocations(params?: QBenchQuery): Promise<QBenchResponse>;
  getLocationById(id: QBenchId): Promise<QBenchResponse>;
}

export interface LocationTypeHandler {
  listLocationTypes(params?: QBenchQuery): Promise<QBenchResponse>;
  getLocationTypeById(id: QBenchId): Promise<QBenchResponse>;
}

export interface OrderHandler {
  listOrders(params?: QBenchQuery): Promise<QBenchResponse>;
  createOrders(data: QBenchPayload[]): Promise<QBenchResponse>;
  updateOrders(data: QBenchPayload[]): Promise<QBenchResponse>;
  getOrderById(id: QBenchId): Promise<QBenchResponse>;
  deleteOrder(id: QBenchId): Promise<null>;
  listAttachmentsForOrder(
    id: QBenchId,
    params?: QBenchQuery,
  ): Promise<QBenchResponse>;
  listCommentsForOrder(id: QBenchId, params?: QBenchQuery): Promise<QBenchResponse>;
  listInvoicesForOrder(id: QBenchId, params?: QBenchQuery): Promise<QBenchResponse>;
  listReportsForOrder(id: QBenchId, params?: QBenchQuery): Promise<QBenchResponse>;
  listSamplesForOrder(id: QBenchId, params?: QBenchQuery): Promise<QBenchResponse>;
  listTestsForOrder(id: QBenchId, params?: QBenchQuery): Promise<QBenchResponse>;
}

export interface PanelHandler {
  listPanels(params?: QBenchQuery): Promise<QBenchResponse>;
  createPanels(data: QBenchPayload[]): Promise<QBenchResponse>;
  updatePanels(data: QBenchPayload[]): Promise<QBenchResponse>;
  getPanelById(id: QBenchId): Promise<QBenchResponse>;
  deletePanel(id: QBenchId): Promise<null>;
  listAssaysForPanel(id: QBenchId, params?: QBenchQuery): Promise<QBenchResponse>;
}

export interface PaymentHandler {
  listPayments(params?: QBenchQuery): Promise<QBenchResponse>;
  createPayments(data: QBenchPayload[]): Promise<QBenchResponse>;
  updatePayments(data: QBenchPayload[]): Promise<QBenchResponse>;
  getPaymentById(id: QBenchId): Promise<QBenchResponse>;
  deletePayment(id: QBenchId): Promise<null>;
  listInvoicesForPayment(
    id: QBenchId,
    params?: QBenchQuery,
  ): Promise<QBenchResponse>;
  applyPaymentToInvoices(id: QBenchId, data: QBenchPayload[]): Promise<null>;
  updateInvoicePaymentApplications(
    id: QBenchId,
    data: QBenchPayload[],
  ): Promise<null>;
  unapplyPaymentFromInvoice(
    paymentId: QBenchId,
    invoiceId: QBenchId,
  ): Promise<null>;
  sendPaymentEmail(id: QBenchId, emailData: QBenchPayload): Promise<null>;
}

export interface PrintDocHandler {
  createPrintDocs(data: QBenchPayload[]): Promise<QBenchResponse>;
  getPrintDocById(id: QBenchId): Promise<QBenchResponse>;
}

export interface ProjectHandler {
  listProjects(params?: QBenchQuery): Promise<QBenchResponse>;
  getProjectById(id: QBenchId): Promise<QBenchResponse>;
}

export interface QuotationHandler {
  listQuotations(params?: QBenchQuery): Promise<QBenchResponse>;
  getQuotationById(id: QBenchId): Promise<QBenchResponse>;
}

export interface ReportHandler {
  listReports(params?: QBenchQuery): Promise<QBenchResponse>;
  createReports(data: QBenchPayload[]): Promise<QBenchResponse>;
  getReportById(id: QBenchId): Promise<QBenchResponse>;
  getReportRecordById(id: QBenchId): Promise<QBenchResponse>;
  getLatestSuccessfulReportForOrder(
    orderId: QBenchId,
  ): Promise<QBenchPayload | null>;
  downloadReportPdf(
    id: QBenchId,
  ): Promise<QBenchDownloadedFile & { reportId: QBenchId }>;
  downloadLatestReportPdfForOrder(
    orderId: QBenchId,
  ): Promise<(QBenchDownloadedFile & { reportId: QBenchId }) | null>;
  publishReports(data: QBenchPayload[]): Promise<null>;
}

export interface SampleHandler {
  listSamples(params?: QBenchQuery): Promise<QBenchResponse>;
  createSamples(data: QBenchPayload[]): Promise<QBenchResponse>;
  updateSamples(data: QBenchPayload[]): Promise<QBenchResponse>;
  getSampleById(id: QBenchId): Promise<QBenchResponse>;
  deleteSample(id: QBenchId): Promise<null>;
  listAttachmentsForSample(
    id: QBenchId,
    params?: QBenchQuery,
  ): Promise<QBenchResponse>;
  listBatchesForSample(id: QBenchId, params?: QBenchQuery): Promise<QBenchResponse>;
  listReportsForSample(id: QBenchId, params?: QBenchQuery): Promise<QBenchResponse>;
  listSubSamples(id: QBenchId, params?: QBenchQuery): Promise<QBenchResponse>;
  listTestsForSample(id: QBenchId, params?: QBenchQuery): Promise<QBenchResponse>;
}

export interface SourceHandler {
  listSources(params?: QBenchQuery): Promise<QBenchResponse>;
  getSourceById(id: QBenchId): Promise<QBenchResponse>;
}

export interface TeamHandler {
  listTeams(params?: QBenchQuery): Promise<QBenchResponse>;
  getTeamById(id: QBenchId): Promise<QBenchResponse>;
}

export interface TestHandler {
  listTests(params?: QBenchQuery): Promise<QBenchResponse>;
  createTests(data: QBenchPayload[]): Promise<QBenchResponse>;
  updateTests(data: QBenchPayload[]): Promise<QBenchResponse>;
  updateTestWorksheetNamedCells(data: QBenchPayload[]): Promise<null>;
  getTestById(id: QBenchId): Promise<QBenchResponse>;
  deleteTest(id: QBenchId): Promise<null>;
  listAttachmentsForTest(
    id: QBenchId,
    params?: QBenchQuery,
  ): Promise<QBenchResponse>;
  listBatchesForTest(id: QBenchId, params?: QBenchQuery): Promise<QBenchResponse>;
  listReportsForTest(id: QBenchId, params?: QBenchQuery): Promise<QBenchResponse>;
  getTestWorksheetData(id: QBenchId, params?: QBenchQuery): Promise<QBenchResponse>;
  getTestWorksheetCells(id: QBenchId): Promise<Record<string, string | null>>;
}

export interface TurnaroundHandler {
  listTurnarounds(params?: QBenchQuery): Promise<QBenchResponse>;
  createTurnarounds(data: QBenchPayload[]): Promise<QBenchResponse>;
  updateTurnarounds(data: QBenchPayload[]): Promise<QBenchResponse>;
  getTurnaroundById(id: QBenchId): Promise<QBenchResponse>;
  deleteTurnaround(id: QBenchId): Promise<null>;
  listDivisionsForTurnaround(
    id: QBenchId,
    params?: QBenchQuery,
  ): Promise<QBenchResponse>;
}

export interface UserHandler {
  listUsers(params?: QBenchQuery): Promise<QBenchResponse>;
  getUserById(id: QBenchId): Promise<QBenchResponse>;
}

export interface WorksheetHandler {
  listWorksheets(params?: QBenchQuery): Promise<QBenchResponse>;
  getWorksheetById(id: QBenchId): Promise<QBenchResponse>;
}

export class QBenchClient {
  constructor(config: QBenchClientConfig);
  readonly accessioningType: AccessioningTypeHandler;
  readonly apiClient: ApiClientHandler;
  readonly assayCategory: AssayCategoryHandler;
  readonly assay: AssayHandler;
  readonly attachment: AttachmentHandler;
  readonly authentication: AuthenticationHandler;
  readonly batch: BatchHandler;
  readonly comment: CommentHandler;
  readonly contact: ContactHandler;
  readonly customer: CustomerHandler;
  readonly division: DivisionHandler;
  readonly epic: EpicHandler;
  readonly integration: IntegrationHandler;
  readonly invoiceItem: InvoiceItemHandler;
  readonly invoice: InvoiceHandler;
  readonly label: LabelHandler;
  readonly locationType: LocationTypeHandler;
  readonly location: LocationHandler;
  readonly order: OrderHandler;
  readonly panel: PanelHandler;
  readonly payment: PaymentHandler;
  readonly printdoc: PrintDocHandler;
  readonly project: ProjectHandler;
  readonly quotation: QuotationHandler;
  readonly report: ReportHandler;
  readonly sample: SampleHandler;
  readonly source: SourceHandler;
  readonly team: TeamHandler;
  readonly test: TestHandler;
  readonly turnaround: TurnaroundHandler;
  readonly user: UserHandler;
  readonly worksheet: WorksheetHandler;
}

export class MemoryTokenStore implements QBenchTokenStore {
  constructor(options?: { now?: () => number });
  get(key: string): Promise<QBenchTokenRecord | null>;
  set(key: string, token: QBenchTokenRecord): Promise<void>;
  deleteIfMatch(key: string, rejectedAccessToken: string): Promise<boolean>;
  clear(): Promise<void>;
}

export const sharedMemoryTokenStore: MemoryTokenStore;

export interface CloudflareKvNamespace {
  get(key: string, type: "json"): Promise<unknown>;
  put(
    key: string,
    value: string,
    options?: { expiration?: number },
  ): Promise<void>;
}

export class CloudflareKvTokenStore implements QBenchTokenStore {
  constructor(
    namespace: CloudflareKvNamespace,
    options?: { keyPrefix?: string; now?: () => number },
  );
  get(key: string): Promise<QBenchTokenRecord | null>;
  set(key: string, token: QBenchTokenRecord): Promise<void>;
}

export interface DynamoDbDocumentClientLike {
  send(command: object): Promise<object>;
}

export interface DynamoDbCommandConstructors {
  GetCommand: new (input: QBenchPayload) => object;
  PutCommand: new (input: QBenchPayload) => object;
  DeleteCommand: new (input: QBenchPayload) => object;
}

export class DynamoDbTokenStore implements QBenchTokenStore {
  constructor(options: {
    client: DynamoDbDocumentClientLike;
    tableName: string;
    partitionKey?: string;
    ttlAttribute?: string;
    keyPrefix?: string;
    consistentRead?: boolean;
    commands?: DynamoDbCommandConstructors;
  });
  get(key: string): Promise<QBenchTokenRecord | null>;
  set(key: string, token: QBenchTokenRecord): Promise<void>;
  deleteIfMatch(key: string, rejectedAccessToken: string): Promise<boolean>;
}

export class QBenchSdkError extends Error {}
export class QBenchAuthError extends QBenchSdkError {}
export class QBenchApiError extends QBenchSdkError {
  constructor(
    message: string,
    status: number,
    responseBody?: unknown,
    responseHeaders?: Record<string, string>,
    requestDetails?: QBenchPayload,
  );
  readonly status: number;
  readonly responseBody: unknown;
  readonly responseHeaders: Record<string, string> | null;
  readonly requestDetails: QBenchPayload | null;
  readonly errorType?: unknown;
  readonly errorDescription?: unknown;
  readonly errorToken?: unknown;
  readonly errors?: unknown;
}
export class QBenchRateLimitError extends QBenchApiError {}
export class QBenchValidationError extends QBenchApiError {}
export class QBenchForbiddenError extends QBenchApiError {}
export class QBenchNotFoundError extends QBenchApiError {}
