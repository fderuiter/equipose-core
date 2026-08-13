# equipose-core

This repository is the local integration layer for the Equipose stack.

## Included glue configuration

- `/home/runner/work/equipose-core/equipose-core/docker-compose.yml` starts an API gateway, three applications, and three databases together.
- `/home/runner/work/equipose-core/equipose-core/gateway/nginx.conf` routes `/app1`, `/app2`, and `/app3` through a single gateway.
- `/home/runner/work/equipose-core/equipose-core/.env.example` centralizes the shared image, port, project, and database settings.
- `/home/runner/work/equipose-core/equipose-core/scripts/up.sh` boots the stack with the shared environment file.
- `/home/runner/work/equipose-core/equipose-core/scripts/down.sh` stops the shared stack cleanly.

## Quick start

1. Copy `/home/runner/work/equipose-core/equipose-core/.env.example` to `.env`.
2. Adjust the application images as needed for your three services.
3. Run `./scripts/up.sh`.
4. Reach the services through `http://localhost:8080/app1/`, `/app2/`, and `/app3/`.