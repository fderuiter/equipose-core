// Idempotent graph database seeding
MERGE (alice:User {username: 'alice', email: 'alice@equipose.local'})
MERGE (bob:User {username: 'bob', email: 'bob@equipose.local'})
MERGE (charlie:User {username: 'charlie', email: 'charlie@equipose.local'})

MERGE (relay:Entity {name: 'Primary Relay', type: 'Gateway', description: 'The core routing gateway for local development'})
MERGE (idStore:Entity {name: 'Identity Store', type: 'Database', description: 'Relational database containing identity schema'})
MERGE (graphModel:Entity {name: 'Graph Model', type: 'Neo4j', description: 'Graph database representing entity relationships'})

MERGE (alice)-[:MANAGES]->(relay)
MERGE (bob)-[:USES]->(idStore)
MERGE (charlie)-[:DEVELOPED]->(graphModel)
