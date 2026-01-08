FROM node:20-alpine

WORKDIR /app

# Copy package files (bao gồm package-lock.json)
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install && npm cache clean --force

# Copy source code
COPY . .

# Generate Prisma Client và build
RUN npx prisma generate && npm run build

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 30001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:30001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/index.js"]

