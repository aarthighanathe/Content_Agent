FROM node:21-alpine AS base
WORKDIR /app

# Install dependencies for client
FROM base AS client-deps
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --only=production

# Build client
FROM client-deps AS client-build
COPY client/src ./src
RUN npm run build

# Final client image
FROM node:21-alpine AS client
WORKDIR /app/client
COPY --from=client-build /app/client/dist ./dist
COPY client/package*.json ./
RUN npm ci --only=production --ignore-scripts
EXPOSE 5173
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "5173"]