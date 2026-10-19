# syntax=docker/dockerfile:1
# Image for one mock external system. Build from the repository root:
#   docker build -f infra/docker/mock-service.Dockerfile --build-arg SERVICE=mock-sg-hr --build-arg PORT=4101 .

ARG NODE_IMAGE=node:24.22.0-alpine3.24

FROM ${NODE_IMAGE} AS build
ARG SERVICE
ENV HUSKY=0 \
    PUPPETEER_SKIP_DOWNLOAD=true
RUN test -n "${SERVICE}" || (echo "SERVICE build arg is required" && exit 1)
RUN npm install --global pnpm@12.14.0
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm fetch --store-dir /pnpm-store
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm install --frozen-lockfile --offline --store-dir /pnpm-store --filter "@huitong/${SERVICE}..."
RUN pnpm --filter "@huitong/${SERVICE}..." build
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm --filter "@huitong/${SERVICE}" deploy --prod --store-dir /pnpm-store /out

FROM ${NODE_IMAGE} AS runtime
ARG PORT
ENV NODE_ENV=production \
    PORT=${PORT}
WORKDIR /app
COPY --from=build /out ./
USER node
EXPOSE ${PORT}
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" > /dev/null || exit 1
CMD ["node", "dist/main.js"]
