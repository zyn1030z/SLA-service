# SLA Centralized Microservice

Backend: NestJS + TypeORM + PostgreSQL

Frontend: NextJS (App Router) + TailwindCSS

## Cấu trúc

- `nestjs-api/`: API chính, chứa modules, entities, controllers
- `nextjs-web/`: Dashboard quản trị SLA
- `docker-compose.yml`: orchestrate Postgres + API + Web

## Cấu hình môi trường

Tạo file `.env` dựa trên `.env.example` ở thư mục gốc.

Biến quan trọng:

- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT`
- `API_PORT`, `WEB_PORT`
- `NEST_JWT_SECRET`, `HMAC_SHARED_SECRET`, `ODOO_BASE_URL`
- `NEXT_PUBLIC_API_BASE_URL`

## Chạy nhanh bằng Docker Compose

```bash
# 1) tạo .env từ mẫu
cp .env.example .env
# 2) build và chạy
docker compose up --build
```

- API: http://localhost:${API_PORT:-3000}
- Web: http://localhost:${WEB_PORT:-3001}

## Chạy bằng Dev Container (Khuyến nghị cho VS Code)

Dev Container cung cấp môi trường phát triển nhất quán với tất cả dependencies được cài đặt sẵn.

### Yêu cầu
- VS Code với extension "Dev Containers"
- Docker Desktop

### Cách sử dụng

1. **Mở trong Dev Container:**
   - Mở VS Code
   - Command Palette (Ctrl+Shift+P) → "Dev Containers: Reopen in Container"
   - Chọn "SLA Service Development Environment"

2. **Khởi tạo dự án:**
   ```bash
   npm run devcontainer:setup
   ```

3. **Chạy ứng dụng:**
   ```bash
   npm run dev
   ```

### Ưu điểm của Dev Container
- ✅ Môi trường nhất quán trên mọi máy
- ✅ Tất cả tools đã được cài đặt (Node.js, Docker CLI, PostgreSQL client, etc.)
- ✅ Có thể chạy docker compose bên trong container
- ✅ Hot reload cho cả NestJS và NextJS
- ✅ Debugging support với breakpoints
- ✅ Extensions VS Code được cấu hình sẵn

### Scripts hữu ích trong Dev Container

```bash
# Khởi tạo dự án
npm run devcontainer:setup

# Chạy tất cả services
npm run dev

# Xem logs
npm run dev:logs

# Dừng services
npm run dev:stop

# Chạy debug mode
npm run debug

# Cài đặt dependencies
npm run install:all

# Chạy migrations
npm run migration:run
```

## Auth

- Mặc định bật Global Guard:
  - Hỗ trợ JWT qua header `Authorization: Bearer <token>`
  - Hỗ trợ HMAC qua header `X-Signature: <hex_sha256>` (tính từ raw body với `HMAC_SHARED_SECRET`)
- Dùng decorator `@Public()` cho các endpoint Odoo gọi vào bằng HMAC: `POST /workflows/sync`, `POST /sla/start`, `POST /sla/transition`.

## Endpoints chính

- `POST /workflows/sync` (Public/HMAC)
- `POST /sla/start` (Public/HMAC)
- `POST /sla/transition` (Public/HMAC)
- `POST /odoo/auto-approve` (yêu cầu JWT mặc định)
- `GET /sla/status/:record_id` (JWT)
- `GET /dashboard/summary` (JWT)

## Ghi chú SLA Logic

- Cron 5 phút kiểm tra SLA, tạo vi phạm, gửi thông báo, và auto-approve nếu vượt ngưỡng.
- SLA tính trong giờ làm việc (8:00–17:00, Mon–Fri) — cần bổ sung hàm tính thời gian làm việc thực tế ở bước sau.
