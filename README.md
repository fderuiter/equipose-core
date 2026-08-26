# equipose-core

This repository is the local integration layer for the Equipose stack.

## Included glue configuration

- `/home/runner/work/equipose-core/equipose-core/docker-compose.yml` starts an API gateway, three applications, and three databases together.
- `/home/runner/work/equipose-core/equipose-core/gateway/nginx.conf` routes `/app1`, `/app2`, and `/app3` through a single gateway.
- `/home/runner/work/equipose-core/equipose-core/.env.example` centralizes the shared image, port, project, and database settings.
- `/home/runner/work/equipose-core/equipose-core/scripts/up.sh` boots the stack with the shared environment file.
- `/home/runner/work/equipose-core/equipose-core/scripts/down.sh` stops the shared stack cleanly.

## API Contract Testing

An automated contract testing suite verifies the API gateway configuration against a centralized OpenAPI specification (`openapi.json`).

### Running the Contract Tests

The contract testing container spins up automatically when starting the stack:
```bash
./scripts/up.sh
```

To run the contract tests in a headless CI/CD pipeline and get the exact exit code of the contract tests:
```bash
docker compose up --exit-code-from contract-testing
```

To run the runner locally on the host:
```bash
node contract-testing/runner.js
```

To execute the self-test suite of the contract testing tool:
```bash
node contract-testing/test-contract-runner.js
```
