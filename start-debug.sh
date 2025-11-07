#!/bin/bash

echo "🔍 Starting Debug Mode"
echo "======================"

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose down

# Start debug mode
echo "🚀 Starting containers in debug mode..."
docker compose -f docker-compose.debug.yml up -d postgres nestjs-api

# Wait a bit for services to start
echo "⏳ Waiting for services to start..."
sleep 5

# Start NextJS with debug
echo "🐛 Starting NextJS with debug enabled..."
docker compose -f docker-compose.debug.yml up nextjs-web

echo ""
echo "✅ Debug mode started!"
echo ""
echo "📋 Next steps:"
echo "1. Open VS Code"
echo "2. Go to Run and Debug (Ctrl+Shift+D)"
echo "3. Select 'Debug Next.js API Routes (Docker)'"
echo "4. Click the play button to attach debugger"
echo "5. Set breakpoints in your code"
echo "6. Test the API to trigger breakpoints"
echo ""
echo "🌐 URLs:"
echo "- NextJS App: http://localhost:3001"
echo "- API Proxy: http://localhost:3001/api/proxy-odoo"
echo "- Debug Port: localhost:9229"
echo ""
echo "🔍 To view logs:"
echo "docker compose -f docker-compose.debug.yml logs -f nextjs-web"
