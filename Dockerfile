# BizFlow Multi-Stage Dockerfile
# Optimized for production with minimal image size

# ============================================
# Stage 1: Base
# ============================================
FROM node:20-alpine AS base

WORKDIR /app

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache dumb-init

# ============================================
# Stage 2: Dependencies
# ============================================
FROM base AS deps

# Copy package files (both package.json and package-lock.json)
COPY package.json ./
COPY package-lock.json* ./

# Install all dependencies (including devDependencies for build)
# Use npm install if no lock file exists
RUN if [ -f package-lock.json ]; then npm ci --include=dev; else npm install; fi

# ============================================
# Stage 3: Builder
# ============================================
FROM base AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# ============================================
# Stage 4: Production Dependencies
# ============================================
FROM base AS prod-deps

WORKDIR /app

COPY package.json ./
COPY package-lock.json* ./

# Install production dependencies only
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi && npm cache clean --force

# ============================================
# Stage 5: Production Runner
# ============================================
FROM base AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 bizflow

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Copy production dependencies
COPY --from=prod-deps /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/server ./server
COPY --from=builder /app/client ./client

# Copy necessary config files
COPY package.json ./
COPY tsconfig.json ./
COPY drizzle.config.ts ./

# Change ownership to non-root user
RUN chown -R bizflow:nodejs /app

# Switch to non-root user
USER bizflow

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start application with dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
