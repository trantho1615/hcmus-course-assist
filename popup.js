(() => {
  "use strict";

  const CHANNEL = "hcmus-course-assist-v1";
  const STORAGE_KEY = "courseAssistStateV1";
  const PORTAL_PATTERN = "https://portal.ctdb.hcmus.edu.vn/*";
  const REGISTER_PATH = "/dang-ky-hoc-phan/sinh-vien-clc";
  const REQUEST_STAGGER_MS = 150;

  const elements = {
    connectionBadge: document.querySelector("#connectionBadge"),
    notice: document.querySelector("#notice"),
    syncButton: document.querySelector("#syncButton"),
    clearButton: document.querySelector("#clearButton"),
    manualMaMG: document.querySelector("#manualMaMG"),
    manualAddButton: document.querySelector("#manualAddButton"),
    syncMeta: document.querySelector("#syncMeta"),
    selectedCount: document.querySelector("#selectedCount"),
    searchInput: document.querySelector("#searchInput"),
    courseList: document.querySelector("#courseList"),
    registerButton: document.querySelector("#registerButton"),
    resultSection: document.querySelector("#resultSection"),
    resultList: document.querySelector("#resultList"),
    clearResultsButton: document.querySelector("#clearResultsButton")
  };

  let state = {
    courses: [],
    selected: [],
    results: [],
    lastSyncedAt: null
  };
  let running = false;

  const saveState = async () => chrome.storage.local.set({ [STORAGE_KEY]: state });

  const loadState = async () => {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const candidate = stored[STORAGE_KEY];
    if (!candidate || typeof candidate !== "object") return;
    state = {
      courses: Array.isArray(candidate.courses) ? candidate.courses : [],
      selected: Array.isArray(candidate.selected) ? candidate.selected.map(String) : [],
      results: Array.isArray(candidate.results) ? candidate.results : [],
      lastSyncedAt: candidate.lastSyncedAt || null
    };
  };

  const setNotice = (message, type = "info") => {
    elements.notice.textContent = message;
    elements.notice.className = "notice";
    if (type === "error") elements.notice.classList.add("notice-error");
    if (type === "success") elements.notice.classList.add("notice-success");
  };

  const setConnection = (connected) => {
    elements.connectionBadge.textContent = connected ? "Portal đang mở" : "Chưa kết nối";
    elements.connectionBadge.className = `badge ${connected ? "badge-success" : "badge-danger"}`;
  };

  const findPortalTab = async () => {
    const tabs = await chrome.tabs.query({ url: PORTAL_PATTERN });
    if (!tabs.length) throw new Error("Không tìm thấy tab portal. Hãy mở portal và đăng nhập trước.");
    return tabs.sort((a, b) => {
      const aIsRegister = new URL(a.url).pathname === REGISTER_PATH ? 1 : 0;
      const bIsRegister = new URL(b.url).pathname === REGISTER_PATH ? 1 : 0;
      return bIsRegister - aIsRegister || (b.lastAccessed || 0) - (a.lastAccessed || 0);
    })[0];
  };

  const sendCommand = async (command, payload) => {
    const tab = await findPortalTab();
    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        target: CHANNEL,
        command,
        payload
      });
      if (!response?.ok) throw new Error(response?.error || "Không nhận được phản hồi từ portal.");
      return response.result;
    } catch (error) {
      if (/Receiving end does not exist|Could not establish connection/i.test(String(error))) {
        throw new Error("Hãy tải lại tab portal một lần sau khi cài extension.");
      }
      throw error;
    }
  };

  const formatTime = (value) => {
    if (!value) return "Chưa đồng bộ dữ liệu";
    return `Đồng bộ lúc ${new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit"
    }).format(new Date(value))}`;
  };

  const selectedSet = () => new Set(state.selected.map(String));

  const courseLabel = (course) => {
    const parts = [course.KyHieu, course.MaLopHP, course.TenMH].filter(Boolean);
    return parts.join(" · ") || `MaMG ${course.MaMG}`;
  };

  const renderCourses = () => {
    const query = elements.searchInput.value.trim().toLowerCase();
    const selected = selectedSet();
    const visible = state.courses.filter((course) => {
      const haystack = [course.MaMG, course.KyHieu, course.MaLopHP, course.TenMH]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });

    elements.courseList.replaceChildren();
    if (!visible.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = state.courses.length
        ? "Không có môn phù hợp với từ khóa."
        : "Chưa có dữ liệu. Hãy lấy danh sách từ portal hoặc thêm MaMG thủ công.";
      elements.courseList.append(empty);
    }

    for (const course of visible) {
      const label = document.createElement("label");
      label.className = "course-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = selected.has(String(course.MaMG));
      checkbox.disabled = running;
      checkbox.addEventListener("change", async () => {
        const current = selectedSet();
        if (checkbox.checked) current.add(String(course.MaMG));
        else current.delete(String(course.MaMG));
        state.selected = [...current];
        await saveState();
        render();
      });

      const main = document.createElement("div");
      main.className = "course-main";
      const title = document.createElement("div");
      title.className = "course-title";
      title.textContent = courseLabel(course);
      const meta = document.createElement("div");
      meta.className = "course-meta";
      const seats = course.SoSVTT || course.SoSVDK
        ? `Đã đăng ký ${course.SoSVDK || "?"}/${course.SoSVTT || "?"}`
        : "Thêm thủ công";
      meta.textContent = `${seats} · ${course.CoTheDKHP ? "Portal cho phép đăng ký" : "Portal chưa cho phép đăng ký"}`;
      main.append(title, meta);

      const id = document.createElement("span");
      id.className = "course-id";
      id.textContent = course.MaMG;
      label.append(checkbox, main, id);
      elements.courseList.append(label);
    }
  };

  const renderResults = () => {
    elements.resultSection.hidden = state.results.length === 0;
    elements.resultList.replaceChildren();

    for (const result of state.results) {
      const item = document.createElement("div");
      item.className = `result-item ${result.type || "unknown"}`;
      const title = document.createElement("div");
      title.className = "result-title";
      title.textContent = result.label || `MaMG ${result.maMG}`;
      const message = document.createElement("div");
      message.className = "result-message";
      message.textContent = result.message;
      item.append(title, message);
      elements.resultList.append(item);
    }
  };

  const render = () => {
    const selected = selectedSet();
    elements.syncMeta.textContent = formatTime(state.lastSyncedAt);
    elements.selectedCount.textContent = `${selected.size} đã chọn`;
    elements.registerButton.disabled = running || selected.size === 0;
    elements.registerButton.textContent = running
      ? "Đang gửi yêu cầu…"
      : `Đăng ký ${selected.size || "các"} lớp đã chọn`;
    elements.syncButton.disabled = running;
    elements.clearButton.disabled = running;
    elements.manualAddButton.disabled = running;
    renderCourses();
    renderResults();
  };

  const syncCourses = async () => {
    elements.syncButton.disabled = true;
    setNotice("Đang đọc danh sách môn từ tab portal…");
    try {
      const result = await sendCommand("loadCourses");
      const manual = state.courses.filter((course) => course.manual);
      const byId = new Map(result.courses.map((course) => [String(course.MaMG), course]));
      for (const course of manual) if (!byId.has(String(course.MaMG))) byId.set(String(course.MaMG), course);
      state.courses = [...byId.values()];
      state.lastSyncedAt = new Date().toISOString();
      state.selected = state.selected.filter((maMG) => byId.has(String(maMG)));
      await saveState();
      setConnection(true);
      setNotice(`Đã lưu ${result.courses.length} lớp. Có thể dùng danh sách này khi giao diện portal bị nghẽn.`, "success");
    } catch (error) {
      setConnection(false);
      setNotice(error.message || String(error), "error");
    } finally {
      render();
    }
  };

  const addManualCourse = async () => {
    const maMG = elements.manualMaMG.value.trim();
    if (!maMG) {
      setNotice("Hãy nhập MaMG trước khi thêm.", "error");
      return;
    }
    if (maMG.length > 64) {
      setNotice("MaMG quá dài.", "error");
      return;
    }

    if (!state.courses.some((course) => String(course.MaMG) === maMG)) {
      state.courses.unshift({
        MaMG: maMG,
        KyHieu: "",
        MaLopHP: "",
        TenMH: "",
        SoSVTT: "",
        SoSVDK: "",
        CoTheDKHP: false,
        manual: true
      });
    }
    if (!state.selected.includes(maMG)) state.selected.push(maMG);
    elements.manualMaMG.value = "";
    await saveState();
    setNotice(`Đã thêm và chọn MaMG ${maMG}.`, "success");
    render();
  };

  const clearData = async () => {
    if (!confirm("Xóa danh sách môn, lựa chọn và kết quả đã lưu?")) return;
    state = { courses: [], selected: [], results: [], lastSyncedAt: null };
    await saveState();
    setNotice("Đã xóa dữ liệu cục bộ.");
    render();
  };

  const registerSelected = async () => {
    const selected = selectedSet();
    const courses = state.courses.filter((course) => selected.has(String(course.MaMG)));
    if (!courses.length || running) return;
    if (!confirm(`Gửi yêu cầu đăng ký cho ${courses.length} lớp đã chọn?`)) return;

    running = true;
    state.results = [];
    render();
    setNotice("Đang gửi các yêu cầu gần đồng thời, cách nhau 150 ms. Đừng đóng popup hoặc tab portal.");

    try {
      await sendCommand("ping");
      setConnection(true);

      state.results = courses.map((course) => ({
        maMG: String(course.MaMG),
        label: courseLabel(course),
        type: "pending",
        message: "Đang chờ gửi yêu cầu…",
        at: null
      }));
      await saveState();
      renderResults();

      let completedCount = 0;
      const requests = courses.map(async (course, index) => {
        if (index > 0) {
          await new Promise((resolve) => setTimeout(resolve, index * REQUEST_STAGGER_MS));
        }

        state.results[index] = {
          ...state.results[index],
          message: "Đã gửi, đang chờ portal phản hồi…"
        };
        renderResults();

        let interpreted;
        try {
          const transport = await sendCommand("registerCourse", { maMG: course.MaMG });
          interpreted = CourseAssistCore.interpretResponse(transport);
        } catch (error) {
          interpreted = { type: "network_error", message: error.message || String(error) };
        }

        state.results[index] = {
          maMG: String(course.MaMG),
          label: courseLabel(course),
          type: interpreted.type,
          message: interpreted.message,
          at: new Date().toISOString()
        };
        completedCount += 1;
        elements.registerButton.textContent = `Đã nhận ${completedCount}/${courses.length} kết quả…`;
        renderResults();
      });

      await Promise.all(requests);
      await saveState();

      const successCount = state.results.filter((result) => result.type === "success").length;
      setNotice(
        successCount
          ? `Hoàn tất: ${successCount}/${courses.length} lớp đăng ký thành công.`
          : "Đã nhận phản hồi cho tất cả yêu cầu. Xem chi tiết bên dưới.",
        successCount ? "success" : "info"
      );
    } catch (error) {
      setConnection(false);
      setNotice(error.message || String(error), "error");
    } finally {
      running = false;
      render();
    }
  };

  const checkConnection = async () => {
    try {
      await sendCommand("ping");
      setConnection(true);
    } catch {
      setConnection(false);
    }
  };

  elements.syncButton.addEventListener("click", syncCourses);
  elements.clearButton.addEventListener("click", clearData);
  elements.manualAddButton.addEventListener("click", addManualCourse);
  elements.manualMaMG.addEventListener("keydown", (event) => {
    if (event.key === "Enter") addManualCourse();
  });
  elements.searchInput.addEventListener("input", renderCourses);
  elements.registerButton.addEventListener("click", registerSelected);
  elements.clearResultsButton.addEventListener("click", async () => {
    state.results = [];
    await saveState();
    renderResults();
  });

  (async () => {
    await loadState();
    render();
    await checkConnection();
  })();
})();
