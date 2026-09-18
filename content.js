(() => {
  "use strict";

  const CHANNEL = "hcmus-course-assist-v1";
  const pending = new Map();

  window.addEventListener("message", (event) => {
    const message = event.data;
    if (
      event.source !== window ||
      message?.channel !== CHANNEL ||
      message?.direction !== "response"
    ) {
      return;
    }

    const request = pending.get(message.requestId);
    if (!request) return;

    clearTimeout(request.timeoutId);
    pending.delete(message.requestId);

    if (message.ok) request.resolve(message.result);
    else request.reject(new Error(message.error || "Portal không xử lý được yêu cầu."));
  });

  const requestPage = (command, payload) => new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();
    const timeoutId = setTimeout(() => {
      pending.delete(requestId);
      reject(new Error("Portal phản hồi quá chậm. Yêu cầu đã hết thời gian chờ."));
    }, command === "registerCourse" ? 90000 : 15000);

    pending.set(requestId, { resolve, reject, timeoutId });
    window.postMessage({
      channel: CHANNEL,
      direction: "request",
      requestId,
      command,
      payload
    }, "*");
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.target !== CHANNEL) return false;

    requestPage(message.command, message.payload)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      }));

    return true;
  });
})();
