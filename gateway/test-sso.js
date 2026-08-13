const assert = require('assert');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Path to the installed jsonwebtoken in auth-service node_modules
const jwt = require('./auth-service/node_modules/jsonwebtoken');

const AUTH_PORT = 3300;
let authProcess = null;

// Load RSA keys
const privateKeyPath = path.join(__dirname, 'private.pem');
const publicKeyPath = path.join(__dirname, 'pubkey.pem');

const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
const publicKey = fs.readFileSync(publicKeyPath, 'utf8');

function startAuthService() {
  return new Promise((resolve, reject) => {
    console.log('Starting Auth Service on port', AUTH_PORT);
    authProcess = spawn('node', [path.join(__dirname, 'auth-service', 'index.js')], {
      env: {
        ...process.env,
        PORT: AUTH_PORT,
        JWT_PUBLIC_KEY: publicKey
      }
    });

    authProcess.stdout.on('data', (data) => {
      console.log(`[Auth Service stdout]: ${data.toString().trim()}`);
      if (data.toString().includes('Auth service listening on port')) {
        resolve();
      }
    });

    authProcess.stderr.on('data', (data) => {
      console.error(`[Auth Service stderr]: ${data.toString().trim()}`);
    });

    authProcess.on('error', (err) => {
      reject(err);
    });
  });
}

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        headers: res.headers,
        body
      }));
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  try {
    await startAuthService();

    console.log('\n--- Test Case 1: Validate HTTP /health endpoint ---');
    const healthRes = await request({
      host: '127.0.0.1',
      port: AUTH_PORT,
      path: '/health',
      method: 'GET'
    });
    assert.strictEqual(healthRes.statusCode, 200, 'Health endpoint should return 200 OK');
    console.log('PASS: Health check');

    console.log('\n--- Test Case 2: Reject validation when no token is provided ---');
    const noTokenRes = await request({
      host: '127.0.0.1',
      port: AUTH_PORT,
      path: '/validate',
      method: 'GET'
    });
    assert.strictEqual(noTokenRes.statusCode, 401, 'Request without token should return 401');
    console.log('PASS: Rejected empty token requests');

    console.log('\n--- Test Case 3: Accept validation with a valid Azure AD RS256 token ---');
    const userPayload = {
      unique_name: 'test.user@equipose.local',
      iss: 'https://login.microsoftonline.com/tenant-id/v2.0',
      aud: 'equipose-client-id',
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    const validToken = jwt.sign(userPayload, privateKey, { algorithm: 'RS256' });

    const validRes = await request({
      host: '127.0.0.1',
      port: AUTH_PORT,
      path: '/validate',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${validToken}`
      }
    });
    assert.strictEqual(validRes.statusCode, 200, 'Valid token should be authorized');
    assert.strictEqual(validRes.headers['x-remote-user'], 'test.user@equipose.local', 'Should inject correct X-Remote-User header');
    console.log('PASS: Authorized valid token and successfully extracted unique_name claim');

    console.log('\n--- Test Case 4: Accept token via access_token cookie ---');
    const cookieRes = await request({
      host: '127.0.0.1',
      port: AUTH_PORT,
      path: '/validate',
      method: 'GET',
      headers: {
        'Cookie': `access_token=${validToken}`
      }
    });
    assert.strictEqual(cookieRes.statusCode, 200, 'Valid token via cookie should be authorized');
    assert.strictEqual(cookieRes.headers['x-remote-user'], 'test.user@equipose.local', 'Should inject correct X-Remote-User header from cookie');
    console.log('PASS: Authorized valid token from access_token cookie');

    console.log('\n--- Test Case 5: Reject expired tokens ---');
    const expiredPayload = {
      unique_name: 'expired.user@equipose.local',
      exp: Math.floor(Date.now() / 1000) - 100
    };
    const expiredToken = jwt.sign(expiredPayload, privateKey, { algorithm: 'RS256' });
    const expiredRes = await request({
      host: '127.0.0.1',
      port: AUTH_PORT,
      path: '/validate',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${expiredToken}`
      }
    });
    assert.strictEqual(expiredRes.statusCode, 401, 'Expired token should return 401');
    console.log('PASS: Rejected expired token requests');

    console.log('\n--- Test Case 6: Reject tokens with invalid signatures ---');
    const otherKeys = jwt.sign(userPayload, 'some-other-secret-or-key'); // Not signed with privateKey
    const invalidSigRes = await request({
      host: '127.0.0.1',
      port: AUTH_PORT,
      path: '/validate',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${otherKeys}`
      }
    });
    assert.strictEqual(invalidSigRes.statusCode, 401, 'Invalid signature token should return 401');
    console.log('PASS: Rejected invalid signature requests');

    console.log('\n--- Test Case 7: Concurrent Single Logout clears modern and legacy sessions ---');
    const logoutRes = await request({
      host: '127.0.0.1',
      port: AUTH_PORT,
      path: '/logout',
      method: 'POST'
    });
    assert.strictEqual(logoutRes.statusCode, 200, 'Logout should succeed');
    
    // Check that cookies are concurrently cleared
    const setCookies = logoutRes.headers['set-cookie'] || [];
    assert.ok(setCookies.some(c => c.includes('access_token=;')), 'Should clear access_token cookie');
    assert.ok(setCookies.some(c => c.includes('token=;')), 'Should clear token cookie');
    assert.ok(setCookies.some(c => c.includes('JSESSIONID=;')), 'Should clear legacy session cookie JSESSIONID');
    console.log('PASS: Concurrently invalidated modern and legacy sessions upon logout');

    console.log('\nALL TESTS PASSED SUCCESSFULLY! 🚀');
    cleanup();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err);
    cleanup();
    process.exit(1);
  }
}

function cleanup() {
  if (authProcess) {
    console.log('Shutting down Auth Service process...');
    authProcess.kill();
  }
}

process.on('SIGINT', () => {
  cleanup();
  process.exit(1);
});

runTests();
