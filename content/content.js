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
    }):ˆ(€€€½‰Í•ÉÙ•È¹½‰Í•ÉÙ”¡‘½Õµ•¹Ð¹‰½‘ä°ì(€€€€€¡¥±‘1¥ÍÐèÑÉÕ”°(€€€€€ÍÕ‰ÑÉ•”èÑÉÕ”(€€€ô¤ì(€ô((€™Õ¹Ñ¥½¸ÍÑ½Á=‰Í•ÉÙ•È ¤ì(€€€¥˜€¡½‰Í•ÉÙ•È¤ì(€€€€€½‰Í•ÉÙ•È¹‘¥Í½¹¹•Ð ¤ì(€€€€€½‰Í•ÉÙ•È€ô¹Õ±°ì(€€€ô(€€€¥˜€¡µÕÑ…Ñ¥½¹Q¥µ•È¤ì(€€€€€…¹•±¹¥µ…Ñ¥½¹É…µ”¡µÕÑ…Ñ¥½¹Q¥µ•È¤ì(€€€€€µÕÑ…Ñ¥½¹Q¥µ•È€ô¹Õ±°ì(€€€ô(€ô((€™Õ¹Ñ¥½¸Í¡½ÝQ½…ÍÐ¡•¹…‰±•¤ì(€€€±•ÐÑ½…ÍÐ€ô‘½Õµ•¹Ð¹•Ñ±•µ•¹Ñ	å% ‰¥É…¸µÉÑ°µÑ½…ÍÐˆ¤ì(€€€¥˜€ …Ñ½…ÍÐ¤ì(€€€€€Ñ½…ÍÐ€ô‘½Õµ•¹Ð¹É•…Ñ•±•µ•¹Ð ‰‘¥Øˆ¤ì(€€€€€Ñ½…ÍÐ¹¥€ô€‰¥É…¸µÉÑ°µÑ½…ÍÐˆì(€€€€€Ñ½…ÍÐ¹¥¹¹•É!Q50€ô€ñÍÁ…¸±…ÍÌô‰¥É…¸µÉÑ°µÑ½…ÍÐµ‘½Ðˆøð½ÍÁ…¸øñÍÁ…¸±…ÍÌô‰¥É…¸µÉÑ°µÑ½…ÍÐµÑ•áÐˆøð½ÍÁ…¸ù€ì(€€€€€‘½Õµ•¹Ð¹‘½Õµ•¹Ñ±•µ•¹Ð¹…ÁÁ•¹‘¡¥±¡Ñ½…ÍÐ¤ì(€€€ô((€€€½¹ÍÐÑ•áÑ°€ôÑ½…ÍÐ¹ÅÕ•ÉåM•±•Ñ½È ˆ¹¥É…¸µÉÑ°µÑ½…ÍÐµÑ•áÐˆ¤ì(€€€Ñ•áÑ°¹Ñ•áÑ½¹Ñ•¹Ð€ô•¹…‰±•(€€€€€€ü€‰%I8IQ0èƒbÇbŸbÏb«Š3jn3fƒfbçbŸfƒbÓb¼ˆ(€€€€€€è€‰%I8IQ0èƒbÇbŸbÏb«Š3jn3fƒbën3bÇfbçbŸfƒbÓb¼ˆì((€€€Ñ½…ÍÐ¹±…ÍÍ1¥ÍÐ¹Ñ½±” ‰¥É…¸µÉÑ°µÑ½…ÍÐµ½™˜ˆ°€…•¹…‰±•¤ì(€€€Ñ½…ÍÐ¹±…ÍÍ1¥ÍÐ¹…‘ ‰¥É…¸µÉÑ°µÑ½…ÍÐµÙ¥Í¥‰±”ˆ¤ì((€€€¥˜€¡Ñ½…ÍÑQ¥µ•È¤±•…ÉQ¥µ•½ÕÐ¡Ñ½…ÍÑQ¥µ•È¤ì(€€€Ñ½…ÍÑQ¥µ•È€ôÍ•ÑQ¥µ•½ÕÐ  ¤€ôøì(€€€€€Ñ½…ÍÐ¹±…ÍÍ1¥ÍÐ¹É•µ½Ù” ‰¥É…¸µÉÑ°µÑ½…ÍÐµÙ¥Í¥‰±”ˆ¤ì(€€€ô°€ÄäÀÀ¤ì(€ô((€™Õ¹Ñ¥½¸Í•Ñ¹…‰±•¡¹•áÑMÑ…Ñ”°™É½µM¡½ÉÑÕÐ€ô™…±Í”¤ì(€€€¥Í¹…‰±•€ô	½½±•…¸¡¹•áÑMÑ…Ñ”¤ì(€€€¥˜€¡¥Í¹…‰±•¤ì(€€€€€…ÁÁ±åIQ0¡‘½Õµ•¹Ð¹‰½‘ä°ÑÉÕ”¤ì(€€€€€ÍÑ…ÉÑ=‰Í•ÉÙ•È ¤ì(€€€ô•±Í”ì(€€€€€ÍÑ½Á=‰Í•ÉÙ•È ¤ì(€€€€€É•µ½Ù•IQ0¡ÑÉÕ”¤ì(€€€ô((€€€¡É½µ”¹ÉÕ¹Ñ¥µ”¹Í•¹‘5•ÍÍ…”¡ì(€€€€€ÑåÁ”è€‰%I9}IQ1}MQQ}!9ˆ°(€€€€€•¹…‰±•è¥Í¹…‰±•(€€€ô¤¹…Ñ   ¤€ôøíô¤ì((€€€¥˜€¡™É½µM¡½ÉÑÕÐ¤ì(€€€€€Í¡½ÝQ½…ÍÐ¡¥Í¹…‰±•¤ì(€€€ô(€ô((€€¼¼1¥ÍÑ•¸™½ÈÕÍÑ½´­•å‰½…ÉÍ¡½ÉÑÕÐ½¸Ñ¡¥ÌÁ…”(€Ý¥¹‘½Ü¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È (€€€€‰­•å‘½Ý¸ˆ°(€€€€¡”¤€ôøì(€€€€€¥˜€ …ÕÉÉ•¹ÑM¡½ÉÑÕÐñð€…ÕÉÉ•¹ÑM¡½ÉÑÕÐ¹­•ä¤É•ÑÕÉ¸ì((€€€€€€¼¼Ù½¥ÑÉ¥•É¥¹œ½¸Á±…¥¸Í¥¹±”­•åÌÝ¡¥±”ÑåÁ¥¹œ¥¸…¸¥¹ÁÕÐ(€€€€€½¹ÍÐ…Ñ¥Ù•Q…œ€ô‘½Õµ•¹Ð¹…Ñ¥Ù•±•µ•¹Ð€ü‘½Õµ•¹Ð¹…Ñ¥Ù•±•µ•¹Ð¹Ñ…9…µ”€è€ˆˆì(€€€€€½¹ÍÐ¥ÍQåÁ¥¹œ€ô(€€€€€€€…Ñ¥Ù•Q…œ€ôôô€‰%9AUPˆñð(€€€€€€€…Ñ¥Ù•Q…œ€ôôô€‰QaQIˆñð(€€€€€€€€¡‘½Õµ•¹Ð¹…Ñ¥Ù•±•µ•¹Ð€˜˜‘½Õµ•¹Ð¹…Ñ¥Ù•±•µ•¹Ð¹¥Í½¹Ñ•¹Ñ‘¥Ñ…‰±”¤ì((€€€€€½¹ÍÐ¡…Í5½‘¥™¥•È€ô(€€€€€€€ÕÉÉ•¹ÑM¡½ÉÑÕÐ¹…±Ñ-•äñð(€€€€€€€ÕÉÉ•¹ÑM¡½ÉÑÕÐ¹ÑÉ±-•äñð(€€€€€€€ÕÉÉ•¹ÑM¡½ÉÑÕÐ¹Í¡¥™Ñ-•äñð(€€€€€€€ÕÉÉ•¹ÑM¡½ÉÑÕÐ¹µ•Ñ…-•äì((€€€€€¥˜€¡¥ÍQåÁ¥¹œ€˜˜€…¡…Í5½‘¥™¥•È¤É•ÑÕÉ¸ì((€€€€€¥˜€ (€€€€€€€”¹½‘”€ôôôÕÉÉ•¹ÑM¡½ÉÑÕÐ¹­•ä€˜˜(€€€€€€€”¹…±Ñ-•ä€ôôô	½½±•…¸¡ÕÉÉ•¹ÑM¡½ÉÑÕÐ¹…±Ñ-•ä¤€˜˜(€€€€€€€”¹ÑÉ±-•ä€ôôô	½½±•…¸¡ÕÉÉ•¹ÑM¡½ÉÑÕÐ¹ÑÉ±-•ä¤€˜˜(€€€€€€€”¹Í¡¥™Ñ-•ä€ôôô	½½±•…¸¡ÕÉÉ•¹ÑM¡½ÉÑÕÐ¹Í¡¥™Ñ-•ä¤€˜˜(€€€€€€€”¹µ•Ñ…-•ä€ôôô	½½±•…¸¡ÕÉÉ•¹ÑM¡½ÉÑÕÐ¹µ•Ñ…-•ä¤(€€€€€€¤ì(€€€€€€€”¹ÁÉ•Ù•¹Ñ•™…Õ±Ð ¤ì(€€€€€€€”¹ÍÑ½ÁAÉ½Á……Ñ¥½¸ ¤ì(€€€€€€€Í•Ñ¹…‰±• …¥Í¹…‰±•°ÑÉÕ”¤ì(€€€€€ô(€€€ô°(€€€ÑÉÕ”(€€¤ì((€€¼¼1¥ÍÑ•¸™½Èµ•ÍÍ…•Ì™É½´Á½ÁÕÀ(€¡É½µ”¹ÉÕ¹Ñ¥µ”¹½¹5•ÍÍ…”¹…‘‘1¥ÍÑ•¹•È ¡µ•ÍÍ…”°Í•¹‘•È°Í•¹‘I•ÍÁ½¹Í”¤€ôøì(€€€¥˜€¡µ•ÍÍ…”¹ÑåÁ”€ôôô€‰%I9}IQ1}Q}MQQˆ¤ì(€€€€€Í•¹‘I•ÍÁ½¹Í”¡ì•¹…‰±•è¥Í¹…‰±•ô¤ì(€€€€€É•ÑÕÉ¸ÑÉÕ”ì(€€€ô((€€€¥˜€¡µ•ÍÍ…”¹ÑåÁ”€ôôô€‰%I9}IQ1}MQ}MQQˆ¤ì(€€€€€Í•Ñ¹…‰±•¡µ•ÍÍ…”¹•¹…‰±•°™…±Í”¤ì(€€€€€Í•¹‘I•ÍÁ½¹Í”¡ì•¹…‰±•è¥Í¹…‰±•ô¤ì(€€€€€É•ÑÕÉ¸ÑÉÕ”ì(€€€ô((€€€¥˜€¡µ•ÍÍ…”¹ÑåÁ”€ôôô€‰%I9}IQ1}Q=1ˆ¤ì(€€€€€Í•Ñ¹…‰±• …¥Í¹…‰±•°™…±Í”¤ì(€€€€€Í•¹‘I•ÍÁ½¹Í”¡ì•¹…‰±•è¥Í¹…‰±•ô¤ì(€€€€€É•ÑÕÉ¸ÑÉÕ”ì(€€€ô(€ô¤ì)ô¤ ¤ì(