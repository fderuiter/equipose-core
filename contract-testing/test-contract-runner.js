const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const RUNNER_PATH = path.join(__dirname, 'runner.js');
const REAL_NGINX_CONF = path.join(__dirname, '..', 'gateway', 'nginx.conf');
const REAL_OPENAPI = path.join(__dirname, '..', 'openapi.json');

// Helper to run the runner script with specific environment variables
function runContractRunner(env = {}) {
  return new Promise((resolve) => {
    exec(`node ${RUNNER_PATH}`, {
      env: {
        ...process.env,
        GATEWAY_URL: 'http://localhost:8080', // use local port mapped on host
        NGINX_CONF_PATH: REAL_NGINX_CONF,
        OPENAPI_PATH: REAL_OPENAPI,
        PRIVATE_KEY_PATH: path.join(__dirname, '..', 'gateway', 'private.pem'),
        ...env
      }
    }, (error, stdout, stderr) => {
      resolve({
        code: error ? error.code : 0,
        stdout,
        stderr
      });
    });
  });
}

async function main() {
  console.log('Running Self-Tests for Contract Testing Runner...\n');

  // --- Test Case 1: Standard Active Stack should pass ---
  console.log('Test Case 1: Real gateway and real OpenAPI spec (should pass)');
  const res1 = await runContractRunner();
  console.log(`Exit code: ${res1.code}`);
  assert.strictEqual(res1.code, 0, 'Should pass with 0 exit code under normal circumstances');
  console.log('✅ Pass: Normal config passed successfully.\n');


  // --- Test Case 2: Undocumented route in Nginx configuration ---
  console.log('Test Case 2: Undocumented route in Nginx config (should fail)');
  
  // Create a temp nginx.conf with an undocumented location /app4/
  const tempNginxConf = path.join(__dirname, 'temp_nginx_undocumented.conf');
  const realConfText = fs.readFileSync(REAL_NGINX_CONF, 'utf8');
  const modifiedConfText = realConfText + '\n    location /app4/ {\n        set $app4_upstream http://app4:80;\n        proxy_pass $app4_upstream/;\n    }\n';
  fs.writeFileSync(tempNginxConf, modifiedConfText, 'utf8');

  try {
    const res2 = await runContractRunner({ NGINX_CONF_PATH: tempNginxConf });
    console.log(`Exit code: ${res2.code}`);
    assert.notStrictEqual(res2.code, 0, 'Should fail with a non-zero exit code when Nginx has undocumented routes');
    assert.ok(res2.stderr.includes('Undocumented gateway routes found in Nginx configuration') || res2.stdout.includes('Undocumented gateway routes found in Nginx configuration'), 'Error message should point out undocumented routes');
    console.log('✅ Pass: Undocumented route correctly detected and triggered non-zero exit code.\n');
  } finally {
    if (fs.existsSync(tempNginxConf)) {
      fs.unlinkSync(tempNginxConf);
    }
  }


  // --- Test Case 3: Documented route missing from Nginx configuration ---
  console.log('Test Case 3: Documented OpenAPI path missing from Nginx config (should fail)');
  
  // Create a temp nginx.conf where /app1/ location block is commented out
  const tempNginxConf2 = path.join(__dirname, 'temp_nginx_missing.conf');
  const modifiedConfText2 = realConfText.replace('location /app1/ {', 'location /app1-disabled/ {');
  fs.writeFileSync(tempNginxConf2, modifiedConfText2, 'utf8');

  try {
    const res3 = await runContractRunner({ NGINX_CONF_PATH: tempNginxConf2 });
    console.log(`Exit code: ${res3.code}`);
    assert.notStrictEqual(res3.code, 0, 'Should fail with a non-zero exit code when Nginx is missing documented routes');
    assert.ok(res3.stderr.includes('Documented OpenAPI paths not exposed in Nginx configuration') || res3.stdout.includes('Documented OpenAPI paths not exposed in Nginx configuration'), 'Error message should point out missing/unexposed paths');
    console.log('✅ Pass: Missing documented route correctly detected and triggered non-zero exit code.\n');
  } finally {
    if (fs.existsSync(tempNginxConf2)) {
      fs.unlinkSync(tempNginxConf2);
    }
  }


  // --- Test Case 4: Gateway route pointing to an invalid upstream ---
  console.log('Test Case 4: Gateway route pointing to an invalid or unresponsive upstream (should fail)');
  
  // We can simulate this by pointing the GATEWAY_URL to an invalid port/address
  const res4 = await runContractRunner({ GATEWAY_URL: 'http://localhost:9999' });
  console.log(`Exit code: ${res4.code}`);
  assert.notStrictEqual(res4.code, 0, 'Should fail with a non-zero exit code when gateway is unresponsive or upstream returns error');
  assert.ok(res4.stderr.includes('did not become ready') || res4.stdout.includes('did not become ready'), 'Error message should report gateway/upstream readiness failure');
  console.log('✅ Pass: Invalid upstream/gateway connection correctly detected and triggered non-zero exit code.\n');

  console.log('🎉 ALL CONTRACT TESTING RUNNER SELF-TESTS PASSED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('❌ SELF-TESTS FAILED:', err);
  process.exit(1);
});
