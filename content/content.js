(() => {
  if (window.__iranRtlLoaded) return;
  window.__iranRtlLoaded = true;

  let isEnabled = false;
  let currentAnimation = "fade";
  let currentShortcut = {
    key: "KeyR",
    display: "Alt + R",
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    metaKey: false
  };

  let observer = null;
  let mutationTimer = null;
  let toastTimer = null;

  const BLOCK_TAGS = new Set([
    "P", "H1", "H2", "H3", "H4", "H5", "H6",
    "LI", "BLOCKQUOTE", "FIGCAPTION", "DT", "DD",
    "TD", "TH", "CAPTION", "LABEL", "SUMMARY", "TEXTAREA"
  ]);

  const CONTAINER_TEXT_TAGS = new Set([
    "DIV", "SPAN", "SECTION", "ARTICLE", "MAIN", "ASIDE"
  ]);

  const SKIP_TAGS = new Set([
    "PRE", "CODE", "KBD", "SAMP", "VAR",
    "SCRIPT", "STYLE", "NOSCRIPT", "SVG", "CANVAS",
    "MATH", "VIDEO", "AUDIO", "IFRAME", "IMG", "BUTTON",
    "SELECT", "OPTION"
  ]);

  const INPUT_TEXT_TYPES = new Set([
    "text", "search", "email", "url", "tel", ""
  ]);

  const ALL_ANIM_CLASSES = [
    "iran-rtl-anim-fade",
    "iran-rtl-anim-glitch",
    "iran-rtl-anim-slide-in",
    "iran-rtl-anim-slide-out",
    "iran-rtl-anim-blur",
    "iran-rtl-anim-wave"
  ];

  // Load saved user preferences
  chrome.storage.sync.get(["animation", "shortcut"], (res) => {
    if (res.animation) currentAnimation = res.animation;
    if (res.shortcut) currentShortcut = res.shortcut;
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    if (changes.animation && changes.animation.newValue) {
      currentAnimation = changes.animation.newValue;
    }
    if (changes.shortcut && changes.shortcut.newValue) {
      currentShortcut = changes.shortcut.newValue;
    }
  });

  function isSkippedElement(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return true;
    if (el.id === "iran-rtl-toast") return true;
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.hasAttribute("data-iran-rtl-ignore")) return true;
    if (
      el.closest(
        "pre, code, kbd, samp, svg, nav, [role='navigation'], [role='menubar'], [role='menu'], .CodeMirror, .monaco-editor, .ace_editor, [data-iran-rtl-ignore]"
      )
    ) {
      return true;
    }
    return false;
  }

  function hasDirectText(el) {
    for (let i = 0; i < el.childNodes.length; i++) {
      const node = el.childNodes[i];
      if (node.nodeType === Node.TEXT_NODE && node.nodeValue.trim().length > 0) {
        return true;
      }
    }
    return false;
  }

  function isLayoutContainer(el) {
    const style = window.getComputedStyle(el);
    if (!style) return false;
    const disp = style.display || "";
    return (
      disp.includes("flex") ||
      disp.includes("grid") ||
      disp === "table" ||
      disp === "inline-table"
    );
  }

  function shouldTargetElement(el) {
    if (isSkippedElement(el)) return false;

    const tag = el.tagName;

    if (tag === "INPUT") {
      const type = (el.getAttribute("type") || "").toLowerCase();
      return INPUT_TEXT_TYPES.has(type);
    }

    if (tag === "TEXTAREA" || el.isContentEditable) {
      return true;
    }

    if (BLOCK_TAGS.has(tag)) {
      if (isLayoutContainer(el)) return false;
      return el.textContent.trim().length > 0;
    }

    if (CONTAINER_TEXT_TAGS.has(tag)) {
      if (isLayoutContainer(el)) return false;
      return hasDirectText(el);
    }

    return false;
  }

  function getAnimClass(direction) {
    if (!currentAnimation || currentAnimation === "none") return null;
    if (currentAnimation === "slide") {
      return direction === "in" ? "iran-rtl-anim-slide-in" : "iran-rtl-anim-slide-out";
    }
    return `iran-rtl-anim-${currentAnimation}`;
  }

  function triggerAnimation(el, direction) {
    const animClass = getAnimClass(direction);
    if (!animClass) return;

    el.classList.remove(...ALL_ANIM_CLASSES);
    // Force reflow so animation restarts cleanly if toggled rapidly
    void el.offsetWidth;
    el.classList.add(animClass);

    const onEnd = () => {
      el.classList.remove(animClass);
      el.removeEventListener("animationend", onEnd);
    };
    el.addEventListener("animationend", onEnd);

    // Fallback cleanup in case animationend doesn't fire
    setTimeout(() => {
      el.classList.remove(animClass);
    }, 550);
  }

  function applyRTL(root = document.body, animate = true) {
    if (!root) return;
    const targets = [];

    if (shouldTargetElement(root)) {
      targets.push(root);
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        if (isSkippedElement(node)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let current = walker.nextNode();
    while (current) {
      if (shouldTargetElement(current)) {
        targets.push(current);
      }
      current = walker.nextNode();
    }

    for (let i = 0; i < targets.length; i++) {
      const el = targets[i];
      if (!el.classList.contains("iran-rtl-block")) {
        el.classList.add("iran-rtl-block");
        if (animate) {
          triggerAnimation(el, "in");
        }
      }
    }
  }

  function removeRTL(animate = true) {
    const applied = document.querySelectorAll(".iran-rtl-block");
    applied.forEach((el) => {
      el.classList.remove("iran-rtl-block");
      if (animate) {
        triggerAnimation(el, "out");
      }
    });
  }

  function startObserver() {
    if (observer || !document.body) return;
    observer = new MutationObserver((mutations) => {
      if (!isEnabled) return;
      if (mutationTimer) return;
      mutationTimer = requestAnimationFrame(() => {
        mutationTimer = null;
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              applyRTL(node, false);
            }
          }
        }
      });
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (mutationTimer) {
      cancelAnimationFrame(mutationTimer);
      mutationTimer = null;
    }
  }

  function showToast(enabled) {
    let toast = document.getElementById("iran-rtl-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "iran-rtl-toast";
      toast.innerHTML = `<span class="iran-rtl-toast-dot"></span><span class="iran-rtl-toast-text"></span>`;
      document.documentElement.appendChild(toast);
    }

    const textEl = toast.querySelector(".iran-rtl-toast-text");
    textEl.textContent = enabled
      ? "IRAN RTL: راست‌چین فعال شد"
      : "IRAN RTL: راست‌چین غیرفعال شد";

    toast.classList.toggle("iran-rtl-toast-off", !enabled);
    toast.classList.add("iran-rtl-toast-visible");

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove("iran-rtl-toast-visible");
    }, 1900);
  }

  function setEnabled(nextState, fromShortcut = false) {
    isEnabled = Boolean(nextState);
    if (isEnabled) {
      applyRTL(document.body, true);
      startObserver();
    } else {
      stopObserver();
      removeRTL(true);
    }

    chrome.runtime.sendMessage({
      type: "IRAN_RTL_STATE_CHANGED",
      enabled: isEnabled
    }).catch(() => {});

    if (fromShortcut) {
      showToast(isEnabled);
    }
  }

  // Listen for custom keyboard shortcut on this page
  window.addEventListener(
    "keydown",
    (e) => {
      if (!currentShortcut || !currentShortcut.key) return;

      // Avoid triggering on plain single keys while typing in an input
      const activeTag = document.activeElement ? document.activeElement.tagName : "";
      const isTyping =
        activeTag === "INPUT" ||
        activeTag === "TEXTAREA" ||
        (document.activeElement && document.activeElement.isContentEditable);

      const hasModifier =
        currentShortcut.altKey ||
        currentShortcut.ctrlKey ||
        currentShortcut.shiftKey ||
        currentShortcut.metaKey;

      if (isTyping && !hasModifier) return;

      if (
        e.code === currentShortcut.key &&
        e.altKey === Boolean(currentShortcut.altKey) &&
        e.ctrlKey === Boolean(currentShortcut.ctrlKey) &&
        e.shiftKey === Boolean(currentShortcut.shiftKey) &&
        e.metaKey === Boolean(currentShortcut.metaKey)
      ) {
        e.preventDefault();
        e.stopPropagation();
        setEnabled(!isEnabled, true);
      }
    },
    true
  );

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "IRAN_RTL_GET_STATE") {
      sendResponse({ enabled: isEnabled });
      return true;
    }

    if (message.type === "IRAN_RTL_SET_STATE") {
      setEnabled(message.enabled, false);
      sendResponse({ enabled: isEnabled });
      return true;
    }

    if (message.type === "IRAN_RTL_TOGGLE") {
      setEnabled(!isEnabled, false);
      sendResponse({ enabled: isEnabled });
      return true;
    }
  });
})();
