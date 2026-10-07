# syntax=docker/dockerfile:1
#
# 로컬 docker compose 기본 이미지: 한국어(또는 현재 web 소스) UI를 embedui 로 빌드합니다.
#   docker compose up -d --build
#
# CI에서 사전 빌드 바이너리만 넣을 때는 Dockerfile.prebuilt 를 사용합니다.

# ── 1) Next.js 정적 export ─────────────────────────────────────────────
FROM node:22-bookworm AS web
WORKDIR /src/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
ENV NEXT_EXPORT=1
RUN npm run build:static

# ── 2) Go embedui 바이너리 ───────────────────────────────────────────────
FROM golang:1.23-bookworm AS gobuilder
WORKDIR /src
ENV GOTOOLCHAIN=auto CGO_ENABLED=0
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=web /src/web/out ./server/webui/dist
ARG TARGETARCH
RUN GOARCH="${TARGETARCH}" go build -tags embedui -trimpath -ldflags="-s -w" -o /out/artex ./cmd/artex

# ── 3) 런타임 (도구 + Playwright + artex) ────────────────────────────────
FROM python:3.12-slim-bookworm
ARG PLAYWRIGHT_WITH_DEPS=1
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates ripgrep curl wget vim git jq unzip \
      dnsutils iputils-ping netcat-openbsd inetutils-telnet whois nmap \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*
RUN npm install -g @playwright/mcp@latest @playwright/cli@latest playwright@latest \
    && playwright-cli --help
# Chromium 다운로드는 네트워크에 민감합니다. 실패 시 .env 에 PLAYWRIGHT_WITH_DEPS=0 후 재빌드.
RUN if [ "$PLAYWRIGHT_WITH_DEPS" = "1" ]; then \
      for n in 1 2 3; do playwright install --with-deps chromium && break; sleep 15; done; \
    fi \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=gobuilder /out/artex /app/artex
COPY start.sh /app/start.sh
RUN chmod +x /app/artex /app/start.sh
COPY skills/ /app/skills/
VOLUME ["/app/data"]
EXPOSE 8787 8788
ENTRYPOINT ["/app/start.sh"]
CMD ["-addr", ":8787", "-proxy", ":8788"]
