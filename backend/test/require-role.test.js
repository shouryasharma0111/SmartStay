const test = require('node:test');
const assert = require('node:assert/strict');
const requireRole = require('../src/middleware/require-role');

function invokeGuard(role) {
  const req = {
    body: { role: 'admin' },
    ...(role ? { user: { role } } : {})
  };
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
  let continued = false;

  requireRole('admin')(req, response, () => {
    continued = true;
  });

  return { response, continued };
}

test('admin role can pass an admin guard', () => {
  const result = invokeGuard('admin');
  assert.equal(result.continued, true);
  assert.equal(result.response.statusCode, 200);
});

test('tenant and owner remain forbidden even if the request body claims admin', () => {
  for (const role of ['tenant', 'owner']) {
    const result = invokeGuard(role);
    assert.equal(result.continued, false);
    assert.equal(result.response.statusCode, 403);
  }
});

test('unauthenticated requests cannot pass the role guard', () => {
  const result = invokeGuard(null);
  assert.equal(result.continued, false);
  assert.equal(result.response.statusCode, 401);
});