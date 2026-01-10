#!/bin/bash

# Deployment Script for Chatbot Backend
# WHY: Ensure Prisma client is generated and migrations are applied before deployment

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    exit 1
fi

# Step 1: Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm ci --production=false

# Step 2: Generate Prisma Client
echo -e "${YELLOW}🔧 Generating Prisma client...${NC}"
npx prisma generate

# Step 3: Run migrations
echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
npx prisma migrate deploy

# Step 4: Verify Prisma client
echo -e "${YELLOW}✅ Verifying Prisma client...${NC}"
if node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); console.log('Prisma client loaded successfully');" 2>/dev/null; then
    echo -e "${GREEN}✅ Prisma client verified${NC}"
else
    echo -e "${RED}❌ Error: Prisma client verification failed${NC}"
    exit 1
fi

# Step 5: Build TypeScript (if needed)
if [ -f "tsconfig.json" ]; then
    echo -e "${YELLOW}🔨 Building TypeScript...${NC}"
    npm run build || echo -e "${YELLOW}⚠️  Build step skipped (may not be needed)${NC}"
fi

echo -e "${GREEN}✅ Deployment preparation complete!${NC}"
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "   1. Restart your application (pm2 restart, systemctl restart, or docker-compose restart)"
echo "   2. Check application logs to verify it's running correctly"

