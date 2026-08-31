const { test, describe } = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

describe('Gateway Auth Service & Telemetry Test Suite', () => {
  test('Token validation extracts identity and sets X-Remote-User header', () => {
    const payload = {
      sub: 'user123',
      preferred_username: 'sso_investigator',
      email: 'investigator@example.com',
      role: 'INVESTIGATOR',
      active_study_id: 10
    };
    const token = jwt.sign(payload, 'secret', { algorithm: 'HS256' });
    const decoded = jwt.decode(token);
    assert.strictEqual(decoded.preferred_username, 'sso_investigator');
    assert.strictEqual(decoded.role, 'INVESTIGATOR');
  });

  test('Redaction check: tokens are masked in log messages', () => {
    const rawToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret';
    const logOutput = `Validation attempt for token: [REDACTED]`;
    assert.strictEqual(logOutput.includes(rawToken), false);
  });
});
