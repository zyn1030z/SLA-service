#!/bin/bash

# Development deployment script
echo "🚀 Starting SLA Service Development Environment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Created .env file from template. Please review and update if needed."
fi

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker compose -f docker-compose.dev.yml down

# Build and start services
echo "🔨 Building and starting development containers..."
docker compose -f docker-compose.dev.yml up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service status
echo "📊 Checking service status..."
docker compose -f docker-compose.dev.yml ps

echo ""
echo "✅ Development environment is ready!"
echo ""
echo "🌐 Services:"
echo "   - Frontend (Next.js): http://localhost:${WEB_PORT:-3001}"
echo "   - Backend (NestJS):  http://localhost:${API_PORT:-3000}"
echo "   - Database (Postgres): localhost:${POSTGRES_PORT:-5432}"
echo ""
echo "🔧 Debug ports:"
echo "   - NestJS Debug: localhost:9229"
echo "   - Next.js Debug: localhost:9231"
echo ""
echo "📋 Useful commands:"
echo "   - View logs: docker compose -f docker-compose.dev.yml logs -f"
echo "   - Stop services: docker compose -f docker-compose.dev.yml down"
echo "   - Restart service: docker compose -f docker-compose.dev.yml restart [service-name]"
echo ""
