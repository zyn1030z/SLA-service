# Hướng dẫn Debug Nhanh - Button Sync đến NestJS

## 🚀 Bắt đầu Debug trong 3 bước

### Bước 1: Khởi động NestJS với debug mode

```bash
docker compose down
docker compose up -d
```

Kiểm tra debug port đã sẵn sàng:

```bash
curl http://localhost:9229/json
```

### Bước 2: Attach VS Code Debugger

1. Mở VS Code
2. Nhấn `F5` hoặc vào **Run and Debug** (Ctrl+Shift+D)
3. Chọn **"Attach to NestJS (Docker)"**
4. Click **Start Debugging**

Bạn sẽ thấy "Debugger attached" trong Debug Console.

### Bước 3: Bấm button Sync và Debug

1. Mở browser, vào trang Systems
2. Mở Browser DevTools (F12) → tab **Sources**
3. Tìm file `app/systems/page.tsx` và đặt breakpoint tại dòng **288**
4. Click button **"Đồng bộ"** (Sync button)
5. Browser sẽ dừng tại breakpoint
6. Sử dụng **F10** (Step Over) để chạy từng dòng
7. Khi đến dòng gọi NestJS API, VS Code sẽ dừng tại NestJS Controller

## 📍 Các Breakpoints đã được thêm sẵn

### Frontend (Browser DevTools):

- **Line 288**: Bắt đầu `handleSyncSystem`
- **Line 305**: Trước khi gọi `syncSystem`
- **Line 309**: Sau khi sync xong
- **Line 88**: Bắt đầu `syncSystem` function
- **Line 116**: Trước khi gọi `/api/proxy-odoo`
- **Line 456**: Trước khi gọi NestJS API
- **Line 463**: Sau khi nhận response từ NestJS

### NestJS (VS Code Debugger):

- **BREAKPOINT 8** (line 68): Controller nhận request từ frontend
- **BREAKPOINT 9** (line 78): Sau khi sync xong, trả về response
- **BREAKPOINT 10** (line 213): Bắt đầu `syncWorkflows` service
- **BREAKPOINT 11** (line 249): Trước khi tìm workflow trong database
- **BREAKPOINT 12** (line 261): Sau khi tìm workflow - kiểm tra kết quả
- **BREAKPOINT 13** (line 284): Trước khi update workflow
- **BREAKPOINT 14** (line 297): Sau khi save workflow
- **BREAKPOINT 15** (line 328): Trước khi create workflow mới
- **BREAKPOINT 16** (line 338): Sau khi create workflow

> **Lưu ý**: Tất cả các breakpoints đã được thêm `console.log` với thông tin debug chi tiết để dễ theo dõi giá trị biến tại mỗi điểm dừng.

## 🎮 Phím tắt Debug

### Browser DevTools:

- **F8**: Resume (tiếp tục)
- **F10**: Step Over (chạy dòng hiện tại)
- **F11**: Step Into (vào function)
- **Shift+F11**: Step Out (thoát function)

### VS Code:

- **F5**: Continue
- **F10**: Step Over
- **F11**: Step Into
- **Shift+F11**: Step Out
- **Shift+F5**: Stop

## 🔍 Flow Debug

```
Click Button Sync
    ↓
Browser dừng tại line 288 (handleSyncSystem)
    ↓
F10 → line 305 → F10 → line 88 (syncSystem)
    ↓
F10 → line 116 (trước khi gọi proxy)
    ↓
Continue → Request đến /api/proxy-odoo
    ↓
Continue → line 456 (trước khi gọi NestJS)
    ↓
Continue → VS Code dừng tại line 68 (NestJS Controller)
    ↓
F11 → line 212 (NestJS Service)
    ↓
Debug từng dòng trong service...
```

## ⚠️ Troubleshooting

**Debugger không attach?**

```bash
docker compose restart nestjs-api
docker compose logs nestjs-api | grep debug
```

**Breakpoint không dừng?**

- Đảm bảo đã attach debugger (F5 trong VS Code)
- Thử dùng `debugger;` statement thay vì breakpoint
- Clear browser cache và reload

**Không thấy breakpoint trong NestJS?**

- Kiểm tra source maps đã bật trong `tsconfig.json`
- Đảm bảo file path đúng trong VS Code

## 💡 Tips

1. **Watch Variables**: Thêm variables vào Watch panel để theo dõi giá trị
2. **Call Stack**: Xem call stack để hiểu luồng code
3. **Debug Console**: Chạy code JavaScript trong debug console
4. **Conditional Breakpoints**: Click chuột phải vào breakpoint để thêm điều kiện
