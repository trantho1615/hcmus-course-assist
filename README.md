# HCMUS Course Assist

Tiện ích Chrome/Edge hỗ trợ đăng ký học phần CTDA HCMUS

## Cài đặt

1. Tải tệp ZIP tại [Releases](https://github.com/trantho1615/hcmus-course-assist/releases).
2. Giải nén tệp ZIP.
3. Mở `chrome://extensions` hoặc `edge://extensions`.
4. Bật **Developer mode / Chế độ dành cho nhà phát triển**.
5. Chọn **Load unpacked / Tải tiện ích đã giải nén**.
6. Chọn thư mục chứa tệp `manifest.json`.
7. Tải lại tab portal sau khi cài đặt.

## Cách sử dụng

### Trước giờ đăng ký (khoảng 30 phút để tránh sập web)

1. Đăng nhập portal và mở trang đăng ký học phần.
2. Mở extension.
3. Bấm **Lấy danh sách từ portal**.
4. Tìm kiếm và tích chọn các lớp cần đăng ký.
5. Giữ tab portal đang đăng nhập.

Nếu không lấy được danh sách, bạn có thể nhập trực tiếp `MaMG`, ví dụ `6553`.

### Khi mở đăng ký

1. Mở extension và kiểm tra các lớp đã chọn.
2. Bấm **Đăng ký các lớp đã chọn**.
3. Giữ popup extension và tab portal mở cho tới khi nhận đủ kết quả.

> **Thông báo lỗi do quá tải hoặc timeout không chắc là đăng ký thất bại.**
> Server có thể đã ghi nhận học phần nhưng không trả được kết quả về extension.
> Hãy tải lại portal và kiểm tra danh sách đã đăng ký.

## Lưu ý

- Đây không phải ứng dụng chính thức của HCMUS.
- Extension không thể đảm bảo còn chỗ, không trùng lịch hoặc đủ điều kiện học vụ.
- Portal là nguồn xác nhận cuối cùng về kết quả đăng ký.
- Hãy sử dụng phù hợp với quy định của nhà trường và không gửi request lặp liên tục.
