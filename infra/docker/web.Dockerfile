# syntax=docker/dockerfile:1
# HuiTong web image: the Vite build served by unprivileged nginx. Build from the repository root:
#   docker build -f infra/docker/web.Dockerfile .

# Base images are pinned by tag and digest; Dependabot proposes updates.
FROM node:24.22.0-alpine3.24@sha256:44fce696f38ba8c987c4db89954051000bbd05ffd8d8659ba15ed4a8602e937f AS build
ENV HUSKY=0 \
    PUPPETEER_SKIP_DOWNLOAD=true
RUN npm install --global pnpm@12.14.0
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm fetch --store-dir /pnpm-store
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm install --frozen-lockfile --offline --store-dir /pnpm-store --filter "@huitong/web..."
RUN pnpm --filter "@huitong/web..." build

FROM nginxinc/nginx-unprivileged:1.31.6-alpine3.24@sha256:884e0b7f42f303641b0f4e78755aea647521dca0b89ca3be7992ad78b5c07434 AS runtime
# The api upstream is substituted into the server block when the container starts.
ENV API_UPSTREAM=http://api:3000
COPY infra/docker/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY infra/docker/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
# The base image already runs as nginx (uid 101); naming it here keeps that true if the base changes.
USER 101
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/healthz > /dev/null || exit 1
