# app.todone.today on Fly.io: build the app's static files (TARGET=app), then serve them with Caddy beside the API.
# Built from apps/web: fly deploy --config fly/fly.toml --dockerfile fly/Dockerfile .
FROM node:24-alpine AS build
RUN apk add --no-cache git
WORKDIR /web
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_SENTRY_DSN=""
ARG NEXT_PUBLIC_POSTHOG_KEY=""
ARG GIT_SHA=""
ENV TARGET=app NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY GIT_SHA=$GIT_SHA
RUN npx next build && rm -rf out-app/landing out-app/onboarding.mp4 out-app/onboarding.jpg

FROM caddy:2-alpine
COPY fly/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /web/out-app /srv
EXPOSE 8080
