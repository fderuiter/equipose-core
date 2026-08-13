# Welcome to the Developer Portal

Welcome to the internal engineering documentation portal. This portal acts as the single source of truth for our architecture, backend applications, database layout, and local setup guides.

## Microservices Layout

Our system is structured as a robust, containerized application with complete database separation, a centralized authentication service (SSO), and an API Gateway managing routing and authorization rules.

```
                    ┌────────────────────────┐
                    │      Client Browser    │
                    └───────────┬────────────┘
                                │
                                │ Port 8080 (GATEWAY_PORT)
                                ▼
                    ┌────────────────────────┐
                    │   Nginx API Gateway    │
                    └───────────┬────────────┘
                                │
       ┌────────────────────────┼────────────────────────┐
       │ (Public)               │ (Public)               │ (Authenticated, /app3/*)
       ▼                        ▼                        ▼
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│    app1      │         │    app2      │         │    app3      │
└──────┬───────┘         └──────┬───────┘         └──────┬───────┘
       │                        │                        │
       ▼                        ▼                        ▼
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│  db1 (Postgres)        │  db2 (Postgres)        │  db3 (Postgres)
└──────────────┘         └──────────────┘         └──────────────┘
```

The stack is composed of the following core systems:
- **API Gateway (Nginx):** Handles SSL termination, routing, and SSO authorization validation.
- **App 1 & App 2 (Python Servers):** Independent, public microservices with their own dedicated PostgreSQL databases.
- **App 3 (Python Server):** Protected microservice. Requires SSO validation before requests are routed to it.
- **Auth Service (Node.js):** Acts as the centralized authentication service, validating tokens and managing user sessions.
