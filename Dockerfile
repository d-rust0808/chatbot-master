FROM node:20-alpine

WORKDIR /app

# Install OpenSSL 1.1 compatibility libraries for Prisma
# WHY: Prisma query engine (libquery_engine-linux-musl.so.node) requires libssl.so.1.1
# Alpine Linux uses OpenSSL 3.x by default, but Prisma needs OpenSSL 1.1 compatibility
# Solution: Try multiple approaches to ensure compatibility
RUN apk add --no-cache openssl1.1-compat 2>/dev/null || \
    (apk add --no-cache openssl && \
     if [ -f /usr/lib/libssl.so.3 ]; then \
       ln -sf /usr/lib/libssl.so.3 /usr/lib/libssl.so.1.1; \
       ln -sf /usr/lib/libcrypto.so.3 /usr/lib/libcrypto.so.1.1; \
     elif [ -f /lib/libssl.so.3 ]; then \
       ln -sf /lib/libssl.so.3 /lib/libssl.so.1.1; \
       ln -sf /lib/libcrypto.so.3 /lib/libcrypto.so.1.1; \
     fi)

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

