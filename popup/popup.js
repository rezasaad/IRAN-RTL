const DEFAULT_SHORTCUT = {
  key: "KeyR",
  display: "Alt + R",
  altKey: true,
  ctrlKey: false,
  shiftKey: false,
  metaKey: false
};

const MODIFIER_CODES = new Set([
  "ControlLeft", "ControlRight",
  "AltLeft", "AltRight",
  "ShiftLeft", "ShiftRight",
  "MetaLeft", "MetaRight"
]);

document.addEventListener("DOMContentLoaded", async () => {
  const toggleInput = document.getElementById("toggle-rtl");
  const statusPill = document.getElementById("status-pill");
  const pageDomain = document.getElementById("page-domain");
  const unsupportedNotice = document.getElementById("unsupported-notice");
  const animButtons = document.querySelectorAll(".anim-btn");
  const shortcutBox = document.getElementById("shortcut-box");
  const shortcutHint = document.getElementById("shortcut-hint");
  const shortcutDisplay = document.getElementById("shortcut-display");
  const resetShortcutBtn = document.getElementById("reset-shortcut");

  let activeTabId = null;
  let isRecording = false;

  function setStatusUI(enabled) {
    toggleInput.checked = enabled;
    statusPill.textContent = enabled ? "فعال" : "غیرفعال";
    statusPill.classList.toggle("active", enabled);
  }

  function setAnimUI(selectedAnim) {
    animButtons.forEach((btn) => {
      btn.classList.toggle("selected", btn.dataset.anim === selectedAnim);
    });
  }

  function showNotice(text) {
    toggleInput.disabled = true;
    unsupportedNotice.textContent = text;
    unsupportedNotice.classList.remove("hidden");
  }

  function formatKeyCode(code) {
    if (code.startsWith("Key")) return code.slice(3);
    if (code.startsWith("Digit")) return code.slice(5);
    if (code.startsWith("Numpad")) return "Num" + code.slice(6);
    if (code === "Space") return "Space";
    if (code === "Backquote") return "`";
    if (code === "BracketLeft") return "[";
    if (code === "BracketRight") return "]";
    if (code === "Semicolon") return ";";
    if (code === "Quote") return "'";
    if (code === "Comma") return ",";
    if (code === "Period") return ".";
    if (code === "Slash") return "/";
    if (code === "Minus") return "-";
    if (code === "Equal") return "=";
    return code;
  }

  async function sendTabMessage(tabId, payload) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, payload, (res) => {
        if (chrome.runtime.lastError || !res) {
          resolve(null);
        } else {
          resolve(res);
        }
      });
    });
  }

  async function ensureContentScriptAndGetState(tabId) {
    const res = await sendTabMessage(tabId, { type: "IRAN_RTL_GET_STATE" });
    if (res) return res;

    // Tab was likely open before extension install/reload — inject on demand
    try {
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ["content/content.css"]
      });
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["content/content.js"]
      });
      return await sendTabMessage(tabId, { type: "IRAN_RTL_GET_STATE" });
    } catch {
      return null;
    }
  }

  // 1. Load saved settings
  const settings = await chrome.storage.sync.get(["animation", "shortcut"]);
  setAnimUI(settings.animation || "fade");
  const savedShortcut = settings.shortcut || DEFAULT_SHORTCUT;
  shortcutDisplay.textContent = savedShortcut.display;

  // 2. Query active tab state
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id) {
    activeTabId = tab.id;
    try {
      const url = new URL(tab.url || "");
      const isWebPage =
        url.protocol === "http:" ||
        url.protocol === "https:" ||
        url.protocol === "file:";

      if (isWebPage) {
        pageDomain.textContent = url.hostname || "فایل محلی";
        const stateRes = await ensureContentScriptAndGetState(activeTabId);
        if (!stateRes) {
          showNotice("مرورگر اجازه اجرای افزونه روی این صفحه را نمی‌دهد.");
        } else {
          setStatusUI(Boolean(stateRes.enabled));
        }
      } else {
        pageDomain.textContent = "صفحه سیستمی";
        showNotice("این صفحه سیستمی است و افزونه روی آن اجرا نمی‌شود.");
      }
    } catch {
      pageDomain.textContent = "صفحه نامشخص";
      showNotice("این صفحه سیستمی است و افزونه روی آن اجرا نمی‌شود.");
    }
  }

  // 3. Toggle RTL on active tab
  toggleInput.addEventListener("change", async () => {
    if (!activeTabId) return;
    const nextState = toggleInput.checked;
    setStatusUI(nextState);
    const res = await sendTabMessage(activeTabId, {
      type: "IRAN_RTL_SET_STATE",
      enabled: nextState
    });
    if (res) {
      setStatusUI(Boolean(res.enabled));
    }
  });

  // 4. Animation selection
  animButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const anim = btn.dataset.anim;
      setAnimUI(anim);
      await chrome.storage.sync.set({ animation: anim });
    });
  });

  // 5. Custom Shortcut Recorder
  function stopRecording() {
    isRecording = false;
    shortcutBox.classList.remove("recording");
    shortcutHint.textContent = "برای تغییر کلیک کنید";
  }

  shortcutBox.addEventListener("click", () => {
    if (isRecording) {
      stopRecording();
      return;
    }
    isRecording = true;
    shortcutBox.classList.add("recording");
    shortcutHint.textContent = "کلیدهای جدید را فشار دهید...";
  });

  window.addEventListener("keydown", async (e) => {
    if (!isRecording) return;
    e.preventDefault();
    e.stopPropagation();

    if (e.code === "Escape") {
      stopRecording();
      return;
    }

    if (MODIFIER_CODES.has(e.code)) {
      return;
    }

    const parts = [];
    if (e.ctrlKey) parts.push("Ctrl");
    if (e.altKey) parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");
    if (e.metaKey) parts.push("Meta");
    parts.push(formatKeyCode(e.code));

    const newShortcut = {
      key: e.code,
      display: parts.join(" + "),
      altKey: e.altKey,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      metaKey: e.metaKey
    };

    shortcutDisplay.textContent = newShortcut.display;
    await chrome.storage.sync.set({ shortcut: newShortcut });
    stopRecording();
  });

  resetShortcutBtn.addEventListener("click", async () => {
    stopRecording();
    shortcutDisplay.textContent = DEFAULT_SHORTCUT.display;
    await chrome.storage.sync.set({ shortcut: DEFAULT_SHORTCUT });
  });
});
