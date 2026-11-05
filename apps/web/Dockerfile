FROM node:24-alpine
# git: npm fetches @todone/sdk from GitHub.
RUN apk add --no-cache git
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Where the todone server is; /api is forwarded there, and that's fixed when the app is built.
ARG SERVER_URL=http://server:4000
ENV SERVER_URL=$SERVER_URL
RUN npm run build
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["npm", "start"]
