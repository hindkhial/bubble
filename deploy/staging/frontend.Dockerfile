FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS build
RUN npm install --global pnpm@10.18.3
WORKDIR /build
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG EXPO_PUBLIC_API_URL
RUN node scripts/validate-staging-url.mjs "$EXPO_PUBLIC_API_URL"
RUN EXPO_PUBLIC_API_URL="$EXPO_PUBLIC_API_URL" EXPO_NO_TELEMETRY=1 CI=1 pnpm build:web

FROM nginx:stable-alpine@sha256:970364228b1e4f932abc22d321932816782cca8a20b85a77552a7cfe9acfb3b5
COPY deploy/staging/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /build/dist /usr/share/nginx/html
USER 101:101
EXPOSE 8443
HEALTHCHECK --interval=15s --timeout=4s --start-period=10s --retries=4 CMD wget -q -O /dev/null http://127.0.0.1:8081/healthz || exit 1
ENTRYPOINT ["nginx", "-g", "daemon off;"]
