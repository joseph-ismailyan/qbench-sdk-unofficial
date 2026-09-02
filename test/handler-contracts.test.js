import test from 'node:test';
import assert from 'node:assert/strict';
import { QBenchClient } from '../index.js';

const BASE_URL = 'https://handler-contracts.qbench.test';
const LIST_PARAMS = { page_num: 2, page_size: 5 };

const simpleResources = [
  ['accessioningType', 'listAccessioningTypes', 'getAccessioningTypeById', 'accessioning-types'],
  ['apiClient', 'listApiClients', 'getApiClientById', 'api-clients'],
  ['assayCategory', 'listAssayCategories', 'getAssayCategoryById', 'assay-categories'],
  ['batch', 'listBatches', 'getBatchById', 'batches'],
  ['division', 'listDivisions', 'getDivisionById', 'divisions'],
  ['epic', 'listEpics', 'getEpicById', 'epics'],
  ['locationType', 'listLocationTypes', 'getLocationTypeById', 'location-types'],
  ['location', 'listLocations', 'getLocationById', 'locations'],
  ['project', 'listProjects', 'getProjectById', 'projects'],
  ['quotation', 'listQuotations', 'getQuotationById', 'quotations'],
  ['source', 'listSources', 'getSourceById', 'sources'],
  ['team', 'listTeams', 'getTeamById', 'teams'],
  ['user', 'listUsers', 'getUserById', 'users'],
  ['worksheet', 'listWorksheets', 'getWorksheetById', 'worksheets'],
];

const crudResources = [
  ['assay', 'listAssays', 'createAssays', 'updateAssays', 'getAssayById', 'deleteAssay', 'assays'],
  ['contact', 'listContacts', 'createContacts', 'updateContacts', 'getContactById', 'deleteContact', 'contacts'],
  ['customer', 'listCustomers', 'createCustomers', 'updateCustomers', 'getCustomerById', 'deleteCustomer', 'customers'],
  ['invoice', 'listInvoices', 'createInvoices', 'updateInvoices', 'getInvoiceById', 'deleteInvoice', 'invoices'],
  ['invoiceItem', 'listInvoiceItems', 'createInvoiceItems', 'updateInvoiceItems', 'getInvoiceItemById', 'deleteInvoiceItem', 'invoice-items'],
  ['order', 'listOrders', 'createOrders', 'updateOrders', 'getOrderById', 'deleteOrder', 'orders'],
  ['panel', 'listPanels', 'createPanels', 'updatePanels', 'getPanelById', 'deletePanel', 'panels'],
  ['payment', 'listPayments', 'createPayments', 'updatePayments', 'getPaymentById', 'deletePayment', 'payments'],
  ['sample', 'listSamples', 'createSamples', 'updateSamples', 'getSampleById', 'deleteSample', 'samples'],
  ['test', 'listTests', 'createTests', 'updateTests', 'getTestById', 'deleteTest', 'tests'],
  ['turnaround', 'listTurnarounds', 'createTurnarounds', 'updateTurnarounds', 'getTurnaroundById', 'deleteTurnaround', 'turnarounds'],
];

for (const [property, listMethod, getMethod, path] of simpleResources) {
  routeTest(`${property}.${listMethod}`, {
    invoke: (client) => client[property][listMethod](LIST_PARAMS),
    method: 'GET',
    path: `/qbench/api/v2/${path}`,
    query: LIST_PARAMS,
  });
  routeTest(`${property}.${getMethod}`, {
    invoke: (client) => client[property][getMethod](123),
    method: 'GET',
    path: `/qbench/api/v2/${path}/123`,
  });

  test(`${property}.${getMethod} rejects a missing ID`, async () => {
    await assert.rejects(() => createClient()[property][getMethod](0), /required/i);
  });
}

for (
  const [property, listMethod, createMethod, updateMethod, getMethod, deleteMethod, path] of
  crudResources
) {
  const createBody = [{ name: `Synthetic ${property}` }];
  const updateBody = [{ id: 123, name: `Updated ${property}` }];

  routeTest(`${property}.${listMethod}`, {
    invoke: (client) => client[property][listMethod](LIST_PARAMS),
    method: 'GET',
    path: `/qbench/api/v2/${path}`,
    query: LIST_PARAMS,
  });
  routeTest(`${property}.${createMethod}`, {
    invoke: (client) => client[property][createMethod](createBody),
    method: 'POST',
    path: `/qbench/api/v2/${path}`,
    body: createBody,
  });
  routeTest(`${property}.${updateMethod}`, {
    invoke: (client) => client[property][updateMethod](updateBody),
    method: 'PATCH',
    path: `/qbench/api/v2/${path}`,
    body: updateBody,
  });
  routeTest(`${property}.${getMethod}`, {
    invoke: (client) => client[property][getMethod](123),
    method: 'GET',
    path: `/qbench/api/v2/${path}/123`,
  });
  routeTest(`${property}.${deleteMethod}`, {
    invoke: (client) => client[property][deleteMethod](123),
    method: 'DELETE',
    path: `/qbench/api/v2/${path}/123`,
  });

  test(`${property}.${createMethod} rejects an empty array`, async () => {
    await assert.rejects(() => createClient()[property][createMethod]([]), /non-empty array/i);
  });
  test(`${property}.${updateMethod} rejects records without IDs`, async () => {
    await assert.rejects(() => createClient()[property][updateMethod]([{}]), /id/i);
  });
  test(`${property}.${getMethod} rejects a missing ID`, async () => {
    await assert.rejects(() => createClient()[property][getMethod](0), /required/i);
  });
  test(`${property}.${deleteMethod} rejects a missing ID`, async () => {
    await assert.rejects(() => createClient()[property][deleteMethod](0), /required/i);
  });
}

const integrationResources = [
  ['Assay', 'assays'],
  ['Contact', 'contacts'],
  ['Customer', 'customers'],
  ['InvoicePayment', 'invoice-payments'],
  ['Invoice', 'invoices'],
  ['Payment', 'payments'],
];

for (const [methodStem, path] of integrationResources) {
  const listMethod = `list${methodStem}IntegrationRelationships`;
  const createMethod = `create${methodStem}IntegrationRelationships`;
  const getMethod = `get${methodStem}IntegrationRelationship`;
  const relationshipBody = [{ entity_id: 456, integration_vendor_id: 789 }];

  routeTest(`integration.${listMethod}`, {
    invoke: (client) => client.integration[listMethod](123, LIST_PARAMS),
    method: 'GET',
    path: `/qbench/api/v2/integrations/123/${path}`,
    query: LIST_PARAMS,
  });
  routeTest(`integration.${createMethod}`, {
    invoke: (client) => client.integration[createMethod](123, relationshipBody),
    method: 'POST',
    path: `/qbench/api/v2/integrations/123/${path}`,
    body: relationshipBody,
  });
  routeTest(`integration.${getMethod}`, {
    invoke: (client) => client.integration[getMethod](123, 456),
    method: 'GET',
    path: `/qbench/api/v2/integrations/123/${path}/456`,
  });

  test(`integration.${listMethod} rejects a missing integration ID`, async () => {
    await assert.rejects(() => createClient().integration[listMethod](0), /Integration ID/i);
  });
  test(`integration.${createMethod} rejects an empty relationship array`, async () => {
    await assert.rejects(
      () => createClient().integration[createMethod](123, []),
      /non-empty array/i
    );
  });
  test(`integration.${getMethod} rejects a missing entity ID`, async () => {
    await assert.rejects(() => createClient().integration[getMethod](123, 0), /Entity .* ID/i);
  });
}

routeTest('integration.deleteInvoicePaymentIntegrationRelationship', {
  invoke: (client) => client.integration.deleteInvoicePaymentIntegrationRelationship(123, 456),
  method: 'DELETE',
  path: '/qbench/api/v2/integrations/123/invoice-payments/456',
});

test('integration.deleteInvoicePaymentIntegrationRelationship rejects a missing integration ID', async () => {
  await assert.rejects(
    () => createClient().integration.deleteInvoicePaymentIntegrationRelationship(0, 456),
    /Integration ID/i
  );
});

test('integration.deleteInvoicePaymentIntegrationRelationship rejects a missing entity ID', async () => {
  await assert.rejects(
    () => createClient().integration.deleteInvoicePaymentIntegrationRelationship(123, 0),
    /Entity .* ID/i
  );
});

const relationRoutes = [
  ['apiClient.listCustomersForApiClient', (c) => c.apiClient.listCustomersForApiClient(123, LIST_PARAMS), 'GET', '/qbench/api/v2/api-clients/123/customers'],
  ['assay.listAccessioningTypesForAssay', (c) => c.assay.listAccessioningTypesForAssay(123, LIST_PARAMS), 'GET', '/qbench/api/v2/assays/123/accessioning-types'],
  ['assay.listAttachmentsForAssay', (c) => c.assay.listAttachmentsForAssay(123, LIST_PARAMS), 'GET', '/qbench/api/v2/assays/123/attachments'],
  ['assay.listDivisionsForAssay', (c) => c.assay.listDivisionsForAssay(123, LIST_PARAMS), 'GET', '/qbench/api/v2/assays/123/divisions'],
  ['assay.listPanelsForAssay', (c) => c.assay.listPanelsForAssay(123, LIST_PARAMS), 'GET', '/qbench/api/v2/assays/123/panels'],
  ['assay.listTurnaroundsForAssay', (c) => c.assay.listTurnaroundsForAssay(123, LIST_PARAMS), 'GET', '/qbench/api/v2/assays/123/turnarounds'],
  ['batch.listAttachmentsForBatch', (c) => c.batch.listAttachmentsForBatch(123, LIST_PARAMS), 'GET', '/qbench/api/v2/batches/123/attachments'],
  ['batch.listChildBatches', (c) => c.batch.listChildBatches(123, LIST_PARAMS), 'GET', '/qbench/api/v2/batches/123/children'],
  ['batch.listParentBatches', (c) => c.batch.listParentBatches(123, LIST_PARAMS), 'GET', '/qbench/api/v2/batches/123/parents'],
  ['batch.listSamplesForBatch', (c) => c.batch.listSamplesForBatch(123, LIST_PARAMS), 'GET', '/qbench/api/v2/batches/123/samples'],
  ['batch.listTestsForBatch', (c) => c.batch.listTestsForBatch(123, LIST_PARAMS), 'GET', '/qbench/api/v2/batches/123/tests'],
  ['batch.getBatchWorksheetData', (c) => c.batch.getBatchWorksheetData(123, LIST_PARAMS), 'GET', '/qbench/api/v2/batches/123/worksheet/data'],
  ['contact.listCustomersForContact', (c) => c.contact.listCustomersForContact(123, LIST_PARAMS), 'GET', '/qbench/api/v2/contacts/123/customers'],
  ['contact.associateContactWithCustomers', (c) => c.contact.associateContactWithCustomers(123, [{ customer_id: 456 }]), 'POST', '/qbench/api/v2/contacts/123/customers', [{ customer_id: 456 }]],
  ['customer.listAttachmentsForCustomer', (c) => c.customer.listAttachmentsForCustomer(123, LIST_PARAMS), 'GET', '/qbench/api/v2/customers/123/attachments'],
  ['customer.listContactsForCustomer', (c) => c.customer.listContactsForCustomer(123, LIST_PARAMS), 'GET', '/qbench/api/v2/customers/123/contacts'],
  ['customer.associateCustomerWithContacts', (c) => c.customer.associateCustomerWithContacts(123, [{ contact_id: 456 }]), 'POST', '/qbench/api/v2/customers/123/contacts', [{ contact_id: 456 }]],
  ['customer.disassociateContactFromCustomer', (c) => c.customer.disassociateContactFromCustomer(123, 456), 'DELETE', '/qbench/api/v2/customers/123/contacts/456'],
  ['customer.listDivisionsForCustomer', (c) => c.customer.listDivisionsForCustomer(123, LIST_PARAMS), 'GET', '/qbench/api/v2/customers/123/divisions'],
  ['customer.listSourcesForCustomer', (c) => c.customer.listSourcesForCustomer(123, LIST_PARAMS), 'GET', '/qbench/api/v2/customers/123/sources'],
  ['invoice.listItemsForInvoice', (c) => c.invoice.listItemsForInvoice(123, LIST_PARAMS), 'GET', '/qbench/api/v2/invoices/123/invoice-items'],
  ['invoice.listOrdersForInvoice', (c) => c.invoice.listOrdersForInvoice(123, LIST_PARAMS), 'GET', '/qbench/api/v2/invoices/123/orders'],
  ['invoice.listPaymentsForInvoice', (c) => c.invoice.listPaymentsForInvoice(123, LIST_PARAMS), 'GET', '/qbench/api/v2/invoices/123/payments'],
  ['invoice.sendInvoiceEmail', (c) => c.invoice.sendInvoiceEmail(123, { to: 'synthetic@example.test' }), 'POST', '/qbench/api/v2/invoices/123/send-email', { to: 'synthetic@example.test' }],
  ['invoice.syncInvoice', (c) => c.invoice.syncInvoice(123), 'POST', '/qbench/api/v2/invoices/123/sync'],
  ['order.listAttachmentsForOrder', (c) => c.order.listAttachmentsForOrder(123, LIST_PARAMS), 'GET', '/qbench/api/v2/orders/123/attachments'],
  ['order.listCommentsForOrder', (c) => c.order.listCommentsForOrder(123, LIST_PARAMS), 'GET', '/qbench/api/v2/orders/123/comments'],
  ['order.listInvoicesForOrder', (c) => c.order.listInvoicesForOrder(123, LIST_PARAMS), 'GET', '/qbench/api/v2/orders/123/invoices'],
  ['order.listReportsForOrder', (c) => c.order.listReportsForOrder(123, LIST_PARAMS), 'GET', '/qbench/api/v2/orders/123/reports'],
  ['order.listSamplesForOrder', (c) => c.order.listSamplesForOrder(123, LIST_PARAMS), 'GET', '/qbench/api/v2/orders/123/samples'],
  ['order.listTestsForOrder', (c) => c.order.listTestsForOrder(123, LIST_PARAMS), 'GET', '/qbench/api/v2/orders/123/tests'],
  ['panel.listAssaysForPanel', (c) => c.panel.listAssaysForPanel(123, LIST_PARAMS), 'GET', '/qbench/api/v2/panels/123/assays'],
  ['payment.listInvoicesForPayment', (c) => c.payment.listInvoicesForPayment(123, LIST_PARAMS), 'GET', '/qbench/api/v2/payments/123/invoices'],
  ['payment.applyPaymentToInvoices', (c) => c.payment.applyPaymentToInvoices(123, [{ invoice_id: 456, applied_amount: 10 }]), 'POST', '/qbench/api/v2/payments/123/invoices', [{ invoice_id: 456, applied_amount: 10 }]],
  ['payment.updateInvoicePaymentApplications', (c) => c.payment.updateInvoicePaymentApplications(123, [{ invoice_id: 456, amount: 11 }]), 'PATCH', '/qbench/api/v2/payments/123/invoices', [{ invoice_id: 456, amount: 11 }]],
  ['payment.unapplyPaymentFromInvoice', (c) => c.payment.unapplyPaymentFromInvoice(123, 456), 'DELETE', '/qbench/api/v2/payments/123/invoices/456'],
  ['payment.sendPaymentEmail', (c) => c.payment.sendPaymentEmail(123, { emails: ['synthetic@example.test'] }), 'POST', '/qbench/api/v2/payments/123/send-email', { emails: ['synthetic@example.test'] }],
  ['sample.listAttachmentsForSample', (c) => c.sample.listAttachmentsForSample(123, LIST_PARAMS), 'GET', '/qbench/api/v2/samples/123/attachments'],
  ['sample.listBatchesForSample', (c) => c.sample.listBatchesForSample(123, LIST_PARAMS), 'GET', '/qbench/api/v2/samples/123/batches'],
  ['sample.listReportsForSample', (c) => c.sample.listReportsForSample(123, LIST_PARAMS), 'GET', '/qbench/api/v2/samples/123/reports'],
  ['sample.listSubSamples', (c) => c.sample.listSubSamples(123, LIST_PARAMS), 'GET', '/qbench/api/v2/samples/123/sub-samples'],
  ['sample.listTestsForSample', (c) => c.sample.listTestsForSample(123, LIST_PARAMS), 'GET', '/qbench/api/v2/samples/123/tests'],
  ['test.listAttachmentsForTest', (c) => c.test.listAttachmentsForTest(123, LIST_PARAMS), 'GET', '/qbench/api/v2/tests/123/attachments'],
  ['test.listBatchesForTest', (c) => c.test.listBatchesForTest(123, LIST_PARAMS), 'GET', '/qbench/api/v2/tests/123/batches'],
  ['test.listReportsForTest', (c) => c.test.listReportsForTest(123, LIST_PARAMS), 'GET', '/qbench/api/v2/tests/123/reports'],
  ['test.getTestWorksheetData', (c) => c.test.getTestWorksheetData(123, LIST_PARAMS), 'GET', '/qbench/api/v2/tests/123/worksheet/data'],
  ['turnaround.listDivisionsForTurnaround', (c) => c.turnaround.listDivisionsForTurnaround(123, LIST_PARAMS), 'GET', '/qbench/api/v2/turnarounds/123/divisions'],
];

for (const [name, invoke, method, path, body] of relationRoutes) {
  routeTest(name, { invoke, method, path, body, query: method === 'GET' ? LIST_PARAMS : undefined });
}

const specialRoutes = [
  ['comment.listComments', (c) => c.comment.listComments(LIST_PARAMS), 'GET', '/qbench/api/v2/comments'],
  ['authentication.getTokenInfo', (c) => c.authentication.getTokenInfo(), 'GET', '/qbench/api/v2/auth/token/info'],
  ['attachment.createAttachments', (c) => c.attachment.createAttachments([{ attachment_type: 'ORDER', object_id: 123, file_name: 'synthetic.pdf' }]), 'POST', '/qbench/api/v2/attachments', [{ attachment_type: 'ORDER', object_id: 123, file_name: 'synthetic.pdf' }]],
  ['attachment.updateAttachments', (c) => c.attachment.updateAttachments([{ id: 123, file_name: 'updated.pdf' }]), 'PATCH', '/qbench/api/v2/attachments', [{ id: 123, file_name: 'updated.pdf' }]],
  ['attachment.getAttachmentById', (c) => c.attachment.getAttachmentById(123), 'GET', '/qbench/api/v2/attachments/123'],
  ['attachment.deleteAttachment', (c) => c.attachment.deleteAttachment(123), 'DELETE', '/qbench/api/v2/attachments/123'],
  ['label.generateLabels', (c) => c.label.generateLabels(123, 'samples', [{ id: 456, count: 1 }]), 'POST', '/qbench/api/v2/labels/123/samples', [{ id: 456, count: 1 }]],
  ['printdoc.createPrintDocs', (c) => c.printdoc.createPrintDocs([{ template_id: 123 }]), 'POST', '/qbench/api/v2/printdocs', [{ template_id: 123 }]],
  ['printdoc.getPrintDocById', (c) => c.printdoc.getPrintDocById(123), 'GET', '/qbench/api/v2/printdocs/123'],
  ['report.listReports', (c) => c.report.listReports(LIST_PARAMS), 'GET', '/qbench/api/v2/reports'],
  ['report.createReports', (c) => c.report.createReports([{ order_id: 123 }]), 'POST', '/qbench/api/v2/reports', [{ order_id: 123 }]],
  ['report.getReportById', (c) => c.report.getReportById(123), 'GET', '/qbench/api/v2/reports/123'],
  ['report.publishReports', (c) => c.report.publishReports([{ id: 123 }]), 'POST', '/qbench/api/v2/reports/publish', [{ id: 123 }]],
];

for (const [name, invoke, method, path, body] of specialRoutes) {
  routeTest(name, {
    invoke,
    method,
    path,
    body,
    query: name.endsWith('listComments') || name.endsWith('listReports') ? LIST_PARAMS : undefined,
  });
}

function routeTest(name, { invoke, method, path, body, query }) {
  test(`${name} uses ${method} ${path}`, async () => {
    let observed;
    const client = createClient(async (url, init) => {
      observed = { url: new URL(url), init };
      return jsonResponse({ ok: true });
    });

    await invoke(client);

    assert.equal(observed.init.method, method);
    assert.equal(observed.url.pathname, path);
    if (query) {
      assert.equal(observed.url.searchParams.get('page_num'), String(query.page_num));
      assert.equal(observed.url.searchParams.get('page_size'), String(query.page_size));
    }
    if (body !== undefined) {
      assert.deepEqual(JSON.parse(observed.init.body), body);
    } else {
      assert.equal(observed.init.body, null);
    }
  });
}

function createClient(fetch = async () => jsonResponse({ ok: true })) {
  return new QBenchClient({
    baseUrl: BASE_URL,
    accessTokenProvider: {
      async getAccessToken() {
        return 'synthetic-token';
      },
    },
    fetch,
  });
}

function jsonResponse(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
