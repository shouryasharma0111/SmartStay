const config = require('../config');
const { MockDigiLockerProvider, OfficialDigiLockerProvider } = require('./digilocker-provider');

class DigiLockerService {
  constructor() {
    this.provider = config.digilocker.environment === 'production'
      ? new OfficialDigiLockerProvider()
      : new MockDigiLockerProvider();
  }

  verify(input) {
    return this.provider.verify(input);
  }
}

module.exports = new DigiLockerService();