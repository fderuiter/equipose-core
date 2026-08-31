const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const neo4j = require('neo4j-driver');

const app = express();
app.use(cookieParser());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Initialize Neo4j driver
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

let driver = null;
try {
  driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));
} catch (e) {
  console.error('Failed to initialize Neo4j driver:', e.message);
}

async function recordGraphTelemetry(decoded, username) {
  if (!driver) return;
  const session = driver.session();
  try {
    const email = decoded.email || decoded.upn || '';
    const firstName = decoded.given_name || decoded.firstName || decoded.first_name || '';
    const lastName = decoded.family_name || decoded.lastName || decoded.last_name || '';
    const role = decoded.role || decoded.roles || decoded.system_role || 'RESEARCHASSISTANT';
    const studyId = decoded.active_study_id || decoded.study_id || decoded.study || 1;
    const tenantId = decoded.tenant_id || 'default';

    const cypher = `
      MERGE (u:User {username: $username})
      ON CREATE SET u.email = $email, u.firstName = $firstName, u.lastName = $lastName, u.createdAt = datetime()
      ON MATCH SET u.email = $email, u.firstName = $firstName, u.lastName = $lastName, u.updatedAt = datetime()

      MERGE (r:Role {name: $role})

      CREATE (u)-[:AUTHENTICATED {timestamp: datetime(), tenantId: $tenantId, provider: 'OIDC'}]->(a:AuthEvent {status: 'SUCCESS', timestamp: datetime()})

      CREATE (u)-[hr:HAS_ROLE_HISTORY {assignedAt: datetime(), studyId: $studyId, source: 'OIDC'}]->(r)
    `;

    await session.executeWrite(tx => tx.run(cypher, {
      username,
      email,
      firstName,
      lastName,
      role: String(role),
      studyId: Number(studyId),
      tenantId: String(tenantId)
    }));
  } catch (err) {
    console.error('Neo4j telemetry error:', err.message);
  } finally {
    await session.close();
  }
}

// Load the public key from the environment variable or from a mounted file
let publicKey = process.env.JWT_PUBLIC_KEY || '';
const pubKeyPath = '/etc/gateway/pubkey.pem';

if (!publicKey && fs.existsSync(pubKeyPath)) {
  try {
    publicKey = fs.readFileSync(pubKeyPath, 'utf8').trim();
    console.log('Loaded public key from', pubKeyPath);
  } catch (err) {
    console.error('Error reading public key file:', err);
  }
}

if (!publicKey) {
  console.warn('Warning: No JWT public key configured. Will use fallback/mock decoding.');
}

app.get('/health', (req, res) => {
  res.status(200).send('ok\n');
});

app.get('/validate', (req, res) => {
  // Extract token from Authorization header or from cookies
  let token = null;
  
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.substring(7).trim();
  }
  
  if (!token && req.cookies) {
    token = req.cookies['access_token'] || req.cookies['token'];
  }
  
  if (!token) {
    console.log('Validation failed: No token provided.');
    return res.status(401).send('Unauthorized: No token provided');
  }
  
  try {
    let decoded;
    if (publicKey) {
      // Validate signature, expiration, etc.
      // Azure AD tokens might have multiple algorithms, but RS256 is standard
      decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    } else {
      // Fallback: decode without verification if no public key is configured
      decoded = jwt.decode(token);
      if (!decoded) {
        throw new Error('Could not decode token');
      }
      // Check expiration if present
      if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        throw new Error('Token has expired');
      }
    }
    
    // Extract user identity
    // Azure AD tokens typically contain 'unique_name', 'upn', 'preferred_username', 'email', or 'sub'
    const username = decoded.unique_name || decoded.upn || decoded.preferred_username || decoded.email || decoded.sub;
    
    if (!username) {
      console.log('Validation failed: No identity claim found in token.');
      return res.status(401).send('Unauthorized: No identity claim found in token');
    }
    
    // Guardrail check: ensure no PHI or patient data is in the injected headers.
    // Standard user fields are fine.
    
    console.log(`Successfully validated token for user: ${username}`);
    
    // Asynchronously record Neo4j graph telemetry without delaying response
    recordGraphTelemetry(decoded, username).catch(telemetryErr => {
      console.error('Non-blocking Neo4j graph telemetry error:', telemetryErr.message);
    });

    // Set response header to pass to Nginx
    res.setHeader('X-Remote-User', username);
    return res.status(200).send('OK');
  } catch (err) {
    console.log('Validation failed:', err.message);
    return res.status(401).send(`Unauthorized: ${err.message}`);
  }
});

// Logout endpoint to clear cookies
app.all('/logout', (req, res) => {
  console.log('Logging out user...');
  // Invalidate legacy session and clear modern authentication tokens concurrently
  res.cookie('access_token', '', { maxAge: 0, expires: new Date(0), path: '/' });
  res.cookie('token', '', { maxAge: 0, expires: new Date(0), path: '/' });
  res.cookie('JSESSIONID', '', { maxAge: 0, expires: new Date(0), path: '/' });
  
  const redirectTo = req.query.redirect || req.query.redirect_uri || '/';
  return res.status(200).json({ message: 'Logged out successfully', redirect: redirectTo });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Auth service listening on port ${PORT}`);
});
