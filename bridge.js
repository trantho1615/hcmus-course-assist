(() => {
  "use strict";

  const CHANNEL = "hcmus-course-assist-v1";
  const ENDPOINT = "https://portal.ctdb.hcmus.edu.vn/dang-ky-hoc-phan/sinh-vien-clc";

  if (window.__HCMUS_COURSE_ASSIST_BRIDGE__) return;
  window.__HCMUS_COURSE_ASSIST_BRIDGE__ = true;

  const unwrap = (value) => {
    try {
      if (window.ko?.unwrap) return window.ko.unwrap(value);
      return typeof value === "function" ? value() : value;
    } catch {
      return undefined;
    }
  };

  const firstValue = (...values) => {
    for (const value of values) {
      const unwrapped = unwrap(value);
      if (unwrapped !== undefined && unwrapped !== null && unwrapped !== "") {
        return unwrapped;
      }
    }
    return "";
  };

  const text = (value) => String(value ?? "").trim();

  const booleanValue = (value) => {
    const unwrapped = unwrap(value);
    if (typeof unwrapped === "boolean") return unwrapped;
    if (typeof unwrapped === "number") return unwrapped !== 0;
    return ["true", "1", "yes", "co", "có"].includes(text(unwrapped).toLowerCase());
  };

  const normalizeCourse = (course) => ({
    MaMG: text(firstValue(course?.MaMG, course?.MaMg, course?.maMG, course?.MAMG)),
    KyHieu: text(firstValue(course?.KyHieu, course?.kyHieu)),
    MaLopHP: text(firstValue(course?.MaLopHP, course?.maLopHP)),
    TenMH: text(firstValue(course?.TenMH, course?.tenMH)),
    SoSVTT: text(firstValue(course?.SoSVTT, course?.soSVTT)),
    SoSVDK: text(firstValue(course?.SoSVDK, course?.soSVDK)),
    CoTheDKHP: booleanValue(firstValue(course?.CoTheDKHP, course?.coTheDKHP))
  });

  const loadCourses = () => {
    const host = document.querySelector("#divMonChuaDK");
    if (!host) {
      throw new Error("Không tìm thấy khu vực môn chưa đăng ký. Hãy mở đúng trang đăng ký học phần.");
    }
    if (!window.ko?.contextFor) {
      throw new Error("Trang chưa tải xong dữ liệu Knockout. Hãy thử lại sau vài giây.");
    }

    const vm = window.ko.contextFor(host)?.$data;
    const source = unwrap(vm?.dsChuaDangKy);
    const list = Array.isArray(source) ? source : [];
    const courses = list.map(normalizeCourse).filter((course) => course.MaMG);

    if (!courses.length) {
      throw new Error("Không đọc được danh sách môn chưa đăng ký từ portal.");
    }

    return { courses, pageTitle: document.title, pageUrl: location.href };
  };

  const registerCourse = async (maMG) => {
    const normalizedMaMG = text(maMG);
    if (!normalizedMaMG || normalizedMaMG.length > 64) {
      throw new Error("MaMG không hợp lệ.");
    }

    const body = new FormData();
    body.append("action", "addMonDangKy");
    body.append("data", normalizedMaMG);

    const response = await fetch(ENDPOINT, {
      method: "POST",
      mode: "cors",
      credentials: "include",
      cache: "no-store",
      referrer: ENDPOINT,
      headers: {
        "Accept": "*/*",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "X-OFFICIAL-REQUEST": "TRUE",
        "X-Requested-With": "XMLHttpRequest"
      },
      body
    });

    return {
      httpOk: response.ok,
      statusCode: response.status,
      contentType: response.headers.get("content-type") || "",
      redirected: response.redirected,
      finalUrl: response.url,
      body: await response.text()
    };
  };

  const execute = async (command, payload) => {
    switch (command) {
      case "ping":
        return { pageTitle: document.title, pageUrl: location.href };
      case "loadCourses":
        return loadCourses();
      case "registerCourse":
        return registerCourse(payload?.maMG);
      default:
        throw new Error("Lệnh không được hỗ trợ.");
    }
  };

  window.addEventListener("message", async (event) => {
    const message = event.data;
    if (
      event.source !== window ||
      message?.channel !== CHANNEL ||
      message?.direction !== "request" ||
      !message?.requestId
    ) {
      return;
    }

    try {
      const result = await execute(message.command, message.payload);
      window.postMessage({
        channel: CHANNEL,
        direction: "response",
        requestId: message.requestId,
        ok: true,
        result
      }, "*");
    } catch (error) {
      window.postMessage({
        channel: CHANNEL,
        direction: "response",
        requestId: message.requestId,
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      }, "*");
    }
  });
})();
