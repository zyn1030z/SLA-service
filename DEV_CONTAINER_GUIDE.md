# Dev Container Guide

## Tổng quan

Dev Container cung cấp môi trường phát triển containerized với tất cả dependencies và tools cần thiết cho dự án SLA Service.

## Cách sử dụng

### 1. Yêu cầu hệ thống
- VS Code với extension "Dev Containers"
- Docker Desktop (phiên bản mới nhất)
- Ít nhất 4GB RAM khả dụng

### 2. Khởi động Dev Container

1. **Mở VS Code trong thư mục dự án**
2. **Mở Command Palette** (Ctrl+Shift+P / Cmd+Shift+P)
3. **Chọn "Dev Containers: Reopen in Container"**
4. **Chọn "SLA Service Development Environment"**

VS Code sẽ:
- Build Dev Container (lần đầu có thể mất vài phút)
- Mount workspace vào container
- Cài đặt dependencies tự động
- Chạy database migrations

### 3. Chạy ứng dụng

Sau khi Dev Container sẵn sàng:

```bash
# Chạy tất cả services
npm run dev

# Hoặc chạy từng service riêng lẻ
cd nestjs-api && npm run start:debug
cd nextjs-web && npm run dev
```

### 4. Truy cập ứng dụng

- **NextJS Web App**: http://localhost:3001
- **NestJS API**: http://localhost:3000
- **PostgreSQL**: localhost:5432 (user: postgres, password: postgres, db: sla)

## Debugging

### VS Code Debugger
1. Mở Run & Debug panel (Ctrl+Shift+D)
2. Chọn configuration phù hợp:
   - "Debug NestJS API"
   - "Debug NextJS App"
3. Set breakpoints trong code
4. Start debugging

### Debug Ports
- NestJS: localhost:9229
- NextJS: localhost:9231

## Scripts hữu ích

```bash
# Setup ban đầu
npm run devcontainer:setup

# Development
npm run dev              # Chạy tất cả services
npm run dev:stop         # Dừng tất cả services
npm run dev:logs         # Xem logs
npm run dev:build        # Build lại images

# Database
npm run migration:run    # Chạy migrations
npm run migration:revert # Revert migration cuối

# Development debug
npm run debug            # Chạy debug mode

# Cleanup
npm run clean            # Dọn dẹp containers và volumes
```

## Cấu trúc Dev Container

```
.devcontainer/
├── devcontainer.json      # Cấu hình chính
├── docker-compose.yml     # Docker compose cho dev container
├── Dockerfile            # Custom base image
├── postCreateCommand.sh  # Script setup sau khi tạo container
└── .gitignore           # Git ignore cho dev container
```

## Ưu điểm

- ✅ **Consistent Environment**: Cùng môi trường trên mọi máy
- ✅ **Pre-installed Tools**: Node.js, Docker CLI, PostgreSQL client, Git, etc.
- ✅ **Docker-in-Docker**: Có thể chạy docker compose bên trong container
- ✅ **Hot Reload**: Tự động reload khi code thay đổi
- ✅ **Debugging Support**: Breakpoints và debugging tools
- ✅ **Extensions**: VS Code extensions được cấu hình sẵn
- ✅ **Isolation**: Không ảnh hưởng đến hệ thống host

## So sánh với Docker Compose

| Feature | Docker Compose | Dev Container |
|---------|----------------|----------------|
| Environment | Host machine | Container |
| Dependencies | Manual install | Pre-installed |
| Port conflicts | Possible | Isolated |
| Performance | Native speed | Slight overhead |
| Debugging | Limited | Full VS Code support |
| Team consistency | Variable | Guaranteed |

## Troubleshooting

### Container không build được
```bash
# Xóa và rebuild
docker system prune -a
# Restart VS Code và thử lại
```

### Ports bị conflict
- Kiểm tra `docker ps` xem có container nào đang dùng port
- Thay đổi port mapping trong docker-compose.yml

### Dependencies không cài được
```bash
# Trong container
npm run install:all
```

### Database connection failed
```bash
# Kiểm tra database đang chạy
docker compose ps postgres
# Restart database
docker compose restart postgres
```

## Tùy chỉnh

### Thêm VS Code Extension
Chỉnh sửa `.devcontainer/devcontainer.json`:
```json
{
  "customizations": {
    "vscode": {
      "extensions": [
        "your.extension.id"
      ]
    }
  }
}
```

### Thêm System Package
Chỉnh sửa `.devcontainer/Dockerfile`:
```dockerfile
RUN apt-get update && apt-get install -y your-package
```

## Hỗ trợ

Nếu gặp vấn đề với Dev Container:
1. Kiểm tra logs: `docker compose logs devcontainer`
2. Restart VS Code
3. Rebuild container: "Dev Containers: Rebuild Container"
