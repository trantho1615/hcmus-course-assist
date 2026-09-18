(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CourseAssistCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PREVIEW_MESSAGE = "sinh viên có thể xem trước lịch học";
  const ALREADY_REGISTERED_MESSAGE = "bạn đã đăng ký môn này";

  function parseJson(body) {
    try {
      return JSON.parse(String(body ?? ""));
    } catch {
      return null;
    }
  }

  function interpretResponse(transport) {
    const statusCode = Number(transport?.statusCode || 0);
    const body = String(transport?.body ?? "");
    const data = parseJson(body);

    if (statusCode === 401 || statusCode === 403) {
      return { type: "session_expired", message: "Phiên đăng nhập đã hết hạn hoặc không hợp lệ." };
    }

    if (transport?.redirected && /dang-nhap|login|signin/i.test(transport?.finalUrl || "")) {
      return { type: "session_expired", message: "Portal đã chuyển về trang đăng nhập. Hãy đăng nhập lại." };
    }

    if (statusCode >= 500) {
      return { type: "server_error", message: `Máy chủ đang quá tải hoặc gặp lỗi (${statusCode}).` };
    }

    if (data && typeof data === "object") {
      const status = String(data.Status ?? "").trim().toUpperCase();
      const results = String(data.Results ?? "").trim().toUpperCase();
      const message = String(data.Message ?? "").trim();

      if (status === "SUCCESS" || (status === "OK" && results === "SUCCESS")) {
        return { type: "success", message: message || "Đăng ký học phần thành công.", raw: data };
      }

      if (status === "FAILED" && message.toLowerCase().includes(PREVIEW_MESSAGE)) {
        return {
          type: "not_open_yet",
          message: "Portal đang ở chế độ xem trước và hiện chưa cho phép đăng ký.",
          raw: data
        };
      }

      if (status === "FAILED" && message.toLowerCase().includes(ALREADY_REGISTERED_MESSAGE)) {
        return {
          type: "already_registered",
          message: "Môn học này đã được đăng ký trước đó.",
          raw: data
        };
      }

      if (status === "FAILED") {
        return { type: "business_error", message: message || "Portal từ chối đăng ký.", raw: data };
      }

      return { type: "unknown", message: message || "Portal trả về kết quả chưa xác định.", raw: data };
    }

    const contentType = String(transport?.contentType ?? "").toLowerCase();
    if (contentType.includes("text/html") || /^\s*</.test(body)) {
      return {
        type: "unexpected_html",
        message: `Portal trả về HTML thay vì JSON (HTTP ${statusCode || "?"}). Request có thể chưa được nhận diện là AJAX.`
      };
    }

    if (!transport?.httpOk) {
      return { type: "network_error", message: `Yêu cầu thất bại (HTTP ${statusCode || "?"}).` };
    }

    return { type: "unknown", message: "Không đọc được phản hồi của portal." };
  }

  return { interpretResponse, parseJson };
});
