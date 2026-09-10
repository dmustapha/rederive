# File: Dockerfile
FROM python:3.11-slim
WORKDIR /app

# Litestream (SQLite -> object-store replication) for free-tier persistence of judge-created
# state. Optional at runtime: the entrypoint uses it only when LITESTREAM_BUCKET is set,
# otherwise it falls back to the baked warm seed (seed-only mode).
ARG LITESTREAM_VERSION=v0.3.13
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates \
 && curl -sL "https://github.com/benbjohnson/litestream/releases/download/${LITESTREAM_VERSION}/litestream-${LITESTREAM_VERSION}-linux-amd64.tar.gz" \
    | tar -xz -C /usr/local/bin litestream \
 && apt-get purge -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

COPY api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY api/ .
RUN chmod +x /app/entrypoint.sh

# Free-tier default db path: a WRITABLE in-container path re-hydrated from the baked warm seed
# on every cold boot. On a paid-disk deploy, override REDERIVE_DB=/data/memory.db via env.
ENV REDERIVE_DB=/var/rederive/memory.db
EXPOSE 8080
CMD ["/app/entrypoint.sh"]
