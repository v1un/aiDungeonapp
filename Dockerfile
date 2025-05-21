# ==============================
# Build stage
# ==============================
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Build TypeScript launcher
RUN cd tools && npx tsc --outDir ../dist/tools

# ==============================
# Production stage
# ==============================
FROM node:18-alpine AS runner

WORKDIR /app

# Create necessary directories
RUN mkdir -p logs .genkit/servers dist/tools

# Set environment variables
ENV NODE_ENV=production
ENV PORT=9003

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY next.config.ts ./
COPY start-app.sh ./
COPY --chmod=+x start-app.sh ./

# Make start scripts executable
RUN chmod +x start-app.sh

# Add non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app

USER nextjs:nodejs

# Set up volumes for persistent data
VOLUME ["/app/logs", "/app/.genkit/servers"]

# Expose the application port
EXPOSE 9003

# Start the application
CMD ["./start-app.sh"]
