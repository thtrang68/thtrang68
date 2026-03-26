# Kế hoạch triển khai: Lịch Trình Thông Minh

## 1. Chức năng chính (MVP)
- **Hiển thị thời gian**: Hiển thị ngày và giờ hiện tại theo thời gian thực.
- **Quản lý lịch trình**: 
  - Thêm lịch trình mới (Tên, Thời gian, Ghi chú).
  - Danh sách lịch trình sắp tới.
  - Đánh dấu hoàn thành hoặc xóa lịch trình.
- **Hệ thống nhắc nhở**:
  - Thông báo khi còn 1 tiếng nữa là đến giờ.
  - Thông báo khi lịch trình đã quá hạn mà chưa hoàn thành.
- **Giao diện**: Hiện đại, tối giản, dễ sử dụng (Clean Utility).

## 2. Công nghệ sử dụng
- **Frontend**: React (Vite), TypeScript, Tailwind CSS.
- **Lưu trữ**: Local Storage (Trình duyệt).
- **Thư viện**: 
  - `lucide-react` (Icons).
  - `motion` (Animations).
  - `date-fns` (Date manipulation).

## 3. Cấu trúc dữ liệu (Local Storage)
- **Key: `smart_schedules`**
  - Danh sách các đối tượng `Schedule`.

## 4. Các bước thực hiện
1. Thiết lập Metadata và Firebase (Đang thực hiện).
2. Cài đặt các thư viện bổ sung (`date-fns`).
3. Xây dựng giao diện cơ bản (Layout, Header, TimeDisplay).
4. Xây dựng chức năng thêm lịch trình (Modal & Form).
5. Xây dựng logic nhắc nhở (Check intervals).
6. Kết nối Firebase để lưu trữ dữ liệu.
7. Kiểm tra và tối ưu hóa.
