# Local Setup Guide

Follow this guide to get your local development environment up and running quickly.

## Prerequisites

To maintain a clean and reproducible workspace, there are **zero software installation requirements** beyond a standard Docker installation:
- **Docker Engine** (v20.10.0 or higher)
- **Docker Compose** (v2.0.0 or higher)

No Python runtimes, Node.js setups, or package managers are required on your host machine.

---

## Environment Configuration

The environment uses a `.env` file to customize container ports and names. 

1. On your first run, the orchestrator script automatically generates a `.env` file from the `.env.example` template if one is not already present.
2. The key configuration options include:
   - `GATEWAY_PORT`: Port exposed by the Nginx API gateway (default: `8080`).
   - `DOCS_PORT`: Port exposed by the MkDocs developer portal (default: `8000`).

---

## Starting the Environment

We provide shell scripts within the `/scripts` directory to simplify startup and shutdown.

### 1. Start the complete application stack
To spin up all backend services, databases, authentication, gateway, and the MkDocs portal:
```bash
./scripts/up.sh
```
Once initialized:
- **Nginx API Gateway:** Available at [http://localhost:8080](http://localhost:8080) (or your configured `GATEWAY_PORT`).
- **Developer Portal (MkDocs):** Available at [http://localhost:8000](http://localhost:8000) (or your configured `DOCS_PORT`).

### 2. Run only the Developer Portal (Standalone Documentation mode)
If you are strictly editing documentation and want to bypass launching backend databases and application containers, start only the `mkdocs` service:
```bash
./scripts/up.sh mkdocs
```
This boots only the lightweight MkDocs container, rendering the portal and watching file changes for instant updates.

---

## Live Hot-Reloading

The MkDocs service mounts the local `/docs` and `mkdocs.yml` files directly into the container as volumes.
- When you edit any Markdown files inside `/docs/` on your host editor and press save, MkDocs detects the file system event and triggers a **hot-reload** action.
- The browser will refresh automatically, rendering your modifications in less than two seconds.
