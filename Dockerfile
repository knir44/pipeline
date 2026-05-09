# Use official Node.js runtime as the base image
# Using Alpine Linux for smaller image size and better security
FROM node:18-alpine

# Set working directory inside the container
WORKDIR /app

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && \
    chown -R nodejs:nodejs /app

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install dependencies including PostgreSQL client
# Using npm install for development setup
RUN npm install --omit=dev && \
    npm cache clean --force

# Copy application source code
COPY --chown=nodejs:nodejs . .

# Create a volume for logs persistence
VOLUME ["/app/logs"]

# Switch to non-root user
USER nodejs

# Expose the port the app runs on
EXPOSE 3000

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "const http = require('http'); \
    const options = { host: 'localhost', port: 3000, path: '/health', timeout: 2000 }; \
    const req = http.request(options, (res) => { \
        if (res.statusCode === 200) { process.exit(0); } \
        else { process.exit(1); } \
    }); \
    req.on('error', () => process.exit(1)); \
    req.end();"

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV LOG_LEVEL=info
ENV DB_HOST=postgres
ENV DB_PORT=5432
ENV DB_NAME=taskmanagement
ENV DB_USER=taskuser
ENV DB_PASSWORD=taskpass123

# Define the command to run the application
CMD ["npm", "start"]

# Metadata labels
LABEL maintainer="developer@example.com"
LABEL version="1.0.0"
LABEL description="Task Management API - Minimal Node.js REST API with Express"
LABEL org.opencontainers.image.title="Task Management API"
LABEL org.opencontainers.image.description="A minimal REST API for task management built with Node.js and Express"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.created="2026-05-09"
LABEL org.opencontainers.image.source="https://github.com/username/task-management-api"