-- Idempotent schema creation
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS entities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Idempotent seeding using INSERT ... ON CONFLICT DO NOTHING
INSERT INTO users (username, email) VALUES
('alice', 'alice@equipose.local'),
('bob', 'bob@equipose.local'),
('charlie', 'charlie@equipose.local')
ON CONFLICT (username) DO NOTHING;

INSERT INTO entities (name, type, description) VALUES
('Primary Relay', 'Gateway', 'The core routing gateway for local development'),
('Identity Store', 'Database', 'Relational database containing identity schema'),
('Graph Model', 'Neo4j', 'Graph database representing entity relationships')
ON CONFLICT (name) DO NOTHING;
