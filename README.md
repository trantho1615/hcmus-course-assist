# HCMUS Course Assist

Tiện ích Chrome/Edge hỗ trợ chuẩn bị danh sách và gửi yêu cầu đăng ký học phần
bằng phiên đăng nhập hiện tại trên portal HCMUS.

Ứng dụng được xây dựng cho tình huống giao diện portal phản hồi chậm hoặc không
tải hoàn chỉnh vào giờ cao điểm, trong khi endpoint đăng ký vẫn có thể tiếp
nhận và xử lý request.

> [!IMPORTANT]
> **Thông báo lỗi do quá tải hoặc timeout không khẳng định đăng ký thất bại.**
> Server có thể đã ghi nhận học phần nhưng response không quay lại được
> extension. Khi gặp lỗi mạng, HTTP 5xx hoặc timeout, hãy chờ một lúc rồi tải
> lại portal và kiểm tra danh sách đã đăng ký trước khi gửi lại request.

Đây là dự án cộng đồng, không phải ứng dụng chính thức của HCMUS.

## Tính năng

- Đọc danh sách môn chưa đăng ký từ Knockout ViewModel của portal.
- Hiển thị mã môn, lớp học phần, tên môn, sĩ số và `MaMG`.
- Cho phép tìm kiếm, chọn trước nhiều lớp và lưu lựa chọn cục bộ.
- Hỗ trợ nhập `MaMG` thủ công khi giao diện portal không đọc được danh sách.
- Sử dụng trực tiếp phiên đăng nhập hiện tại; không yêu cầu copy cookie.
- Khởi chạy các request gần đồng thời, cách nhau 150 ms.
- Ghép response chính xác với từng lớp dù response về không đúng thứ tự.
- Nhận diện các kết quả thành công, đã đăng ký, đang xem trước và lỗi nghiệp vụ.
- Không gửi dữ liệu tới máy chủ của bên thứ ba.

## Cài đặt

1. Tải mã nguồn hoặc tệp ZIP của dự án rồi giải nén.
2. Mở `chrome://extensions` trên Chrome hoặc `edge://extensions` trên Edge.
3. Bật **Developer mode / Chế độ dành cho nhà phát triển**.
4. Chọn **Load unpacked / Tải tiện ích đã giải nén**.
5. Chọn thư mục chứa `manifest.json`.
6. Mở hoặc tải lại tab `https://portal.ctdb.hcmus.edu.vn/` sau khi cài.

Sau mỗi lần cập nhật mã nguồn, bấm **Reload** tại trang quản lý extension và
tải lại tab portal.

## Hướng dẫn sử dụng

### 1. Chuẩn bị trước giờ đăng ký

1. Đăng nhập portal bằng tài khoản sinh viên.
2. Mở trang đăng ký học phần.
3. Bấm biểu tượng **HCMUS Course Assist**.
4. Chọn **Lấy danh sách từ portal**.
5. Tìm kiếm và tích chọn các lớp cần đăng ký.
6. Giữ tab portal đang đăng nhập cho tới khi hoàn tất.

Danh sách và lựa chọn được lưu bằng `chrome.storage.local`, vì vậy extension
không cần tải lại danh sách ngay tại thời điểm portal đông người truy cập.

Nếu không đọc được danh sách, nhập trực tiếp `MaMG`, ví dụ `6553`, rồi chọn
**Thêm**.

### 2. Gửi yêu cầu đăng ký

1. Đúng giờ mở đăng ký, mở popup extension.
2. Kiểm tra các lớp đã chọn.
3. Bấm **Đăng ký các lớp đã chọn** và xác nhận.
4. Giữ popup và tab portal mở cho tới khi nhận đủ kết quả.

Với ba lớp, thời điểm bắt đầu request xấp xỉ:

| Lớp | Thời điểm khởi chạy |
| --- | ---: |
| Lớp 1 | 0 ms |
| Lớp 2 | 150 ms |
| Lớp 3 | 300 ms |

Extension không chờ response của lớp trước mới gửi lớp tiếp theo. Mỗi response
được gắn lại đúng lớp tương ứng bằng request riêng.

### 3. Xử lý khi server quá tải

Một request có thể trải qua trình tự sau:

1. Extension gửi request thành công tới server.
2. Server ghi nhận đăng ký vào hệ thống.
3. Server quá tải, kết nối bị ngắt hoặc response về quá chậm.
4. Extension chỉ nhìn thấy timeout, HTTP 5xx hoặc lỗi mạng.
5. Sau khi tải lại portal, học phần vẫn xuất hiện trong danh sách đã đăng ký.

Vì vậy, khi gặp lỗi quá tải:

1. **Không bấm gửi lại liên tục.**
2. Chờ portal ổn định hơn.
3. Tải lại trang đăng ký và kiểm tra danh sách môn đã đăng ký.
4. Chỉ gửi lại nếu đã xác minh môn chưa được ghi nhận.

Lỗi ở phía client chỉ cho biết extension không nhận được kết quả chắc chắn; nó
không thể hoàn tác một đăng ký mà server đã xử lý.

## Các kết quả đã nhận diện

| Response | Thông báo trong extension |
| --- | --- |
| `Status: OK`, `Results: Success` | Đăng ký học phần thành công |
| `FAILED` và “Bạn đã đăng ký môn này!” | Môn học đã được đăng ký trước đó |
| `FAILED` và “Sinh viên có thể xem trước lịch học!” | Portal đang ở chế độ xem trước |
| `FAILED` với nội dung khác | Hiển thị nguyên văn `Message` của portal |
| HTTP 401/403 hoặc chuyển về trang đăng nhập | Phiên đăng nhập không hợp lệ |
| HTTP 5xx | Máy chủ quá tải hoặc gặp lỗi; cần kiểm tra lại trên portal |
| Timeout/lỗi mạng | Chưa xác định kết quả; cần kiểm tra lại trên portal |
| HTML thay vì JSON | Portal trả về trang trung gian hoặc request chưa được nhận diện đúng |

## Cách hoạt động

Extension gồm ba lớp:

1. `popup.js` hiển thị giao diện, lưu lựa chọn và điều phối request.
2. `content.js` chuyển lệnh giữa popup và trang portal.
3. `bridge.js` chạy trong `MAIN world`, truy cập `window.ko` và gửi request
   trong origin của portal.

Luồng đăng ký:

```text
Popup → Content script → Bridge trong portal → Endpoint đăng ký
                                              ↓
Popup ← Content script ← Response của portal ←
```

Bridge được dùng vì content script thông thường chạy trong isolated world và
không thể truy cập trực tiếp Knockout context do trang portal tạo ra.

## Cơ chế request

Extension gửi request trong ngữ cảnh của portal:

```http
POST https://portal.ctdb.hcmus.edu.vn/dang-ky-hoc-phan/sinh-vien-clc
```

Form data:

```text
action=addMonDangKy
data=<MaMG>
```

Các header ứng dụng cần thiết:

```http
Accept: */*
Cache-Control: no-cache
Pragma: no-cache
X-OFFICIAL-REQUEST: TRUE
X-Requested-With: XMLHttpRequest
```

Trình duyệt tự quản lý:

- Cookie phiên đăng nhập.
- `Origin`, `Referer` và `User-Agent`.
- Các header `Sec-Fetch-*`, `sec-ch-ua*`.
- `Content-Type: multipart/form-data` và boundary tương ứng với `FormData`.

Không đặt thủ công `Content-Type` vì boundary phải khớp với body do trình duyệt
tạo ra.

## Quyền và bảo mật

Extension chỉ yêu cầu:

- `storage`: lưu danh sách, lựa chọn và kết quả trong trình duyệt.
- `tabs`: tìm tab portal đang mở.
- Quyền truy cập `https://portal.ctdb.hcmus.edu.vn/*`.

Extension:

- Không đọc hoặc lưu mật khẩu.
- Không sao chép hoặc lưu giá trị cookie.
- Không yêu cầu người dùng dán cookie vào ứng dụng.
- Không gửi thông tin sinh viên tới máy chủ bên thứ ba.

Không chia sẻ cURL, ảnh Network hoặc log có chứa cookie xác thực. Nếu cookie bị
lộ, hãy đăng xuất portal để vô hiệu hóa phiên rồi đăng nhập lại.

## Cấu trúc dự án

```text
hcmus-course-assist/
├── manifest.json       # Cấu hình Chrome Extension Manifest V3
├── popup.html          # Giao diện popup
├── popup.css           # Kiểu hiển thị
├── popup.js            # Lựa chọn môn, điều phối và hiển thị kết quả
├── content.js          # Cầu nối Chrome messaging ↔ trang portal
├── bridge.js           # Đọc Knockout và gửi request cùng origin
├── shared.js           # Phân loại response
└── test/
    └── core.test.js    # Kiểm thử bộ phân loại response
```

## Phát triển và kiểm thử

Không cần cài dependency. Yêu cầu Node.js để chạy kiểm thử:

```bash
node test/core.test.js
```

Kiểm tra cú pháp JavaScript:

```bash
node --check bridge.js
node --check content.js
node --check popup.js
node --check shared.js
```

## Giới hạn

- Người dùng vẫn phải đăng nhập hợp lệ và giữ tab portal mở.
- Cần giữ popup mở trong khi chờ kết quả.
- Extension không tự động canh giờ hoặc gửi lặp liên tục.
- Khi mất response, extension không thể biết chắc server đã commit đăng ký hay
  chưa; portal là nguồn xác minh cuối cùng.
- Portal thay đổi endpoint, header, HTML hoặc Knockout ViewModel có thể làm
  extension ngừng hoạt động.
- Công cụ không thể đảm bảo còn chỗ, không trùng lịch hoặc đủ điều kiện học vụ.

## Phiên bản hiện tại

`0.4.0`

- Khởi chạy các request cách nhau 150 ms mà không chờ response trước.
- Giữ kết quả đúng với từng lớp dù response về không đúng thứ tự.
- Nhận diện các response thực tế đã quan sát từ portal.

## Trách nhiệm sử dụng

Hãy sử dụng extension phù hợp với quy định của nhà trường, không gửi request
lặp liên tục và không gây tải không cần thiết cho hệ thống. Người dùng tự chịu
trách nhiệm kiểm tra trạng thái đăng ký chính thức trên portal.
