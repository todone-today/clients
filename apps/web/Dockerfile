# Built from the repo root: the app depends on sdk/ (file:../../../sdk), so it keeps that layout.
FROM node:24-alpine
WORKDIR /repo/clients/apps/web
COPY sdk /repo/sdk
COPY clients/apps/web/package.json clients/apps/web/package-lock.json ./
RUN npm ci
COPY clients/apps/web .
# Where the todone server is; /api is forwarded there, and that's fixed when the app is built.
ARG SERVER_URL=http://server:4000
ENV SERVER_URL=$SERVER_URL
RUN npm run build
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["npm", "start"]
