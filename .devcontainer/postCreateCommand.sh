#!/bin/bash

echo "🚀 Setting up SLA Service Dev Container..."

# Make the script executable
chmod +x "$0"

# Install dependencies for all services
echo "📦 Installing dependencies..."
npm run install:all

# Run database migrations
echo "🗄️ Running database migrations..."
cd nestjs-api && npm run migration:run

echo "✅ Dev Container setup completed!"
echo ""
echo "🎯 Next steps:"
echo "1. Run 'npm run dev' to start all services"
echo "2. Open http://localhost:3001 for the web app"
echo "3. Open http://localhost:3000 for the API"
echo ""
echo "🔍 Available ports:"
echo "- NextJS Web: http://localhost:3001"
echo "- NestJS API: http://localhost:3000"
echo "- PostgreSQL: localhost:5432"
echo "- Debug ports: 9229 (NestJS), 9231 (NextJS)"
