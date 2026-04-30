#!/usr/bin/env bash
# Bootstrap Let's Encrypt certificate for crm.plus-shop.ru.
#
# Run on the production host AFTER docker-compose.prod.yml is up but BEFORE
# the HTTPS server block has a real cert. Two paths:
#
#   1. First-time issue. nginx serves the ACME challenge from
#      /var/www/certbot via the HTTP server block; certbot writes the cert
#      to /etc/letsencrypt on the host.
#
#   2. Renewal. cron runs this script weekly.
#
# Required env (export or .env):
#   DOMAIN              — defaults to crm.plus-shop.ru
#   LETSENCRYPT_EMAIL   — required for first issue
set -euo pipefail

DOMAIN="${DOMAIN:-crm.plus-shop.ru}"
EMAIL="${LETSENCRYPT_EMAIL:-}"

if [ ! -d "/etc/letsencrypt/live/${DOMAIN}" ]; then
    if [ -z "${EMAIL}" ]; then
        echo "LETSENCRYPT_EMAIL is required for the first issue" >&2
        exit 1
    fi
    echo "Issuing initial certificate for ${DOMAIN}..."
    docker run --rm \
        -v /etc/letsencrypt:/etc/letsencrypt \
        -v "$(docker volume inspect -f '{{ .Mountpoint }}' "$(basename "$PWD")_certbot-webroot")":/var/www/certbot \
        certbot/certbot:latest \
        certonly --webroot -w /var/www/certbot \
        --email "${EMAIL}" --agree-tos --no-eff-email \
        --non-interactive \
        -d "${DOMAIN}"
else
    echo "Renewing certificate for ${DOMAIN}..."
    docker run --rm \
        -v /etc/letsencrypt:/etc/letsencrypt \
        -v "$(docker volume inspect -f '{{ .Mountpoint }}' "$(basename "$PWD")_certbot-webroot")":/var/www/certbot \
        certbot/certbot:latest \
        renew --webroot -w /var/www/certbot --quiet
fi

echo "Reloading nginx..."
docker compose -f docker-compose.prod.yml exec -T web nginx -s reload
echo "Done."
