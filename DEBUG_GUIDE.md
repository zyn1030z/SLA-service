# Hướng dẫn Debug Full Stack (Frontend → NestJS)

## Tổng quan Flow Debug

Khi bấm button Sync (dòng 667-678 trong `nextjs-web/app/systems/page.tsx`), flow sẽ như sau:

1. **Frontend (React)**: `handleSyncSystem` → `syncSystem` → gọi `/api/proxy-odoo`
2. **Next.js API Route**: `/api/proxy-odoo/route.ts` → gọi Odoo API
3. **Frontend Hook**: `use-system-management.ts` → gọi `apiClient.syncWorkflows`
4. **NestJS Controller**: `workflow.controller.ts` → `syncWorkflows` endpoint
5. **NestJS Service**: `workflow.service.ts` → `syncWorkflows` method

## Cách Debug từ Frontend đến NestJS

### Bước 1: Khởi động services với debug mode

```bash
# Đảm bảo NestJS chạy với debug mode
docker compose down
docker compose up -d

# Kiểm tra NestJS debug port
docker compose logs nestjs-api | grep -i "debug\|inspect"
# Nên thấy: "Debugger listening on ws://0.0.0.0:9229"
```

### Bước 2: Attach VS Code Debugger vào NestJS

1. Mở VS Code trong thư mục project
2. Vào tab **Run and Debug** (Ctrl+Shift+D hoặc Cmd+Shift+D)
3. Chọn configuration **"Attach to NestJS (Docker)"**
4. Click nút **Start Debugging** (F5)
5. Bạn sẽ thấy "Debugger attached" trong Debug Console

### Bước 3: Đặt Breakpoints

Các breakpoints đã được thêm sẵn với `debugger;` statements:

#### Frontend Breakpoints:
- **BREAKPOINT 1** (line 288): `nextjs-web/app/systems/page.tsx` - Bắt đầu `handleSyncSystem`
- **BREAKPOINT 2** (line 305): Trước khi gọi `syncSystem`
- **BREAKPOINT 3** (line 309): Sau khi sync xong
- **BREAKPOINT 4** (line 88): Bắt đầu `syncSystem` function
- **BREAKPOINT 5** (line 116): Trước khi gọi `/api/proxy-odoo`
- **BREAKPOINT 6** (line 456): `use-system-management.ts` - Trước khi gọi NestJS API
- **BREAKPOINT 7** (line 463): Sau khi nhận response từ NestJS

#### NestJS Breakpoints:
- **BREAKPOINT 8** (line 68): `workflow.controller.ts` - Controller nhận request
- **BREAKPOINT 9** (line 78): Sau khi sync xong, trả về response
- **BREAKPOINT 10** (line 212): `workflow.service.ts` - Bắt đầu `syncWorkflows`
- **BREAKPOINT 11** (line 247): Trước khi tìm workflow
- **BREAKPOINT 12** (line 257): Sau khi tìm workflow
- **BREAKPOINT 13** (line 278): Trước khi update workflow
- **BREAKPOINT 14** (line 285): Sau khi save workflow
- **BREAKPOINT 15** (line 310): Trước khi create workflow mới
- **BREAKPOINT 16** (line 313): Sau khi create workflow

### Bước 4: Debug Frontend (Browser DevTools)

1. Mở browser (Chrome/Edge)
2. Mở DevTools (F12)
3. Vào tab **Sources**
4. Tìm file `nextjs-web/app/systems/page.tsx`
5. Đặt breakpoint tại dòng 288 (hoặc dùng `debugger;` đã có sẵn)
6. Hoặc bật **"Pause on exceptions"** để dừng khi có lỗi

### Bước 5: Trigger Sync và Debug

1. Vào frontend và click button **"Đồng bộ"** (Sync button - dòng 667-678)
2. Browser sẽ dừng tại BREAKPOINT 1 (nếu dùng Browser DevTools)
3. Sử dụng **Step Over (F10)** để chạy từng dòng
4. Khi đến BREAKPOINT 6 (gọi NestJS API), request sẽ được gửi đến NestJS
5. VS Code debugger sẽ dừng tại BREAKPOINT 8 trong NestJS Controller
6. Tiếp tục debug trong NestJS với **Step Into (F11)** để vào service
7. Debug từng dòng trong `workflow.service.ts`

### Bước 6: Sử dụng Debug Controls

Trong VS Code Debug Panel:
- **Continue (F5)**: Tiếp tục chạy đến breakpoint tiếp theo
- **Step Over (F10)**: Chạy dòng hiện tại, không vào function
- **Step Into (F11)**: Vào trong function
- **Step Out (Shift+F11)**: Thoát khỏi function hiện tại
- **Restart (Ctrl+Shift+F5)**: Restart debugger
- **Stop (Shift+F5)**: Dừng debugger

Trong Browser DevTools:
- **Resume (F8)**: Tiếp tục
- **Step Over (F10)**: Chạy dòng hiện tại
- **Step Into (F11)**: Vào function
- **Step Out (Shift+F11)**: Thoát function

## Debug Full Stack (Cả Frontend và NestJS cùng lúc)

### Cách 1: Sử dụng Compound Configuration

1. Trong VS Code, chọn **"Debug Full Stack (NestJS + Next.js)"**
2. Click **Start Debugging (F5)**
3. Cả NestJS và Next.js sẽ được attach cùng lúc

### Cách 2: Debug từng phần riêng biệt

1. **Debug NestJS**: Chọn "Attach to NestJS (Docker)" và start
2. **Debug Frontend**: Dùng Browser DevTools (F12)

## Kiểm tra Debug Port

```bash
# Kiểm tra NestJS debug port
curl http://localhost:9229/json
# Nên trả về JSON với thông tin debugger

# Kiểm tra container đang chạy
docker compose ps

# Xem logs
docker compose logs nestjs-api | grep -i "debug\|inspect"
```

## Troubleshooting

### Debugger không attach được vào NestJS

1. Kiểm tra port 9229 có được expose không:
   ```bash
   docker compose ps
   # Nên thấy: 0.0.0.0:9229->9229/tcp
   ```

2. Kiểm tra NestJS có chạy với debug mode không:
   ```bash
   docker compose logs nestjs-api | grep -i "debug\|inspect"
   # Nên thấy: "Debugger listening on ws://0.0.0.0:9229"
   ```

3. Restart container:
   ```bash
   docker compose restart nestjs-api
   ```

### Breakpoint không dừng trong NestJS

1. Đảm bảo đang chạy với `start:debug` mode (kiểm tra `docker-compose.yml`)
2. Kiểm tra file path trong VS Code đúng chưa
3. Thử dùng `debugger;` statement thay vì breakpoint
4. Đảm bảo source maps được bật trong `tsconfig.json`

### Breakpoint không dừng trong Frontend

1. Đảm bảo Browser DevTools đang mở
2. Kiểm tra "Pause on exceptions" có bật không
3. Thử dùng `debugger;` statement thay vì breakpoint
4. Clear browser cache và reload

### Debugger chậm

- Đây là bình thường khi debug qua Docker
- Có thể tăng timeout trong VS Code settings
- Hoặc debug trực tiếp trên máy local (không qua Docker)

## Tips Debugging

1. **Watch Variables**: Trong VS Code, thêm variables vào Watch panel để theo dõi giá trị
2. **Call Stack**: Xem call stack để hiểu luồng code
3. **Debug Console**: Chạy code JavaScript trong debug console
4. **Conditional Breakpoints**: Click chuột phải vào breakpoint để thêm điều kiện
5. **Logpoints**: Thêm logpoints để log mà không dừng execution

## Ví dụ Debug Flow

```
1. Click button Sync
   ↓
2. Browser dừng tại BREAKPOINT 1 (handleSyncSystem)
   ↓
3. Step Over → BREAKPOINT 2
   ↓
4. Step Over → BREAKPOINT 4 (syncSystem)
   ↓
5. Step Over → BREAKPOINT 5 (trước khi gọi proxy)
   ↓
6. Continue → Request gửi đến /api/proxy-odoo
   ↓
7. Continue → BREAKPOINT 6 (trước khi gọi NestJS)
   ↓
8. Continue → VS Code dừng tại BREAKPOINT 8 (NestJS Controller)
   ↓
9. Step Into → BREAKPOINT 10 (NestJS Service)
   ↓
10. Debug từng dòng trong service...
```

---

# Hướng dẫn Debug NestJS trong Docker Compose (Legacy)

## Cách 1: Sử dụng VS Code Debugger (Khuyến nghị)

### Bước 1: Khởi động containers với debug mode

```bash
# Restart containers với debug mode
docker compose down
docker compose up -d
```

### Bước 2: Mở VS Code và attach debugger

1. Mở VS Code trong thư mục project
2. Vào tab **Run and Debug** (Ctrl+Shift+D hoặc Cmd+Shift+D)
3. Chọn configuration **"Attach to NestJS (Docker)"**
4. Click nút **Start Debugging** (F5)

### Bước 3: Đặt breakpoint

1. Mở file `nestjs-api/src/modules/workflow/workflow.service.ts`
2. Click vào số dòng bên trái để đặt breakpoint (hoặc dùng `debugger;` statement)
3. Breakpoints sẽ dừng tại:
   - Dòng 212: Bắt đầu hàm `syncWorkflows`
   - Dòng 240: Trước khi tìm workflow
   - Dòng 247: Sau khi tìm workflow
   - Dòng 260: Trước khi update workflow
   - Dòng 266: Sau khi save workflow
   - Dòng 281: Trước khi create workflow mới
   - Dòng 283: Sau khi create workflow

### Bước 4: Trigger sync

1. Vào frontend và click button "Đồng bộ" (Sync)
2. Debugger sẽ dừng tại breakpoint đầu tiên
3. Sử dụng các nút:
   - **Continue (F5)**: Tiếp tục chạy
   - **Step Over (F10)**: Chạy dòng hiện tại
   - **Step Into (F11)**: Vào trong function
   - **Step Out (Shift+F11)**: Thoát khỏi function
   - **Restart (Ctrl+Shift+F5)**: Restart debugger
   - **Stop (Shift+F5)**: Dừng debugger

## Cách 2: Sử dụng Chrome DevTools

### Bước 1: Khởi động containers

```bash
docker compose up -d
```

### Bước 2: Mở Chrome DevTools

1. Mở Chrome browser
2. Vào `chrome://inspect`
3. Click **"Open dedicated DevTools for Node"**
4. Hoặc click **"inspect"** link trong danh sách

### Bước 3: Đặt breakpoint

1. Trong DevTools, vào tab **Sources**
2. Tìm file `workflow.service.ts`
3. Click vào số dòng để đặt breakpoint

## Cách 3: Sử dụng `debugger;` statement

Code đã có sẵn các `debugger;` statements tại các điểm quan trọng:

- Dòng 212: Bắt đầu hàm
- Dòng 240: Trước khi tìm workflow
- Dòng 247: Sau khi tìm workflow
- Dòng 260: Trước khi update
- Dòng 266: Sau khi save
- Dòng 281: Trước khi create
- Dòng 283: Sau khi create

Khi chạy với debug mode, code sẽ tự động dừng tại các `debugger;` statements.

## Kiểm tra Debug Port

```bash
# Kiểm tra xem debug port có đang listen không
docker compose ps
docker compose logs nestjs-api | grep -i "debug\|inspect"

# Hoặc test connection
curl http://localhost:9229/json
```

## Troubleshooting

### Debugger không attach được

1. Kiểm tra port 9229 có được expose không:

   ```bash
   docker compose ps
   ```

2. Kiểm tra logs:

   ```bash
   docker compose logs nestjs-api | grep -i "debug\|inspect"
   ```

3. Restart container:
   ```bash
   docker compose restart nestjs-api
   ```

### Breakpoint không dừng

1. Đảm bảo đang chạy với `start:debug` mode
2. Kiểm tra file path trong VS Code launch.json đúng chưa
3. Thử dùng `debugger;` statement thay vì breakpoint

### Debugger chậm

- Đây là bình thường khi debug qua Docker
- Có thể tăng timeout trong VS Code settings

## Tắt Debug Mode

Để tắt debug và quay lại chạy bình thường:

```bash
# Sửa docker-compose.yml:
# - Đổi command từ "npm run start:debug" thành "npm run start:dev"
# - Xóa dòng "9229:9229" trong ports
# - Xóa environment NODE_OPTIONS

docker compose down
docker compose up -d
```

## Tips

1. **Watch Variables**: Trong VS Code, thêm variables vào Watch panel để theo dõi giá trị
2. **Call Stack**: Xem call stack để hiểu luồng code
3. **Debug Console**: Chạy code JavaScript trong debug console
4. **Conditional Breakpoints**: Click chuột phải vào breakpoint để thêm điều kiện
