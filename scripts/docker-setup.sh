#!/bin/bash

# Docker setup script for production
# Usage: ./scripts/docker-setup.sh

set -e

echo "=========================================="
echo "Docker Production Setup"
echo "=========================================="
echo ""

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo "⚠️  .env.production not found!"
    echo "Creating from template..."
    
    if [ -f .env.production.example ]; then
        cp .env.production.example .env.production
        echo "✅ Created .env.production from template"
        echo "⚠️  Please edit .env.production with your actual values!"
        echo ""
    else
        echo "❌ .env.production.example not found!"
        exit 1
    fi
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Build images
echo "Building Docker images..."
docker-compose -f docker-compose.prod.yml build

echo ""
echo "✅ Build complete!"
echo ""

# Start services
echo "Starting services..."
docker-compose -f docker-compose.prod.yml up -d

echo ""
echo "✅ Services started!"
echo ""

# Wait for services to be healthy
echo "Waiting for services to be healthy..."
sleep 10

# Check service status
echo ""
echo "Service Status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "=========================================="
echo "Running Database Migrations"
echo "=========================================="
echo ""

# Run migrations
docker-compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy || {
    echo "⚠️  Migration failed. Trying to generate Prisma Client first..."
    docker-compose -f docker-compose.prod.yml exec -T backend npx prisma generate
    docker-compose -f docker-compose.prod.yml exec -T backend npx prisma migrate deploy
}

echo ""
echo "✅ Migrations complete!"
echo ""

# Health check
echo "=========================================="
echo "Health Check"
echo "=========================================="
echo ""

sleep 5
HEALTH_CHECK=$(curl -s http://localhost:3000/health || echo "FAILED")

if [ "$HEALTH_CHECK" != "FAILED" ]; then
    echo "✅ Backend is healthy!"
    echo "Response: $HEALTH_CHECK"
else
    echo "⚠️  Health check failed. Check logs:"
    echo "docker-compose -f docker-compose.prod.yml logs backend"
fi

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "View logs:"
echo "  docker-compose -f docker-compose.prod.yml logs -f"
echo ""
echo "Stop services:"
echo "  docker-compose -f docker-compose.prod.yml down"
echo ""
echo "Restart services:"
echo "  docker-compose -f docker-compose.prod.yml restart"
echo ""

