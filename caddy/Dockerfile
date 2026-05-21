# Custom Caddy with rate limiting module
# Build: docker build -t caddy-ratelimit ./caddy
FROM caddy:2-builder AS builder

RUN xcaddy build \
    --with github.com/mholt/caddy-ratelimit

FROM caddy:2-alpine

COPY --from=builder /usr/bin/caddy /usr/bin/caddy
