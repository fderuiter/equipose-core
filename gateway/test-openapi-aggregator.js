const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');

function request(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body
      }));
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('Starting OpenAPI Aggregator & Portal Integration Tests...');

  const baseUrl = 'http://localhost:8080';

  console.log('\n--- Test 1: Verify API Documentation Portal (/docs/) ---');
  const docsRes = await request(`${baseUrl}/docs/`);
  assert.strictEqual(docsRes.statusCode, 200, 'Portal should be accessible');
  assert.ok(docsRes.body.includes('Equipose API Catalog'), 'Portal should contain catalog title');
  assert.ok(docsRes.body.includes('<global-nav'), 'Portal should render global-nav custom element');
  assert.ok(docsRes.body.includes('/app1/openapi.json'), 'Portal selector should list app1 spec');
  assert.ok(docsRes.body.includes('/app2/openapi.json'), 'Portal selector should list app2 spec');
  assert.ok(docsRes.body.includes('/app3/openapi.json'), 'Portal selector should list app3 spec');
  console.log('PASS: Portal serves correct HTML with selectors');

  console.log('\n--- Test 2: Verify /docs redirect ---');
  const redirectRes = await request(`${baseUrl}/docs`);
  assert.strictEqual(redirectRes.statusCode, 301, '/docs without trailing slash should redirect');
  assert.ok(redirectRes.headers.location.includes('/docs/'), 'Should redirect to /docs/');
  console.log('PASS: /docs redirects to /docs/ correctly');

  console.log('\n--- Test 3: Verify live OpenAPI specs endpoints ---');
  for (const appNum of [1, 2, 3]) {
    const specUrl = `${baseUrl}/app${appNum}/openapi.json`;
    const specRes = await request(specUrl);
    assert.strictEqual(specRes.statusCode, 200, `app${appNum} openapi.json should return 200`);
    assert.strictEqual(specRes.headers['content-type'], 'application/json', 'Content-Type must be application/json');
    const parsedSpec = JSON.parse(specRes.body);
    assert.strictEqual(parsedSpec.openapi, '3.0.0', 'Should be OpenAPI 3.0.0 spec');
    assert.strictEqual(parsedSpec.servers[0].url, `/app${appNum}`, 'Server url should map through gateway');
    console.log(`PASS: app${appNum} live spec fetched and verified successfully`);
  }

  console.log('\n--- Test 4: Dynamic Spec Update (No Gateway Restart) ---');
  const specPath = path.join(__dirname, 'specs', 'app1.json');
  const originalContent = fs.readFileSync(specPath, 'utf8');
  
  try {
    // Modify spec file on the host
    const parsed = JSON.parse(originalContent);
    parsed.info.title = 'Updated App 1 Title';
    fs.writeFileSync(specPath, JSON.stringify(parsed, null, 2), 'utf8');

    // Wait a brief moment for filesystem sync
    await new Promise(resolve => setTimeout(resolve, 500));

    // Fetch again and verify modification
    const updatedRes = await request(`${baseUrl}/app1/openapi.json`);
    assert.strictEqual(updatedRes.statusCode, 200, 'Updated spec should be served');
    const updatedParsed = JSON.parse(updatedRes.body);
    assert.strictEqual(updatedParsed.info.title, 'Updated App 1 Title', 'Spec should update dynamically');
    console.log('PASS: Modifying spec file updates endpoints dynamically without container restarts!');
  } finally {
    // Restore original content
    fs.writeFileSync(specPath, originalContent, 'utf8');
  }

  console.log('\nALL INTEGRATION TESTS PASSED SUCCESSFULLY! 🌟');
}

runTests().catch(err => {
  console.error('Integration Tests Failed:', err);
  process.exit(1);
});
