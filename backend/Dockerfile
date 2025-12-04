# Multi-stage build for WhereIsIt Inventory App Backend
# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY . .

# Build the application (if needed)
RUN npm run build || true

# Stage 2: Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/tsconfig.json ./
COPY --from=builder --chown=nodejs:nodejs /app/*.ts ./
COPY --from=builder --chown=nodejs:nodejs /app/auth ./auth
COPY --from=builder --chown=nodejs:nodejs /app/container ./container
COPY --from=builder --chown=nodejs:nodejs /app/db ./db
COPY --from=builder --chown=nodejs:nodejs /app/folder ./folder
COPY --from=builder --chown=nodejs:nodejs /app/household ./household
COPY --from=builder --chown=nodejs:nodejs /app/image ./image
COPY --from=builder --chown=nodejs:nodejs /app/item ./item
COPY --from=builder --chown=nodejs:nodejs /app/location ./location
COPY --from=builder --chown=nodejs:nodejs /app/shopping ./shopping
COPY --from=builder --chown=nodejs:nodejs /app/storage ./storage
COPY --from=builder --chown=nodejs:nodejs /app/encore.app ./encore.app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD curl -f http://localhost:4000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "--loader", "ts-node/esm", "index.ts"]
