const test = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../src/app');

let server, base;
test.before(async () => {
  await new Promise((r) => { server = createApp().listen(0, r); });
  base = `http://localhost:${server.address().port}`;
});
test.after(() => server.close());

const post = (body, raw) => fetch(`${base}/v1/users`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: raw ?? JSON.stringify(body),
});
const valid = { name: 'Ravi', email: 'ravi@example.com', age: 21 };

test('201 on valid user', async () => {
  const res = await post(valid);
  assert.strictEqual(res.status, 201);
});
test('400 lists ALL validation problems', async () => {
  const res = await post({ name: 'R', email: 'nope', age: 5 });
  const { error } = await res.json();
  assert.strictEqual(res.status, 400);
  assert.strictEqual(error.code, 'VALIDATION_ERROR');
  assert.ok(error.details.length >= 3);
});
test('400 on wrong type', async () => {
  const res = await post({ ...valid, age: '21' });
  assert.strictEqual(res.status, 400);
});
test('400 on unknown field (strict)', async () => {
  const res = await post({ ...valid, email: 'x@example.com', isAdmin: true });
  assert.strictEqual(res.status, 400);
});
test('400 on malformed JSON', async () => {
  const res = await post(null, '{bad json');
  assert.strictEqual((await res.json()).error.code, 'MALFORMED_JSON');
});
test('409 on duplicate email', async () => {
  const res = await post(valid);
  assert.strictEqual(res.status, 409);
});
test('400 on invalid param', async () => {
  const res = await fetch(`${base}/v1/users/abc`);
  assert.strictEqual(res.status, 400);
});
test('400 on invalid query', async () => {
  const res = await fetch(`${base}/v1/users?page=0&limit=1000&sort=password`);
  const { error } = await res.json();
  assert.strictEqual(error.details.length, 3);
});
test('404 for missing user and unknown route', async () => {
  assert.strictEqual((await fetch(`${base}/v1/users/999`)).status, 404);
  assert.strictEqual((await fetch(`${base}/nope`)).status, 404);
});
test('500 never leaks stack or message (sync + async)', async () => {
  for (const path of ['/v1/crash', '/v1/crash-async']) {
    const res = await fetch(`${base}${path}`);
    const text = await res.text();
    assert.strictEqual(res.status, 500);
    assert.ok(!text.includes('hunter2'));
    assert.ok(!text.includes('.js:'));
    assert.ok(!text.includes('stack'));
  }
});
test('every error has the same shape + requestId', async () => {
  const res = await fetch(`${base}/v1/users/abc`);
  const { error } = await res.json();
  assert.ok(error.code && error.message && error.requestId);
  assert.strictEqual(res.headers.get('x-request-id'), error.requestId);
});
