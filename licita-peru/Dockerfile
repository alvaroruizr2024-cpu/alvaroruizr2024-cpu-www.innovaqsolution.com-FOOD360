# Imagen de producción de LICITA PERÚ IA (Next.js en modo autocontenido).
# Sirve para Cloud Run, Railway, Render, Fly.io, ECS o cualquier VM con Docker.
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    STORAGE_DIR=/data/storage
RUN useradd --system --uid 1001 app && mkdir -p /data/storage && chown -R app /data
COPY --from=build --chown=app /app/.next/standalone ./
COPY --from=build --chown=app /app/.next/static ./.next/static
COPY --from=build --chown=app /app/public ./public
USER app
EXPOSE 3000
# Con almacenamiento local, monte un volumen persistente aquí. Con S3 no hace falta.
VOLUME /data
CMD ["node", "server.js"]
