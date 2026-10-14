class MockDigiLockerProvider {
  async verify({ scenario }) {
    const status = ['VERIFIED', 'FAILED', 'MANUAL_REVIEW'].includes(scenario)
      ? scenario
      : 'MANUAL_REVIEW';
    const reasons = {
      VERIFIED: null,
      FAILED: 'Demo scenario: property and document details do not match.',
      MANUAL_REVIEW: 'Demo scenario: additional human review is required.'
    };

    return {
      provider: 'DigiLocker Demo',
      mode: 'DEMO',
      status,
      documentType: 'Ownership proof (simulated)',
      issuer: 'Demo provider (simulated)',
      matchingResult: status === 'VERIFIED' ? 'MATCHED (simulated)' : 'NOT CONFIRMED (simulated)',
      failureReason: reasons[status],
      verifiedAt: status === 'VERIFIED' ? new Date() : null,
      metadata: { simulated: true }
    };
  }
}

class OfficialDigiLockerProvider {
  async verify() {
    const error = new Error('Production DigiLocker integration is not configured.');
    error.status = 503;
    throw error;
  }
}

module.exports = { MockDigiLockerProvider, OfficialDigiLockerProvider };