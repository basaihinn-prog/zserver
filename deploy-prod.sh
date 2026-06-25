#!/usr/bin/env bash
set -Eeuo pipefail

APP_NAME="${FLY_APP_NAME:-cashflowcasino}"
IMAGE_NAME="${DOCKER_IMAGE_NAME:-cashflowcasino:latest}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-0}"
SKIP_DEPLOY="${SKIP_DEPLOY:-0}"

info() { printf '\033[0;32m[INFO]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[WARN]\033[0m %s\n' "$*"; }
fail() { printf '\033[0;31m[ERROR]\033[0m %s\n' "$*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"; }

info "Starting production deployment pipeline for ${APP_NAME}"
need bun

if [[ ! -f package.json || ! -f api/package.json ]]; then
  fail "Run this script from the repository root."
fi

info "Installing locked dependencies"
bun install --frozen-lockfile
( cd api && bun install --frozen-lockfile )

info "Running static checks"
bun run type-check

if [[ "${RUN_MIGRATIONS}" == "1" ]]; then
  info "Running database migrations"
  bun run migrate
else
  warn "Skipping migrations. Set RUN_MIGRATIONS=1 to run them before deploy."
fi

info "Building frontend assets"
bun run build

if command -v docker >/dev/null 2>&1; then
  info "Building Docker image ${IMAGE_NAME}"
  docker build -t "${IMAGE_NAME}" .
else
  warn "Docker is not installed; skipping local image build."
fi

if [[ "${SKIP_DEPLOY}" == "1" ]]; then
  warn "SKIP_DEPLOY=1 set; deployment skipped after verification."
  exit 0
fi

need fly
info "Deploying to Fly.io app ${APP_NAME}"
fly deploy --app "${APP_NAME}" --remote-only

info "Checking deployed API index"
if command -v curl >/dev/null 2>&1; then
  curl --fail --silent --show-error "https://${APP_NAME}.fly.dev/api/" >/dev/null
else
  warn "curl is not installed; skipping deployed health check."
fi

info "Deployment completed successfully."
