# Hướng dẫn Debug

## Cách debug từng dòng trong Chrome DevTools

### Bước 1: Mở Chrome DevTools

1. Mở trình duyệt Chrome
2. Truy cập: http://localhost:3001/systems
3. Nhấn `F12` hoặc `Right-click` → `Inspect`

### Bước 2: Tìm file code

1. Chuyển sang tab **Sources**
2. Nhấn `Ctrl + P` (hoặc `Cmd + P` trên Mac)
3. Gõ: `page.tsx` để tìm file
4. Chọn file: `nextjs-web/app/systems/page.tsx`

### Bước 3: Đặt breakpoints

1. Tìm hàm `handleSyncSystem` (khoảng dòng 258)
2. Click vào số dòng bên trái để đặt breakpoint (xuất hiện chấm xanh)
3. Có thể đặt nhiều breakpoints ở các dòng khác nhau

### Bước 4: Debug

1. Click nút **RefreshCw** (đồng bộ) ở bất kỳ system nào
2. Browser sẽ dừng lại ở breakpoint
3. Sử dụng các nút điều khiển:
   - **Continue (F8)**: Tiếp tục chạy
   - **Step Over (F10)**: Chạy từng dòng
   - **Step Into (F11)**: Vào bên trong hàm
   - **Step Out (Shift + F11)**: Ra ngoài hàm hiện tại

### Bước 5: Xem giá trị biến

1. Bên trái sẽ hiển thị **Scope** với tất cả biến hiện tại
2. Hover vào biến trong code để xem giá trị
3. Có thể gõ lệnh trong Console để kiểm tra biến

## Cách debug trong VS Code

### Bước 1: Cài đặt extension

- Cài **Debugger for Chrome** extension

### Bước 2: Tạo launch configuration

File `.vscode/launch.json` đã được tạo sẵn:

```json
{
  "name": "Next.js: debug client-side",
  "type": "chrome",
  "request": "launch",
  "url": "http://localhost:3001/systems",
  "webRoot": "${workspaceFolder}/nextjs-web"
}
```

### Bước 3: Debug

1. Nhấn `F5` hoặc `Run` → `Start Debugging`
2. Chọn configuration "Next.js: debug client-side"
3. Browser sẽ mở và VS Code sẽ attach debugger
4. Đặt breakpoints trong VS Code
5. Click vào các nút để trigger code

## Các điểm quan trọng cần debug trong handleSyncSystem

1. **Dòng 259**: `console.log("🔄 handleSyncSystem called with systemId:", systemId);`

   - Kiểm tra systemId có đúng không

2. **Dòng 263**: `const system = localSystems.find((s) => s.id === systemId);`

   - Kiểm tra localSystems có data không
   - Kiểm tra system có được tìm thấy không

3. **Dòng 278**: `console.log("🔄 System details:", {...});`

   - Kiểm tra system.enabled có true không
   - Kiểm tra system.status có "connected" không

4. **Dòng 286**: `const result = await syncSystem(systemId);`

   - Đi vào bên trong hàm syncSystem để xem logic

5. **Dòng 287**: `console.log("🔄 syncSystem result:", result);`
   - Kiểm tra result.success là true hay false
   - Kiểm tra result.error nếu có

## Tips Debugging

- Sử dụng `console.log()` để in ra giá trị
- Sử dụng `debugger;` statement để force breakpoint
- Sử dụng Watch panel để theo dõi biểu thức
- Sử dụng Call Stack để xem hàng chờ thực thi
- Sử dụng Network tab để kiểm tra API calls
