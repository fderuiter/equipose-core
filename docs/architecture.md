# System Architecture

This guide describes the underlying architecture of our microservices system, focusing on database separation, backend services, and API Gateway routing/security rules.

## 1. API Gateway Rules & Routing

The system uses Nginx as an API Gateway to expose specific microservices to clients while keeping internal communication secure. Below are the routing rules defined in `/app/gateway/nginx.conf`:

| Endpoint | Target Service | Authentication Required | Description |
|---|---|---|---|
| `/health` | Static Response | No | Basic health check returning `200 OK`. |
| `/logout` | `auth-service:3000/logout` | No | Centralized user logout endpoint. |
| `/app1/` | `app1:80` | No | Standard public/unauthenticated path. |
| `/app2/` | `app2:80` | No | Standard public/unauthenticated path. |
| `/app3/` | `app3:80` | **Yes (SSO)** | Protected service endpoint. Integrates with the authentication subrequest workflow. |

### Authentication Subrequest Flow
For `/app3/`, Nginx is configured with the `auth_request` module:
1. When a request hits `/app3/`, Nginx fires an internal subrequest to `/auth-validate`.
2. `/auth-validate` proxies the verification request to the centralized Node.js `auth-service` on `http://auth-service:3000/validate`.
3. If the auth service returns `200 OK`, Nginx extracts the validated user header (specifically `X-Remote-User`) and forwards the request to `app3` with the authenticated user context securely injected.
4. If the auth service returns a non-200 code (such as `401 Unauthorized`), the client receives an authorization error, and the request is blocked from reaching `app3`.

*Note: For all public endpoints (`/app1/` and `/app2/`), the API Gateway explicitly strips spoofed `X-Remote-User`, `Remote-User`, or `HTTP_X_REMOTE_USER` headers to prevent header injection attacks.*

---

## 2. Backend Applications

Our core backend applications (`app1`, `app2`, and `app3`) are built with a lightweight Python HTTP server (`SimpleHTTPRequestHandler`). 
- They parse incoming HTTP requests and output the received headers back to the caller for testing.
- They dynamically read their port from `APP_PORT` and service names from `APP_NAME`.

---

## 3. Database Separation

To adhere to microservice design principles and prevent cross-database coupling, each application is backed by its own completely isolated PostgreSQL database instance:

- **`app1`** → Connects to Postgres database **`db1`** via `postgresql://app1:app1@db1:5432/app1`
- **`app2`** → Connects to Postgres database **`db2`** via `postgresql://app2:app2@db2:5432/app2`
- **`app3`** → Connects to Postgres database **`db3`** via `postgresql://app3:app3@db3:5432/app3`

Each database runs on an alpine-based PostgreSQL container image (`postgres:16-alpine`) and includes dedicated Docker health checks (`pg_isready`) before their corresponding backend services are launched.
