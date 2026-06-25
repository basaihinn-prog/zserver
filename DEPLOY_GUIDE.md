# Production Deployment Guide

This project deploys as a single Bun container that serves the Hono API and the built Vite frontend assets.

## Required secrets and environment

Configure production secrets in Fly.io (or your target runtime) rather than committing them to the repository:

```bash
fly secrets set DATABASE_URL=... JWT_SECRET=... GEMINI_API_KEY=...
```

Common runtime variables:

- `PORT`: Container port. The Dockerfile and `fly.toml` default to `8080`.
- `NODE_ENV=production`.
- `VITE_API_BASE_URL`: Public API URL used at frontend build time.
- `VITE_WS_URL`: Public websocket URL used at frontend build time.

## One-command deployment

```bash
./deploy-prod.sh
```

The script performs the full deployment pipeline:

1. Installs root and API dependencies with frozen Bun lockfiles.
2. Runs the frontend type check.
3. Optionally runs database migrations when `RUN_MIGRATIONS=1` is set.
4. Builds the Vite frontend into `dist/`.
5. Builds the Docker image when Docker is available.
6. Deploys the current branch to Fly.io with `fly deploy --remote-only`.
7. Checks the deployed API index.

## Useful modes

Validate everything except the final Fly.io deployment:

```bash
SKIP_DEPLOY=1 ./deploy-prod.sh
```

Run migrations before deployment:

```bash
RUN_MIGRATIONS=1 ./deploy-prod.sh
```

Deploy to a non-default Fly.io app:

```bash
FLY_APP_NAME=my-fly-app ./deploy-prod.sh
```

Use a custom local Docker image tag:

```bash
DOCKER_IMAGE_NAME=cashflowcasino:release ./deploy-prod.sh
```

## Manual Docker verification

```bash
docker build -t cashflowcasino:latest .
docker run --rm -p 8080:8080 --env-file .env cashflowcasino:latest
curl --fail http://localhost:8080/api/
```

## Rollback

Use Fly.io release history to identify and roll back to the last healthy release:

```bash
fly releases --app cashflowcasino
fly deploy --app cashflowcasino --image <previous-image>
```
