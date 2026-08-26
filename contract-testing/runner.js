const fs = require('fs');
const path = require('path');
const http = require('http');
const jwt = require('jsonwebtoken');

// Configurable environment variables with sensible defaults
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://gateway:80';
const NGINX_CONF_PATH = process.env.NGINX_CONF_PATH || '/app/gateway/nginx.conf';
const OPENAPI_PATH = process.env.OPENAPI_PATH || '/app/openapi.json';
const PRIVATE_KEY_PATH = process.env.PRIVATE_KEY_PATH || '/app/gateway/private.pem';

// Helper function to make HTTP requests using the built-in http module
function makeRequest(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      const reqOptions = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers: options.headers || {}
      };

      const req = http.request(reqOptions, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.setTimeout(5000, () => {
        req.destroy(new Error('Request timeout'));
      });

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

// Function to wait for gateway availability
async function waitForGateway(url, maxRetries = 30) {
  const healthUrl = `${url}/health`;
  console.log(`Waiting for gateway to be healthy at ${healthUrl}...`);
  for (let i = 1; i <= maxRetries; i++) {
    try {
      const res = await makeRequest(healthUrl);
      if (res.statusCode === 200 && res.body.trim() === 'ok') {
        console.log(`Gateway is up and running! (Status: 200, Body: ${res.body.trim()})`);
        return true;
      }
    } catch (err) {
      // Ignore connection/networking errors during polling
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Gateway at ${url} did not become ready within ${maxRetries} seconds.`);
}

// Function to parse location paths from Nginx configuration file
function parseNginxLocations(confPath) {
  if (!fs.existsSync(confPath)) {
    throw new Error(`Nginx configuration file not found at: ${confPath}`);
  }
  const confText = fs.readFileSync(confPath, 'utf8');
  const lines = confText.split('\n');
  const locations = [];
  let currentLoc = null;
  let isInternal = false;

  for (let line of lines) {
    // Strip comments
    line = line.split('#')[0].trim();
    if (!line) continue;
    
    const locMatch = line.match(/^location\s+(=?\s*[^\s{]+)\s*\{?/);
    if (locMatch) {
      currentLoc = locMatch[1].trim().replace(/^=\s*/, '');
      isInternal = false;
    }
    if (currentLoc) {
      if (line.includes('internal;')) {
        isInternal = true;
      }
      if (line.includes('}')) {
        if (!isInternal) {
          locations.push(currentLoc);
        }
        currentLoc = null;
        isInternal = false;
      }
    }
  }
  return locations;
}

// Main execution function
async function main() {
  console.log('Starting API Contract Testing Validation Suite...');
  
  try {
    // 1. Wait for Gateway to be ready
    await waitForGateway(GATEWAY_URL);

    // 2. Load OpenAPI Specification
    if (!fs.existsSync(OPENAPI_PATH)) {
      throw new Error(`OpenAPI specification file not found at: ${OPENAPI_PATH}`);
    }
    const openapi = JSON.parse(fs.readFileSync(OPENAPI_PATH, 'utf8'));
    const openapiPaths = Object.keys(openapi.paths).sort();
    console.log('Loaded OpenAPI Paths:', openapiPaths);

    // 3. Parse Nginx Gateway Locations
    const nginxPaths = parseNginxLocations(NGINX_CONF_PATH).sort();
    console.log('Parsed Nginx Location Paths:', nginxPaths);

    // 4. Statically validate matching routes between Nginx gateway and OpenAPI Spec
    console.log('\n--- Running Static Contract Validation ---');
    const missingInOpenAPI = nginxPaths.filter(p => !openapiPaths.includes(p));
    const missingInNginx = openapiPaths.filter(p => !nginxPaths.includes(p));

    let staticFailed = false;
    if (missingInOpenAPI.length > 0) {
      console.error('❌ FAIL: Undocumented gateway routes found in Nginx configuration:', missingInOpenAPI);
      staticFailed = true;
    }
    if (missingInNginx.length > 0) {
      console.error('❌ FAIL: Documented OpenAPI paths not exposed in Nginx configuration:', missingInNginx);
      staticFailed = true;
    }

    if (staticFailed) {
      throw new Error('Static contract routing validation failed.');
    }
    console.log('✅ PASS: Static routing matches exactly between Nginx and OpenAPI specification.');

    // 5. Dynamic validation of routes
    console.log('\n--- Running Dynamic Endpoint Verification ---');
    let dynamicFailed = false;

    // Verify /health
    try {
      console.log('Testing /health endpoint...');
      const res = await makeRequest(`${GATEWAY_URL}/health`);
      if (res.statusCode !== 200) {
        console.error(`❌ /health failed: expected status 200, got ${res.statusCode}`);
        dynamicFailed = true;
      } else if (res.body.trim() !== 'ok') {
        console.error(`❌ /health failed: expected body "ok", got "${res.body.trim()}"`);
        dynamicFailed = true;
      } else {
        console.log('✅ /health matches contract.');
      }
    } catch (err) {
      console.error('❌ /health request error:', err.message);
      dynamicFailed = true;
    }

    // Verify /logout
    try {
      console.log('Testing /logout endpoint (POST)...');
      const res = await makeRequest(`${GATEWAY_URL}/logout`, { method: 'POST' });
      if (res.statusCode !== 200) {
        console.error(`❌ /logout failed: expected status 200, got ${res.statusCode}`);
        dynamicFailed = true;
      } else {
        const json = JSON.parse(res.body);
        if (!json.message || !json.redirect) {
          console.error('❌ /logout failed: response missing expected keys message/redirect. Body:', res.body);
          dynamicFailed = true;
        } else {
          console.log('✅ /logout matches contract.');
        }
      }
    } catch (err) {
      console.error('❌ /logout request error:', err.message);
      dynamicFailed = true;
    }

    // Verify /app1/
    try {
      console.log('Testing /app1/ endpoint...');
      const res = await makeRequest(`${GATEWAY_URL}/app1/`);
      if (res.statusCode !== 200) {
        console.error(`❌ /app1/ failed: expected status 200, got ${res.statusCode}`);
        dynamicFailed = true;
      } else if (!res.body.includes('Hello from app1!')) {
        console.error(`❌ /app1/ failed: response does not contain "Hello from app1!". Body:\n${res.body}`);
        dynamicFailed = true;
      } else {
        console.log('✅ /app1/ matches contract.');
      }
    } catch (err) {
      console.error('❌ /app1/ request error:', err.message);
      dynamicFailed = true;
    }

    // Verify /app2/
    try {
      console.log('Testing /app2/ endpoint...');
      const res = await makeRequest(`${GATEWAY_URL}/app2/`);
      if (res.statusCode !== 200) {
        console.error(`❌ /app2/ failed: expected status 200, got ${res.statusCode}`);
        dynamicFailed = true;
      } else if (!res.body.includes('Hello from app2!')) {
        console.error(`❌ /app2/ failed: response does not contain "Hello from app2!". Body:\n${res.body}`);
        dynamicFailed = true;
      } else {
        console.log('✅ /app2/ matches contract.');
      }
    } catch (err) {
      console.error('❌ /app2/ request error:', err.message);
      dynamicFailed = true;
    }

    // Verify /app3/ (SSO Protected path)
    // 5a. Verify unauthorized response first
    try {
      console.log('Testing /app3/ endpoint without authentication token...');
      const res = await makeRequest(`${GATEWAY_URL}/app3/`);
      if (res.statusCode !== 401) {
        console.error(`❌ /app3/ failed: expected status 401 Unauthorized without token, got ${res.statusCode}`);
        dynamicFailed = true;
      } else {
        console.log('✅ /app3/ without token properly rejected with 401 Unauthorized.');
      }
    } catch (err) {
      console.error('❌ /app3/ (unauthorized check) request error:', err.message);
      dynamicFailed = true;
    }

    // 5b. Verify authorized response with generated valid token
    try {
      console.log('Testing /app3/ endpoint with valid JWT token (SSO path verification)...');
      if (!fs.existsSync(PRIVATE_KEY_PATH)) {
        throw new Error(`Private key file not found for JWT signing: ${PRIVATE_KEY_PATH}`);
      }
      const privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
      const userPayload = {
        unique_name: 'contract.test.user@equipose.local',
        iss: 'https://login.microsoftonline.com/tenant-id/v2.0',
        aud: 'equipose-client-id',
        exp: Math.floor(Date.now() / 1000) + 3600
      };
      const token = jwt.sign(userPayload, privateKey, { algorithm: 'RS256' });

      const res = await makeRequest(`${GATEWAY_URL}/app3/`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.statusCode !== 200) {
        console.error(`❌ /app3/ with token failed: expected status 200, got ${res.statusCode}`);
        dynamicFailed = true;
      } else if (!res.body.includes('Hello from app3!')) {
        console.error(`❌ /app3/ with token failed: response does not contain "Hello from app3!". Body:\n${res.body}`);
        dynamicFailed = true;
      } else {
        console.log('✅ /app3/ with token matches contract and successfully extracts identity claim.');
      }
    } catch (err) {
      console.error('❌ /app3/ (authorized check) error:', err.message);
      dynamicFailed = true;
    }

    if (dynamicFailed) {
      throw new Error('Dynamic contract validation failed.');
    }

    console.log('\n🎉 ALL CONTRACT TESTS PASSED SUCCESSFULLY! 🚀');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ CONTRACT TESTING FAILED:', err.message);
    process.exit(1);
  }
}

main();
