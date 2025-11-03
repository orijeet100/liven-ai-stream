# Dockerfile for backend deployment (optional, for Fly.io or self-hosted)
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY server ./server
COPY voice-config.json ./

# Expose port
EXPOSE 5174

# Set environment
ENV NODE_ENV=production

# Start server
CMD ["npm", "run", "server:ts"]

