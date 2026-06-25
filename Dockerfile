# syntax=docker/dockerfile:1

FROM oven/bun:1.1 AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY api/package.json api/bun.lock ./api/
RUN bun install --frozen-lockfile \
  && cd api \
  && bun install --frozen-lockfile

FROM deps AS build
WORKDIR /app
COPY . .
ENV NODE_ENV=production
RUN bun run build

FROM oven/bun:1.1-slim AS release
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/api/node_modules ./api/node_modules
COPY --from=build /app/dist ./dist
COPY api ./api
COPY shared ./shared
COPY package.json ./package.json
COPY api/package.json ./api/package.json

EXPOSE 8080
CMD ["bun", "run", "--cwd", "api", "start"]
