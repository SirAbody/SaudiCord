# Multi-stage Docker build for SaudiCord
# Made With Love By SirAbody

# Stage 1: Build the React client
FROM node:18-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Setup the Node.js server
FROM node:18-alpine
WORKDIR /app

# Install dependencies for PostgreSQL
RUN apk add --no-cache postgresql-client

# Copy server files
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install --production

# Copy server source code
COPY server/ ./

# Copy built client files
COPY --from=client-build /app/client/build /app/client/build

# Create uploads directory
RUN mkdir -p uploads/avatars uploads/attachments

# Expose port
EXPOSE 5000

# Start the server
CMD ["node", "index.js"]
