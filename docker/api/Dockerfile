# syntax=docker/dockerfile:1
# Build context: repository root (`docker compose build` / `docker build -f docker/api/Dockerfile .`)

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
WORKDIR /repo

FROM base AS build
RUN apk add --no-cache python3 make g++ openssl
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/validation/package.json packages/validation/package.json
COPY packages/tsconfig packages/tsconfig
COPY packages/eslint-config packages/eslint-config
COPY packages/scripts/package.json packages/scripts/package.json
RUN pnpm install --frozen-lockfile --filter @techwin/api...
COPY packages/contracts packages/contracts
COPY packages/validation packages/validation
COPY apps/api apps/api
RUN pnpm --filter @techwin/contracts build \
  && pnpm --filter @techwin/validation build \
  && pnpm --filter @techwin/api db:generate \
  && pnpm --filter @techwin/api build \
  && pnpm --filter @techwin/api deploy --prod /out

FROM node:22-alpine AS runner
RUN apk add --no-cache openssl libc6-compat \
  && addgroup -S techwin \
  && adduser -S techwin -G techwin
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=techwin:techwin /out/ ./
USER techwin
EXPOSE 4000
CMD ["node", "dist/main.js"]
