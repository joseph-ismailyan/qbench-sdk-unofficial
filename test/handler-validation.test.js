import test from 'node:test';
import assert from 'node:assert/strict';
import { QBenchClient } from '../index.js';

const BASE_URL = 'https://handler-validation.qbench.test';

const missingParentIdCases = [
  ['apiClient.listCustomersForApiClient', (c) => c.apiClient.listCustomersForApiClient(0)],
  ['assay.listAccessioningTypesForAssay', (c) => c.assay.listAccessioningTypesForAssay(0)],
  ['assay.listAttachmentsForAssay', (c) => c.assay.listAttachmentsForAssay(0)],
  ['assay.listDivisionsForAssay', (c) => c.assay.listDivisionsForAssay(0)],
  ['assay.listPanelsForAssay', (c) => c.assay.listPanelsForAssay(0)],
  ['assay.listTurnaroundsForAssay', (c) => c.assay.listTurnaroundsForAssay(0)],
  ['batch.listAttachmentsForBatch', (c) => c.batch.listAttachmentsForBatch(0)],
  ['batch.listChildBatches', (c) => c.batch.listChildBatches(0)],
  ['batch.listParentBatches', (c) => c.batch.listParentBatches(0)],
  ['batch.listSamplesForBatch', (c) => c.batch.listSamplesForBatch(0)],
  ['batch.listTestsForBatch', (c) => c.batch.listTestsForBatch(0)],
  ['batch.getBatchWorksheetData', (c) => c.batch.getBatchWorksheetData(0)],
  ['contact.listCustomersForContact', (c) => c.contact.listCustomersForContact(0)],
  ['contact.associateContactWithCustomers', (c) => c.contact.associateContactWithCustomers(0, [{ customer_id: 1 }])],
  ['customer.listAttachmentsForCustomer', (c) => c.customer.listAttachmentsForCustomer(0)],
  ['customer.listContactsForCustomer', (c) => c.customer.listContactsForCustomer(0)],
  ['customer.associateCustomerWithContacts', (c) => c.customer.associateCustomerWithContacts(0, [{ contact_id: 1 }])],
  ['customer.disassociateContactFromCustomer', (c) => c.customer.disassociateContactFromCustomer(0, 1)],
  ['customer.listDivisionsForCustomer', (c) => c.customer.listDivisionsForCustomer(0)],
  ['customer.listSourcesForCustomer', (c) => c.customer.listSourcesForCustomer(0)],
  ['invoice.listItemsForInvoice', (c) => c.invoice.listItemsForInvoice(0)],
  ['invoice.listOrdersForInvoice', (c) => c.invoice.listOrdersForInvoice(0)],
  ['invoice.listPaymentsForInvoice', (c) => c.invoice.listPaymentsForInvoice(0)],
  ['invoice.sendInvoiceEmail', (c) => c.invoice.sendInvoiceEmail(0, {})],
  ['invoice.syncInvoice', (c) => c.invoice.syncInvoice(0)],
  ['order.listAttachmentsForOrder', (c) => c.order.listAttachmentsForOrder(0)],
  ['order.listCommentsForOrder', (c) => c.order.listCommentsForOrder(0)],
  ['order.listInvoicesForOrder', (c) => c.order.listInvoicesForOrder(0)],
  ['order.listReportsForOrder', (c) => c.order.listReportsForOrder(0)],
  ['order.listSamplesForOrder', (c) => c.order.listSamplesForOrder(0)],
  ['order.listTestsForOrder', (c) => c.order.listTestsForOrder(0)],
  ['panel.listAssaysForPanel', (c) => c.panel.listAssaysForPanel(0)],
  ['payment.listInvoicesForPayment', (c) => c.payment.listInvoicesForPayment(0)],
  ['payment.applyPaymentToInvoices', (c) => c.payment.applyPaymentToInvoices(0, [{ invoice_id: 1 }])],
  ['payment.updateInvoicePaymentApplications', (c) => c.payment.updateInvoicePaymentApplications(0, [{ invoice_id: 1 }])],
  ['payment.unapplyPaymentFromInvoice', (c) => c.payment.unapplyPaymentFromInvoice(0, 1)],
  ['payment.sendPaymentEmail', (c) => c.payment.sendPaymentEmail(0, { emails: ['x@example.test'] })],
  ['sample.listAttachmentsForSample', (c) => c.sample.listAttachmentsForSample(0)],
  ['sample.listBatchesForSample', (c) => c.sample.listBatchesForSample(0)],
  ['sample.listReportsForSample', (c) => c.sample.listReportsForSample(0)],
  ['sample.listSubSamples', (c) => c.sample.listSubSamples(0)],
  ['sample.listTestsForSample', (c) => c.sample.listTestsForSample(0)],
  ['test.listAttachmentsForTest', (c) => c.test.listAttachmentsForTest(0)],
  ['test.listBatchesForTest', (c) => c.test.listBatchesForTest(0)],
  ['test.listReportsForTest', (c) => c.test.listReportsForTest(0)],
  ['turnaround.listDivisionsForTurnaround', (c) => c.turnaround.listDivisionsForTurnaround(0)],
];

for (const [name, invoke] of missingParentIdCases) {
  test(`${name} rejects a missing parent ID before fetch`, async () => {
    let fetchCalls = 0;
    const client = createClient(async () => {
      fetchCalls++;
      return jsonResponse({ ok: true });
    });
    await assert.rejects(() => invoke(client), /required/i);
    assert.equal(fetchCalls, 0);
  });
}

test('association and payment helpers validate secondary inputs before fetch', async () => {
  const client = createClient(failIfFetched);
  const cases = [
    () => client.contact.associateContactWithCustomers(1, []),
    () => client.customer.associateCustomerWithContacts(1, []),
    () => client.customer.disassociateContactFromCustomer(1, 0),
    () => client.payment.applyPaymentToInvoices(1, []),
    () => client.payment.applyPaymentToInvoices(1, [{}]),
    () => client.payment.updateInvoicePaymentApplications(1, []),
    () => client.payment.updateInvoicePaymentApplications(1, [{}]),
    () => client.payment.unapplyPaymentFromInvoice(1, 0),
    () => client.payment.sendPaymentEmail(1, null),
    () => client.payment.sendPaymentEmail(1, { emails: [] }),
  ];

  for (const invoke of cases) {
    await assert.rejects(invoke);
  }
});

const integrationKinds = [
  'Assay',
  'Contact',
  'Customer',
  'InvoicePayment',
  'Invoice',
  'Payment',
];

for (const kind of integrationKinds) {
  test(`integration ${kind} relationships validate every ID and array branch`, async () => {
    const client = createClient(failIfFetched);
    const create = client.integration[`create${kind}IntegrationRelationships`].bind(client.integration);
    const get = client.integration[`get${kind}IntegrationRelationship`].bind(client.integration);

    await assert.rejects(() => create(0, [{ entity_id: 1 }]), /Integration ID is required/);
    await assert.rejects(() => create(1, null), /non-empty array/);
    await assert.rejects(() => get(0, 1), /Integration ID is required/);
  });
}

test('attachment, report, print document, and label helpers validate malformed inputs', async () => {
  const client = createClient(failIfFetched);
  const cases = [
    () => client.attachment.createAttachments([]),
    () => client.attachment.updateAttachments([]),
    () => client.attachment.updateAttachments([{}]),
    () => client.attachment.getAttachmentById(0),
    () => client.attachment.deleteAttachment(0),
    () => client.report.createReports(null),
    () => client.report.publishReports(null),
    () => client.report.publishReports([null]),
    () => client.printdoc.createPrintDocs([]),
    () => client.printdoc.getPrintDocById(0),
    () => client.label.generateLabels(0, 'samples', [{ id: 1 }]),
    () => client.label.generateLabels(1, '', [{ id: 1 }]),
    () => client.label.generateLabels(1, 'samples', []),
    () => client.label.generateLabels(1, 'samples', [{}]),
  ];

  for (const invoke of cases) {
    await assert.rejects(invoke);
  }
});

test('worksheet named-cell updates validate and send the documented payload', async () => {
  const client = createClient(failIfFetched);
  await assert.rejects(() => client.test.updateTestWorksheetNamedCells([]), /non-empty array/);
  await assert.rejects(() => client.test.updateTestWorksheetNamedCells([{}]), /named-cells|properties/i);
  await assert.rejects(
    () => client.test.updateTestWorksheetNamedCells([{ id: 1 }]),
    /named-cells|properties/i
  );

  let observed;
  const successClient = createClient(async (url, init) => {
    observed = { url: new URL(url), init };
    return new Response(null, { status: 204 });
  });
  const updates = [{ id: 1, qb_dynamic_spreadsheet_patch: { result: 'PASS' } }];
  assert.equal(await successClient.test.updateTestWorksheetNamedCells(updates), null);
  assert.equal(observed.url.pathname, '/qbench/api/v2/tests/worksheets/dynamic/named-cells');
  assert.equal(observed.init.method, 'PATCH');
  assert.deepEqual(JSON.parse(observed.init.body), updates);
});

function createClient(fetch) {
  return new QBenchClient({
    baseUrl: BASE_URL,
    accessTokenProvider: {
      async getAccessToken() {
        return 'synthetic-token';
      },
    },
    fetch,
    maxRetries: 0,
  });
}

async function failIfFetched() {
  throw new Error('fetch must not be called for invalid input');
}

function jsonResponse(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
