# Production Dockerfile for node build & run
FROM node:20-alpine

WORKDIR /app

# copy package manifests, install all deps (need dev deps for build)
COPY package*.json ./
RUN npm ci

# copy app
COPY . .

# build TypeScript to JS
RUN npm run build

# remove dev dependencies to reduce image size
RUN npm prune --production

# default run
CMD ["node", "dist/server/index.js"]

# Expose port is a documentation item; docker-compose maps it

