#!/bin/bash

# Generate secure secrets for production
# Usage: ./scripts/generate-secrets.sh

echo "=========================================="
echo "Generating Secure Secrets for Production"
echo "=========================================="
echo ""

# Generate JWT Secret
JWT_SECRET=$(openssl rand -base64 32 | tr -d '\n')
echo "JWT_SECRET=$JWT_SECRET"

# Generate JWT Refresh Secret
JWT_REFRESH_SECRET=$(openssl rand -base64 32 | tr -d '\n')
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"

# Generate Redis Password
REDIS_PASSWORD=$(openssl rand -base64 24 | tr -d '\n')
echo "REDIS_PASSWORD=$REDIS_PASSWORD"

# Generate DB Password
DB_PASSWORD=$(openssl rand -base64 24 | tr -d '\n')
echo "DB_PASSWORD=$DB_PASSWORD"

# Generate Webhook Secret
WEBHOOK_SECRET=$(openssl rand -base64 24 | tr -d '\n')
echo "SEPAY_WEBHOOK_SECRET=$WEBHOOK_SECRET"

echo ""
echo "=========================================="
echo "Copy these values to your .env.production"
echo "=========================================="

