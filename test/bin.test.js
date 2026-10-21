// Runs the real bin as a child process against a local HTTP server.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const BIN = fileURLToPath(new URL('../bin/theroofinglist.js', import.meta.url));

const firm = {
  id: 101,
  name: 'Lone Star Roofing',
  trades: ['roofing'],
  city: 'Austin',
  state: 'TX',
  phone: '+15125550101',
  profileUrl: 'https://theroofinglist.com/roofers/texas/austin/lone-star-roofing/',
  claimed: true,
  rating: { value: 4.7, count: 12 },
};

let server;
let base;
const seen = [];

before(async () => {
  server = createServer((req, res) => {
    seen.push({ url: req.url, ua: req.headers['user-agent'] });
    const url = new URL(req.url, 'http://x');
    const send = (status, body, headers = {}) => {
      res.writeHead(status, { 'content-type': 'application/json', ...headers });
      res.end(JSON.stringify(body));
    };
    if (url.pathname === '/v1/contractors') {
      if (url.searchParams.get('city') === 'Busy') return send(429, { error: 'Rate limited.' }, { 'retry-after': '30' });
      if (url.searchParams.get('city') === 'Nowhere') return send(200, { contractors: [] });
      return send(200, { contractors: [firm] });
    }
    if (url.pathname === '/v1/contractors/101') return send(200, firm);
    const id = url.pathname.split('/').pop();
    return send(404, { error: `No listed contractor with id ${id}.` });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

function run(args) {
  return new Promise((resolve) => {
    execFile(process.execPath, [BIN, ...args], { env: { ...process.env, THEROOFINGLIST_API: base } }, (err, stdout, stderr) => {
      resolve({ code: err ? err.code : 0, stdout, stderr });
    });
  });
}

test('search prints a summary and one row, exit 0', async () => {
  const r = await run(['search', '--trade', 'roofing', '--city', 'Austin', '--state', 'TX', '--limit', '3']);
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /^1 roofing contractor in Austin, TX$/m);
  assert.match(r.stdout, /Lone Star Roofing .*claimed/);
  const req = seen.at(-1);
  assert.match(req.url, /limit=3/);
  assert.match(req.ua, /^theroofinglist-cli\/\d+\.\d+\.\d+$/);
});

test('search --json prints JSON that parses', async () => {
  const r = await run(['search', '--trade', 'roofing', '--city', 'Austin', '--state', 'TX', '--json']);
  assert.equal(r.code, 0);
  assert.deepEqual(JSON.parse(r.stdout), { contractors: [firm] });
});

test('an empty search exits 0', async () => {
  const r = await run(['search', '--trade', 'roofing', '--city', 'Nowhere', '--state', 'TX']);
  assert.equal(r.code, 0);
  assert.equal(r.stdout.trim(), 'No listed contractors match.');
});

test('get prints the block', async () => {
  const r = await run(['get', '101']);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /^Name:    Lone Star Roofing$/m);
});

test('get --json parses', async () => {
  const r = await run(['get', '101', '--json']);
  assert.deepEqual(JSON.parse(r.stdout), firm);
});

test('a 404 exits 1 with the API message', async () => {
  const r = await run(['get', '999']);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /No listed contractor with id 999\./);
  assert.equal(r.stdout, '');
});

test('a 429 says how long to wait, exit 1', async () => {
  const r = await run(['search', '--trade', 'roofing', '--city', 'Busy', '--state', 'TX']);
  assert.equal(r.code, 1);
  assert.match(r.stderr, /Wait 30 seconds/);
});

test('usage errors exit 2 with a hint', async () => {
  for (const args of [
    ['search', '--trade', 'plumbing', '--city', 'Austin', '--state', 'TX'],
    ['search', '--city', 'Austin'],
    ['search', '--trade', 'roofing', '--city', 'Austin', '--state', 'TX', '--limit', '30'],
    ['get'],
    ['get', 'abc'],
    ['frobnicate'],
    ['search', '--colour', 'red'],
  ]) {
    const r = await run(args);
    assert.equal(r.code, 2, `${args.join(' ')}: ${r.stderr}`);
    assert.match(r.stderr, /^Error: /);
    assert.match(r.stderr, /theroofinglist --help/);
  }
});

test('help and version exit 0', async () => {
  for (const args of [[], ['help'], ['--help'], ['-h']]) {
    const r = await run(args);
    assert.equal(r.code, 0);
    assert.match(r.stdout, /Data: https:\/\/theroofinglist\.com\/mcp\/\n$/);
  }
  for (const args of [['--version'], ['-v']]) {
    const r = await run(args);
    assert.equal(r.stdout.trim(), '0.1.0');
  }
});

test('a network failure exits 1', async () => {
  const r = await new Promise((resolve) => {
    execFile(process.execPath, [BIN, 'get', '1'], { env: { ...process.env, THEROOFINGLIST_API: 'http://127.0.0.1:1' } }, (err, stdout, stderr) =>
      resolve({ code: err ? err.code : 0, stderr }),
    );
  });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /Could not reach/);
});
