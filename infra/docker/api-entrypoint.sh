#!/bin/sh
# Applies pending migrations and the idempotent seed, then hands PID 1 to the
# API so it receives shutdown signals directly.
set -eu
node node_modules/prisma/build/index.js migrate deploy
node node_modules/prisma/build/index.js db seed
exec node dist/main.js
