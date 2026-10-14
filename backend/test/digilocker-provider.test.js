const test = require('node:test');
const assert = require('node:assert/strict');
const { MockDigiLockerProvider, OfficialDigiLockerProvider } = require('../src/services/digilocker-provider');

test('demo provider returns explicit simulated outcomes without document data', async () => {
  const provider = new MockDigiLockerProvider();
  for (const status of ['VERIFIED', 'FAILED', 'MANUAL_REVIEW']) {
    const result = await provider.verify({ scenario: status });
    assert.equal(result.status, status);
    assert.equal(result.mode, 'DEMO');
    assert.match(result.provider, /Demo/);
    assert.equal(result.metadata.simulated, true);
    assert.equal('documentNumber' in result, false);
    assert.equal('accessToken' in result, false);
  }
});

test('official provider refuses to make undocumented or unconfigured requests', async () => {
  const provider = new OfficialDigiLockerProvider();
  await assert.rejects(provider.verify({}), error => {
    assert.equal(error.status, 503);
    assert.match(error.message, /not configured/i);
    return true;
  });
});