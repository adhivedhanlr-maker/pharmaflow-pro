# Use Node.js LTS
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy prisma schema
COPY backend/prisma ./prisma

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY backend/ ./

# Build the application
RUN npm run build

# Expose port
EXPOSE 10000

# Start the application
CMD ["node", "dist/main.js"]
