import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import { EventEmitter } from 'node:events';
import { QBenchClient } from '../index.js';
import { BaseHandler } from '../src/tags/baseHandler.js';
import { TestHandler } from '../src/tags/test.js';

const BASE_URL = 'https://file-helpers.qbench.test';

test('BaseHandler requires a request handler', () => {
  assert.throws(() => new BaseHandler(), /RequestHandler instance is required/);
});

test('attachment uploads support QBench response and presigned URL variants', async () => {
  const uploads = [];

  await withMockedHttpsRequests(
    Array.from({ length: 5 }, () => ({ status: 200, body: 'uploaded' })),
    uploads,
    async (serverUrl) => {
    const records = [
      { id: 1, upload_url: `${serverUrl}/one?x-amz-security-token=a+b&part=1` },
      { id: 2, uploadUrl: `${serverUrl}/two?part=1&x-amz-security-token=a%2Bb` },
      { id: 3, presigned_url: `${serverUrl}/three?x-amz-security-token=only` },
      { id: 4, presignedUrl: `${serverUrl}/four?part=1` },
      { id: 5, url: `${serverUrl}/five?X-Amz-Security-Token=%ZZ` },
    ];
    const envelopes = [
      [records[0]],
      { data: [records[1]] },
      records[2],
      [records[3]],
      [records[4]],
    ];
    let createCall = 0;
    const client = createClient(async (_url, init) => {
      assert.equal(init.method, 'POST');
      return jsonResponse(envelopes[createCall++]);
    });

    assert.equal(
      (await client.attachment.createAttachmentWithFile({
        attachment_type: 'ORDER',
        object_id: '123',
        file_name: 'one.txt',
        file: Buffer.from('one'),
        contentType: 'text/plain',
      })).id,
      1
    );
    assert.equal(
      (await client.attachment.createAttachmentWithFile({
        attachment_type: 'ORDER',
        object_id: 123,
        file_name: 'two.txt',
        file: Buffer.from('two').toString('base64'),
        fileEncoding: 'base64',
      })).id,
      2
    );
    assert.equal(
      (await client.attachment.createAttachmentWithFile({
        attachment_type: 'ORDER',
        object_id: 123,
        file_name: 'three.txt',
        file: 'three',
      })).id,
      3
    );
    await client.attachment.createAttachmentWithFile({
      attachment_type: 'ORDER', object_id: 123, file_name: 'four.txt', file: 'four',
    });
    await client.attachment.createAttachmentWithFile({
      attachment_type: 'ORDER', object_id: 123, file_name: 'five.txt', file: 'five',
    });
    }
  );

  assert.equal(uploads.length, 5);
  assert.equal(uploads[0].url, '/one?part=1');
  assert.equal(uploads[0].headers['x-amz-security-token'], 'a+b');
  assert.equal(uploads[0].headers['content-type'], 'text/plain');
  assert.equal(uploads[0].body.toString(), 'one');
  assert.equal(uploads[1].url, '/two?part=1');
  assert.equal(uploads[1].headers['x-amz-security-token'], 'a+b');
  assert.equal(uploads[2].url, '/three');
  assert.equal(uploads[2].headers['x-amz-security-token'], 'only');
  assert.equal(uploads[3].url, '/four?part=1');
  assert.equal(uploads[3].headers['x-amz-security-token'], undefined);
  assert.equal(uploads[4].url, '/five');
  assert.equal(uploads[4].headers['x-amz-security-token'], '%ZZ');
});

test('attachment upload surfaces a failed presigned PUT', async () => {
  await withMockedHttpsRequests(
    [{ status: 403, body: 'synthetic denied' }],
    [],
    async (serverUrl) => {
    const client = createClient(async () =>
      jsonResponse([{ id: 7, upload_url: `${serverUrl}/denied` }])
    );

    await assert.rejects(
      () => client.attachment.createAttachmentWithFile({
        attachment_type: 'ORDER', object_id: 123, file_name: 'denied.txt', file: 'bytes',
      }),
      (error) =>
        error.name === 'QBenchUploadError' &&
        error.status === 403 &&
        error.responseBody === undefined &&
        !error.message.includes('synthetic denied')
    );
    }
  );
});

test('attachment upload validates input and missing upload URLs', async () => {
  const client = createClient(async () => jsonResponse(null));

  await assert.rejects(
    () => client.attachment.createAttachmentWithFile({ object_id: 1, file_name: 'x', file: 'x' }),
    /attachment_type is required/
  );
  await assert.rejects(
    () => client.attachment.createAttachmentWithFile({ attachment_type: 'ORDER', file_name: 'x', file: 'x' }),
    /object_id is required/
  );
  await assert.rejects(
    () => client.attachment.createAttachmentWithFile({ attachment_type: 'ORDER', object_id: 1, file: 'x' }),
    /file_name is required/
  );
  await assert.rejects(
    () => client.attachment.createAttachmentWithFile({ attachment_type: 'ORDER', object_id: 1, file_name: 'x' }),
    /file is required/
  );
  await assert.rejects(
    () => client.attachment.createAttachmentWithFile({
      attachment_type: 'ORDER', object_id: 1, file_name: 'x', file: 'x',
    }),
    (error) => error.name === 'QBenchUploadError' && error.responseBody === undefined
  );

  const objectClient = createClient(async () => jsonResponse({ id: 13 }));
  await assert.rejects(
    () => objectClient.attachment.createAttachmentWithFile({
      attachment_type: 'ORDER', object_id: 1, file_name: 'x', file: 'x',
    }),
    (error) =>
      error.name === 'QBenchUploadError' &&
      error.responseBody === undefined &&
      !error.message.includes('13')
  );

  const primitiveClient = createClient(async () => jsonResponse('unexpected'));
  await assert.rejects(
    () => primitiveClient.attachment.createAttachmentWithFile({
      attachment_type: 'ORDER', object_id: 1, file_name: 'x', file: 'x',
    }),
    (error) => error.name === 'QBenchUploadError'
  );
});

test('attachment uploads reject non-HTTPS presigned URLs before sending file bytes', async () => {
  const client = createClient(async () =>
    jsonResponse([{ id: 14, upload_url: 'http://uploads.test/insecure' }])
  );

  await assert.rejects(
    () => client.attachment.createAttachmentWithFile({
      attachment_type: 'ORDER', object_id: 1, file_name: 'x.txt', file: 'x',
    }),
    (error) => error.name === 'QBenchUploadError' && /must use HTTPS/.test(error.message)
  );
});

test('attachment record downloads support URL and filename variants', async () => {
  const originalFetch = globalThis.fetch;
  const seenUrls = [];
  globalThis.fetch = async (url) => {
    seenUrls.push(url);
    return new Response('file bytes', {
      status: 200,
      headers: { 'Content-Type': 'application/octet-stream' },
    });
  };

  try {
    const client = createClient();
    const records = [
      { id: 1, download_url: 'https://files.test/one', file_name: 'one.bin' },
      { id: 2, downloadUrl: 'https://files.test/two', fileName: 'two.bin' },
      { id: 3, file_url: 'https://files.test/three', filename: 'three.bin' },
      { id: 4, fileUrl: 'https://files.test/four', name: 'four.bin' },
      { id: 5, url: 'https://files.test/five' },
    ];

    for (const record of records) {
      const downloaded = await client.attachment.downloadAttachmentRecordFile(record);
      assert.equal(downloaded.buffer.toString(), 'file bytes');
      assert.equal(downloaded.contentType, 'application/octet-stream');
      assert.equal(downloaded.attachmentId, record.id);
    }

    assert.deepEqual(seenUrls, records.map((record) =>
      record.download_url || record.downloadUrl || record.file_url || record.fileUrl || record.url
    ));
    assert.equal((await client.attachment.downloadAttachmentRecordFile(records[4])).fileName, 'attachment-5');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('attachment downloads unwrap metadata and surface missing or failed URLs', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('downloaded', { status: 200 });
    const client = createClient(async () =>
      jsonResponse({ data: { id: 9, url: 'https://files.test/nine', file_name: 'nine.bin' } })
    );
    const downloaded = await client.attachment.downloadAttachmentFile(9);
    assert.equal(downloaded.fileName, 'nine.bin');
    assert.equal(downloaded.attachmentId, 9);

    const unwrappedClient = createClient(async () =>
      jsonResponse({ id: 10, url: 'https://files.test/ten', file_name: 'ten.bin' })
    );
    assert.equal((await unwrappedClient.attachment.downloadAttachmentFile(10)).fileName, 'ten.bin');

    await assert.rejects(
      () => client.attachment.downloadAttachmentRecordFile({ id: 10 }),
      (error) => error.name === 'QBenchAttachmentDownloadError' && /no download URL/.test(error.message)
    );
    await assert.rejects(
      () => client.attachment.downloadAttachmentRecordFile(null),
      /Attachment record is required/
    );
    await assert.rejects(() => client.attachment.downloadAttachmentFile(0), /Attachment ID is required/);

    let insecureFetchCalled = false;
    globalThis.fetch = async () => {
      insecureFetchCalled = true;
      return new Response('unexpected');
    };
    await assert.rejects(
      () => client.attachment.downloadAttachmentRecordFile({ id: 10, url: 'http://files.test/insecure' }),
      (error) =>
        error.name === 'QBenchAttachmentDownloadError' && /must use HTTPS/.test(error.message)
    );
    assert.equal(insecureFetchCalled, false);

    globalThis.fetch = async () => new Response('synthetic denied', { status: 502 });
    await assert.rejects(
      () => client.attachment.downloadAttachmentRecordFile({ id: 11, url: 'https://files.test/denied' }),
      (error) =>
        error.name === 'QBenchAttachmentDownloadError' &&
        error.status === 502 &&
        error.responseBody === undefined &&
        !error.message.includes('synthetic denied')
    );

    globalThis.fetch = async () => ({
      ok: false,
      status: 503,
      text: async () => { throw new Error('unreadable'); },
    });
    await assert.rejects(
      () => client.attachment.downloadAttachmentRecordFile({ id: 12, url: 'https://files.test/unreadable' }),
      (error) => error.name === 'QBenchAttachmentDownloadError' && error.responseBody === undefined
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('report helpers unwrap, select, and download reports', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('pdf bytes', {
      status: 200,
      headers: { 'Content-Type': 'application/pdf' },
    });
    const client = createClient(async (url) => {
      const parsed = new URL(url);
      if (parsed.pathname === '/qbench/api/v2/reports/8') {
        return jsonResponse({ data: { id: 8, url: 'https://files.test/My%20Report.pdf' } });
      }
      return jsonResponse({
        data: [
          { id: 99, render_status: 'FAILED', date_generated: '12/31/2099 1:00 PM' },
          { id: 7, render_status: 'SUCCESSFUL', date_generated: '01/01/2026 1:00 PM' },
          { id: 8, render_status: 'SUCCESSFUL', date_generated: '01/02/2026 1:00 PM' },
        ],
      });
    });

    assert.equal((await client.report.getReportRecordById(8)).id, 8);
    assert.equal((await client.report.getLatestSuccessfulReportForOrder(123)).id, 8);
    const downloaded = await client.report.downloadReportPdf(8);
    assert.equal(downloaded.buffer.toString(), 'pdf bytes');
    assert.equal(downloaded.fileName, 'My Report.pdf');
    assert.equal(downloaded.contentType, 'application/pdf');
    assert.equal(downloaded.reportId, 8);

    const latestDownload = await client.report.downloadLatestReportPdfForOrder(123);
    assert.equal(latestDownload.reportId, 8);

    const unwrappedClient = createClient(async () =>
      jsonResponse({ id: 10, url: 'https://files.test/ten.pdf' })
    );
    assert.equal((await unwrappedClient.report.getReportRecordById(10)).id, 10);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('report selection handles response variants, invalid dates, ties, and empty lists', async () => {
  const responses = [
    [
      { id: 1, render_status: 'SUCCESSFUL', date_generated: null },
      { id: 2, render_status: 'SUCCESSFUL', date_generated: 'not-a-date' },
    ],
    { results: [{ id: 3, render_status: 'SUCCESSFUL', date_generated: '01/01/2026 1:00 PM' }] },
    { data: [] },
    { unexpected: true },
  ];
  let call = 0;
  const client = createClient(async () => jsonResponse(responses[call++]));

  assert.equal((await client.report.getLatestSuccessfulReportForOrder(1)).id, 2);
  assert.equal((await client.report.getLatestSuccessfulReportForOrder(1)).id, 3);
  assert.equal(await client.report.getLatestSuccessfulReportForOrder(1), null);
  assert.equal(await client.report.getLatestSuccessfulReportForOrder(1), null);
  await assert.rejects(() => client.report.getLatestSuccessfulReportForOrder(0), /order_id is required/);
});

test('report downloads validate metadata and failed file responses', async () => {
  const originalFetch = globalThis.fetch;
  try {
    const missingClient = createClient(async () => jsonResponse({ data: { render_status: 'PENDING' } }));
    await assert.rejects(
      () => missingClient.report.downloadReportPdf(4),
      (error) => error.name === 'QBenchReportError' && /Render status: PENDING/.test(error.message)
    );
    await assert.rejects(() => missingClient.report.downloadReportPdf(0), /Report ID is required/);

    const failedClient = createClient(async () =>
      jsonResponse({ data: { id: 5, url: 'https://files.test/failure.pdf' } })
    );
    globalThis.fetch = async () => new Response('synthetic report failure', { status: 500 });
    await assert.rejects(
      () => failedClient.report.downloadReportPdf(5),
      (error) =>
        error.name === 'QBenchReportError' &&
        error.status === 500 &&
        error.responseBody === undefined &&
        !error.message.includes('synthetic report failure')
    );

    const fallbackClient = createClient(async () =>
      jsonResponse({ data: { id: 5, url: 'https://files.test/' } })
    );
    globalThis.fetch = async () => new Response('fallback', { status: 200 });
    assert.equal((await fallbackClient.report.downloadReportPdf(5)).fileName, 'report-5.pdf');

    globalThis.fetch = async () => ({
      ok: false,
      status: 503,
      text: async () => { throw new Error('unreadable'); },
    });
    await assert.rejects(
      () => failedClient.report.downloadReportPdf(5),
      (error) => error.name === 'QBenchReportError' && error.responseBody === undefined
    );

    let insecureFetchCalled = false;
    globalThis.fetch = async () => {
      insecureFetchCalled = true;
      return new Response('unexpected');
    };
    const insecureClient = createClient(async () =>
      jsonResponse({ data: { id: 6, url: 'http://files.test/insecure.pdf' } })
    );
    await assert.rejects(
      () => insecureClient.report.downloadReportPdf(6),
      (error) => error.name === 'QBenchReportError' && /must use HTTPS/.test(error.message)
    );
    assert.equal(insecureFetchCalled, false);

    const invalidClient = createClient(async () =>
      jsonResponse({ data: { id: 7, url: 'not a valid url' } })
    );
    await assert.rejects(
      () => invalidClient.report.downloadReportPdf(7),
      (error) => error.name === 'QBenchReportError' && /is invalid/.test(error.message)
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('report creation, publishing, and latest-download empty cases validate inputs', async () => {
  const client = createClient(async () => jsonResponse({ data: [] }));
  await assert.rejects(() => client.report.createReports([]), /non-empty array/);
  await assert.rejects(() => client.report.getReportById(0), /Report ID is required/);
  await assert.rejects(() => client.report.publishReports([]), /non-empty array/);
  await assert.rejects(() => client.report.publishReports([{}]), /id/);
  assert.equal(await client.report.downloadLatestReportPdfForOrder(123), null);
});

test('worksheet helpers flatten wrapped, raw, missing, and unusual cell values', async () => {
  const responses = [
    { data: { worksheet_data: {
      normal: { value: 'yes' },
      undefinedValue: { value: undefined },
      scalar: 'raw',
      empty: null,
    } } },
    { worksheet_data: { raw: { value: 3 } } },
    { data: {} },
  ];
  let call = 0;
  const client = createClient(async () => jsonResponse(responses[call++]));

  assert.deepEqual(await client.test.getTestWorksheetCells(1), {
    normal: 'yes', undefinedValue: {}, scalar: 'raw', empty: null,
  });
  assert.deepEqual(await client.test.getTestWorksheetCells(1), { raw: 3 });
  assert.deepEqual(await client.test.getTestWorksheetCells(1), {});
  await assert.rejects(() => client.test.getTestWorksheetData(0), /Test ID is required/);

  const directHandler = new TestHandler({
    async request() {
      return { data: { worksheet_data: { undefinedValue: { value: undefined } } } };
    },
  });
  assert.deepEqual(await directHandler.getTestWorksheetCells(1), { undefinedValue: null });
});

test('raw authentication helper methods remain explicitly disabled', async () => {
  const client = createClient();
  const originalWarn = console.warn;
  const warnings = [];
  console.warn = (message) => warnings.push(message);
  try {
    await assert.rejects(() => client.authentication.getAccessToken({}), /not implemented/);
    await assert.rejects(() => client.authentication.refreshAccessToken({}), /not implemented/);
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(warnings.length, 2);
});

function createClient(fetch = async () => jsonResponse({ ok: true })) {
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

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function withMockedHttpsRequests(outcomes, observed, run) {
  const originalRequest = https.request;
  https.request = (options, callback) => {
    const request = new EventEmitter();
    const capture = { url: options.path, headers: lowercaseKeys(options.headers), body: Buffer.alloc(0) };
    request.write = (body) => {
      capture.body = Buffer.from(body);
    };
    request.end = () => {
      const outcome = outcomes.shift();
      queueMicrotask(() => {
        if (outcome.error) {
          request.emit('error', outcome.error);
          return;
        }
        const response = new EventEmitter();
        response.statusCode = outcome.status;
        response.headers = outcome.headers ?? {};
        response.setEncoding = () => {};
        callback(response);
        if (outcome.body) response.emit('data', outcome.body);
        response.emit('end');
      });
    };
    observed.push(capture);
    return request;
  };

  try {
    await run('https://uploads.test');
  } finally {
    https.request = originalRequest;
  }
}

function lowercaseKeys(value) {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key.toLowerCase(), item]));
}
