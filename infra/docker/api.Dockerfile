# syntax=docker/dockerfile:1
# HuiTong API image. Build from the repository root:
#   docker build -f infra/docker/api.Dockerfile .

ARG NODE_IMAGE=node:24.22.0-alpine3.24

FROM ${NODE_IMAGE} AS build
ENV HUSKY=0 \
    PUPPETEER_SKIP_DOWNLOAD=true
RUN npm install --global pnpm@12.14.0
WORKDIR /repo
# Fetch from the lockfile alone so this layer survives source changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm fetch --store-dir /pnpm-store
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm install --frozen-lockfile --offline --store-dir /pnpm-store --filter "@huitong/api..."
RUN pnpm --filter "@huitong/api..." build
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm --filter @huitong/api deploy --prod --store-dir /pnpm-store /out

FROM ${NODE_IMAGE} AS runtime
# The Prisma CLI runs migrations on start; stop its update check calling out from the container.
ENV NODE_ENV=production \
    CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1
WORKDIR /app
# Files stay root-owned: the app user can read but not modify its own code.
COPY --from=build /out ./
COPY infra/docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
RUN chmod 0755 /usr/local/bin/api-entrypoint.sh
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/health/live > /dev/null || exit 1
CMD ["api-entrypoint.sh"]
