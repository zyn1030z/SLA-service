# Development Deployment Guide

## 🚀 Quick Start

### 1. Using the Development Script (Recommended)

```bash
# Run the development environment
./start-dev.sh
```

This script will:
- Check for `.env` file and create from template if needed
- Stop existing containers
- Build and start all services
- Show service URLs and useful commands

### 2. Manual Docker Compose

```bash
# Start development environment
docker compose -f docker-compose.dev.yml up --build -d

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Stop services
docker compose -f docker-compose.dev.yml down
```

## 📁 File Structure

```
sla-service/
├── docker-compose.dev.yml     # Development Docker configuration
├── docker-compose.yml         # Original/Production configuration
├── start-dev.sh              # Development startup script
├── env-dev.example           # Development environment template
├── .env                      # Your local environment variables
└── ...
```

## 🔧 Configuration

### Environment Variables

Copy the development template:
```bash
cp env-dev.example .env
```

Key development settings:
- `NODE_ENV=development`
- `DOCKER_RUNTIME=dev`
- `NEXT_PUBLIC_API_URL=http://localhost:3000`
- `API_PORT=3000`
- `WEB_PORT=3001`

### Database

- **Database Name**: `sla_dev`
- **Port**: `5433` (different from production to avoid conflicts)
- **Data Volume**: `sla_pg_dev_data`

## 🌐 Service URLs

Development environment provides:
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3000
- **Database**: localhost:5433

## 🐛 Debug Support

Both services have debug ports exposed:
- **NestJS Debug**: localhost:9229
- **Next.js Debug**: localhost:9231

### VS Code Debug Configuration

Add to `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug NestJS",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "remoteRoot": "/app"
    },
    {
      "name": "Debug Next.js",
      "type": "node",
      "request": "attach",
      "port": 9231,
      "remoteRoot": "/app"
    }
  ]
}
```

## 🔄 Hot Reload

Both services support hot reload in development:
- **NestJS**: Auto-restart on file changes
- **Next.js**: Fast refresh on file changes

## 📊 Monitoring

### Check Service Status
```bash
docker compose -f docker-compose.dev.yml ps
```

### View Logs
```bash
# All services
docker compose -f docker-compose.dev.yml logs -f

# Specific service
docker compose -f docker-compose.dev.yml logs -f nestjs-api
docker compose -f docker-compose.dev.yml logs -f nextjs-web
```

### Database Access
```bash
# Connect to database
docker exec -it sla_postgres_dev psql -U postgres -d sla_dev
```

## 🚨 Troubleshooting

### Port Conflicts
If ports are already in use:
1. Stop other services using those ports
2. Or modify `.env` file to use different ports

### Permission Issues
```bash
# Make script executable
chmod +x start-dev.sh
```

### Clean Restart
```bash
# Complete cleanup
docker compose -f docker-compose.dev.yml down -v
docker system prune -f
./start-dev.sh
```

## 🔗 Integration with Production

The development environment is isolated from production:
- Separate database (`sla_dev` vs `sla`)
- Separate Docker volumes
- Different network configuration
- Development-specific environment variables

To switch between environments:
```bash
# Development
docker compose -f docker-compose.dev.yml up -d

# Production (when ready)
docker compose -f docker-compose.yml up -d
```

## 📝 Notes

- Development environment uses local volumes for live code editing
- Database data persists in Docker volume `sla_pg_dev_data`
- All logs are configured for development verbosity
- JWT secrets are set to development values (change for production!)
