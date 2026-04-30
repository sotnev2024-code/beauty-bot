# Build context: project root. Stages:
#   1. frontend-build — re-uses frontend/Dockerfile.prod via a separate FROM
#   2. web — alpine nginx with the bundle + config baked in
FROM node:20-alpine AS frontend-build

ENV PNPM_HOME=/usr/local/share/pnpm \
    PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@10.33.2 --activate

WORKDIR /app
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm build


FROM nginx:1.27-alpine AS web

# Static Mini App bundle.
COPY --from=frontend-build /app/dist /usr/share/nginx/html

# Server config.
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Mount points (cert and portfolio). Compose binds the host paths here.
RUN mkdir -p /etc/letsencrypt /var/www/portfolio /var/www/certbot

EXPOSE 80 443
