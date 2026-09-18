const assert = require("node:assert/strict");
const { interpretResponse, parseJson } = require("../shared.js");

const preview = interpretResponse({
  httpOk: true,
  statusCode: 200,
  contentType: "application/json",
  redirected: false,
  body: JSON.stringify({
    Status: "FAILED",
    Results: null,
    Message: "Sinh viên có thể xem trước lịch học!",
    StackTrace: null
  })
});
assert.equal(preview.type, "not_open_yet");
assert.deepEqual(parseJson(JSON.stringify(preview.raw)), preview.raw);

const success = interpretResponse({
  httpOk: true,
  statusCode: 200,
  contentType: "application/json",
  body: JSON.stringify({ Status: "Success", Message: "Đăng ký thành công" })
});
assert.equal(success.type, "success");

const realSuccess = interpretResponse({
  httpOk: true,
  statusCode: 200,
  contentType: "application/json",
  body: JSON.stringify({ Status: "OK", Results: "Success", Message: "", StackTrace: null })
});
assert.equal(realSuccess.type, "success");
assert.equal(realSuccess.message, "Đăng ký học phần thành công.");

const alreadyRegistered = interpretResponse({
  httpOk: true,
  statusCode: 200,
  contentType: "application/json",
  body: JSON.stringify({
    Status: "FAILED",
    Results: null,
    Message: "Bạn đã đăng ký môn này!",
    StackTrace: null
  })
});
assert.equal(alreadyRegistered.type, "already_registered");
assert.equal(alreadyRegistered.message, "Môn học này đã được đăng ký trước đó.");

const businessError = interpretResponse({
  httpOk: true,
  statusCode: 200,
  contentType: "application/json",
  body: JSON.stringify({ Status: "FAILED", Message: "Lớp học phần đã đủ sĩ số" })
});
assert.equal(businessError.type, "business_error");
assert.equal(businessError.message, "Lớp học phần đã đủ sĩ số");

const expired = interpretResponse({
  httpOk: true,
  statusCode: 200,
  contentType: "text/html; charset=utf-8",
  body: "<!doctype html><title>Đăng nhập</title>"
});
assert.equal(expired.type, "unexpected_html");

const redirectedToLogin = interpretResponse({
  httpOk: true,
  statusCode: 200,
  contentType: "text/html; charset=utf-8",
  redirected: true,
  finalUrl: "https://portal.ctdb.hcmus.edu.vn/dang-nhap",
  body: "<!doctype html><title>Đăng nhập</title>"
});
assert.equal(redirectedToLogin.type, "session_expired");

const overloaded = interpretResponse({
  httpOk: false,
  statusCode: 503,
  contentType: "text/html",
  body: "Service unavailable"
});
assert.equal(overloaded.type, "server_error");

const bridgeSource = require("node:fs").readFileSync(require("node:path").join(__dirname, "../bridge.js"), "utf8");
assert.match(bridgeSource, /"X-OFFICIAL-REQUEST": "TRUE"/);
assert.match(bridgeSource, /"X-Requested-With": "XMLHttpRequest"/);

const popupSource = require("node:fs").readFileSync(require("node:path").join(__dirname, "../popup.js"), "utf8");
assert.doesNotMatch(popupSource, /JSON response|rawJson|response-json/);
assert.match(popupSource, /REQUEST_STAGGER_MS = 150/);
assert.match(popupSource, /await Promise\.all\(requests\)/);
assert.doesNotMatch(popupSource, /setTimeout\(resolve, 650\)/);

console.log("All core response tests passed.");
