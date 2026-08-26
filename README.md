# equipose-core

This repository is the local integration layer for the Equipose stack.

## Included glue configuration

- `./docker-compose.yml` starts an API gateway, three applications, and three databases together.
- `./gateway/nginx.conf.template` routes `/app1`, `/app2`, and `/app3` through a single gateway, substituting target ports dynamically at runtime.
- `./.env.example` centralizes the shared image, port, project, and database settings.
- `./scripts/up.sh` boots the stack with the shared environment file.
- `./scripts/down.sh` stops the shared stack cleanly.
- `./scripts/reset-env.sh` purges active containers, clears database volumes, and cleanly restarts the entire stack.

## Quick start

1. Copy `./.env.example` to `.env`.
2. Adjust the application images as needed for your three services.
3. Run `./scripts/up.sh`.
4. Reach the services through `http://localhost:8080/app1/`, `/app2/`, and `/app3/`.

To wipe the active container state and database volumes, run:
```sh
./scripts/reset-env.sh
```