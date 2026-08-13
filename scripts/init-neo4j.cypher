// Neo4j Database Bootstrap Seed Script
// This script initializes a baseline graph schema and populates mock data.

// Create Constraints (Syntax compatible with Neo4j 4.x/5.x)
CREATE CONSTRAINT user_id_unique IF NOT EXISTS
FOR (u:User) REQUIRE u.id IS UNIQUE;

CREATE CONSTRAINT user_username_unique IF NOT EXISTS
FOR (u:User) REQUIRE u.username IS UNIQUE;

// Seed Sample Users
MERGE (u1:User {id: "usr_001", username: "admin", email: "admin@equipose.local", fullName: "System Administrator"})
MERGE (u2:User {id: "usr_002", username: "developer", email: "developer@equipose.local", fullName: "Lead Developer"})
MERGE (u3:User {id: "usr_003", username: "tester", email: "tester@equipose.local", fullName: "QA Engineer"})

// Seed Sample Services
MERGE (s1:Service {name: "auth-service", port: 3000, type: "internal"})
MERGE (s2:Service {name: "gateway", port: 8080, type: "gateway"})
MERGE (s3:Service {name: "db-postgres", port: 5432, type: "database"})

// Create Relationships
MERGE (u2)-[r1:DEVELOPED]->(s1)
  ON CREATE SET r1.since = datetime()
MERGE (u2)-[r2:DEVELOPED]->(s2)
  ON CREATE SET r2.since = datetime()
MERGE (s2)-[r3:DEPENDS_ON]->(s1)
MERGE (s1)-[r4:CONNECTS_TO]->(s3);
