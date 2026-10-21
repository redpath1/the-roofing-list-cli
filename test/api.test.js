import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, VERSION, getContractor, searchContractors } from '../src/api.js';

delete process.env.THEROOFINGLIST_API;

function stubFetch(status, body, headers = {}) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    });
  };
  fn.calls = calls;
  return fn;
}

test('searchContractors builds the query and sends the User-Agent', async () => {
  const fetch = stubFetch(200, { contractors: [] });
  const body = await searchContractors({ trade: 'roofing', city: 'San Antonio', state: 'TX', limit: 3 }, fetch);
  assert.deepEqual(body, { contractors: [] });
  const url = new URL(fetch.calls[0].url);
  assert.equal(url.origin + url.pathname, 'https://mcp.theroofinglist.com/v1/contractors');
  assert.equal(url.searchParams.get('trade'), 'roofing');
  assert.equal(url.searchParams.get('city'), 'San Antonio');
  assert.equal(url.searchParams.get('state'), 'TX');
  assert.equal(url.searchParams.get('limit'), '3');
  assert.equal(fetch.calls[0].init.headers['user-agent'], `theroofinglist-cli/${VERSION}`);
});

test('searchContractors leaves out a missing limit', async () => {
  const fetch = stubFetch(200, { contractors: [] });
  await searchContractors({ trade: 'siding', city: 'Austin', state: 'TX' }, fetch);
  assert.equal(new URL(fetch.calls[0].url).searchParams.has('limit'), false);
});

test('getContractor returns the contractor', async () => {
  const fetch = stubFetch(200, { id: 7, name: 'A' });
  assert.deepEqual(await getContractor(7, fetch), { id: 7, name: 'A' });
  assert.equal(fetch.calls[0].url, 'https://mcp.theroofinglist.com/v1/contractors/7');
});

test('a 404 throws ApiError with the API message', async () => {
  const fetch = stubFetch(404, { error: 'No listed contractor with id 9.' });
  await assert.rejects(getContractor(9, fetch), (e) => {
    assert.ok(e instanceof ApiError);
    assert.equal(e.status, 404);
    assert.equal(e.message, 'No listed contractor with id 9.');
    return true;
  });
});

test('a 429 carries Retry-After in seconds', async () => {
  const fetch = stubFetch(429, { error: 'Rate limited.' }, { 'retry-after': '42' });
  await assert.rejects(getContractor(1, fetch), (e) => e.status === 429 && e.retryAfter === 42);
});

test('a body that is not JSON still gives a clear error', async () => {
  const fetch = stubFetch(503, '<html>down</html>');
  await assert.rejects(getContractor(1, fetch), (e) => e.status === 503 && /HTTP 503/.test(e.message));
});

test('a network failure throws ApiError with status 0', async () => {
  const fetch = async () => {
    throw new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } });
  };
  await assert.rejects(getContractor(1, fetch), (e) => e.status === 0 && /ECONNREFUSED/.test(e.message));
});

test('THEROOFINGLIST_API overrides the base URL', async () => {
  process.env.THEROOFINGLIST_API = 'http://127.0.0.1:9/';
  try {
    const fetch = stubFetch(200, {});
    await getContractor(5, fetch);
    assert.equal(fetch.calls[0].url, 'http://127.0.0.1:9/v1/contractors/5');
  } finally {
    delete process.env.THEROOFINGLIST_API;
  }
});
