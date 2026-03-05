# Deployment

The project uses **Docker containers** deployed to a **VPS** via **GitHub Actions**, with separate staging and production environments.

## Branch-to-Environment Mapping

| Branch   | Environment | Image Tag    | Compose File                    |
| -------- | ----------- | ------------ | ------------------------------- |
| `dev`    | Staging     | `staging`    | `docker-compose.staging.yml`    |
| `master` | Production  | `production` | `docker-compose.production.yml` |

## Port Mapping

| Service  | Staging       | Production    |
| -------- | ------------- | ------------- |
| Frontend | `3000` → `80` | `3001` → `80` |
| Backend  | `4000`        | `4001`        |

## Container Images

Images are stored in **GitHub Container Registry** (GHCR):

- `ghcr.io/gat-so/swarm-frontend:<tag>`
- `ghcr.io/gat-so/swarm-backend:<tag>`

## Docker Builds

Both services use **multi-stage Dockerfiles** with `node:22-alpine`:

- **Frontend** (`frontend/Dockerfile`): Builds with Vite, serves static files via Nginx with SPA fallback and gzip (`frontend/nginx.conf`)
- **Backend** (`backend/Dockerfile`): Builds TypeScript to `dist/`, runs with `node dist/index.js` and production-only dependencies

## CI/CD Pipelines

### CI (`.github/workflows/ci.yml`)

Runs on **pull requests** to `master` and `dev`. Executes these checks in parallel for both frontend and backend:

1. Lint (`npm run lint`)
2. Format (`npm run format:check`)
3. Type check (`npx tsc`)
4. Test (`npm test`)
5. Build (`npm run build`)

### Deploy (`.github/workflows/deploy.yml`)

Runs on **push** to `master` and `dev`:

1. Builds and pushes Docker images to GHCR
2. Copies the environment-specific compose file to the VPS via SCP
3. SSHs into the VPS, pulls the latest images, and restarts containers with `docker compose up -d --force-recreate`

## VPS Secrets

Deployment requires these GitHub Actions secrets:

- `VPS_HOST`, `VPS_USER`, `VPS_PORT`, `VPS_SSH_KEY`, `VPS_SSH_PASSPHRASE` — SSH access
- `GH_PAT` — GitHub Personal Access Token for GHCR login on the VPS

## Key Rules

- **Never change port mappings** without updating both the Dockerfile, compose file, and backend `PORT` environment variable
- **All CI checks must pass** before merging PRs — lint, format, typecheck, test, and build
- **Staging deploys from `dev`**, production deploys from `master` — do not mix these
- When adding new environment variables, add them to the relevant `docker-compose.*.yml` file(s)
