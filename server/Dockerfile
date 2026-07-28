FROM node:21-alpine AS base
WORKDIR /app
RUN npm install -g concurrently

# Install dependencies for server
FROM base AS server-deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --only=production

# Build server
FROM server-deps AS server-build
COPY server/src ./src
RUN npm run build

# Final server image
FROM node:21-alpine AS server
WORKDIR /app/server
COPY --from=server-build /app/server/dist ./dist
COPY server/package*.json ./
RUN npm ci --only=production --ignore-scripts
# NOTE: env vars are supplied by the container runtime (docker-compose `environment:`
# block, or the hosting platform's dashboard) — never bake a .env file into the image.
EXPOSE 3001
CMD ["node", "dist/index.js"]