# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy prisma schema and generate client
COPY backend/prisma ./prisma
RUN npx prisma generate

# Copy source code
COPY backend/ ./

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy prisma schema and generate client
COPY backend/prisma ./prisma
RUN npx prisma generate

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 10000

# Start the application
CMD ["node", "dist/main.js"]
