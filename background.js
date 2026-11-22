const DEFAULT_SETTINGS = {
  animation: "fade",
  shortcut: {
    key: "KeyR",
    display: "Alt + R",
    altKey: true,
    ctrlKey: false,
    shiftKey: false,
    metaKey: false
  }
};

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.sync.get(["animation", "shortcut"]);
  const toSet = {};
  if (!existing.animation) toSet.animation = DEFAULT_SETTINGS.animation;
  if (!existing.shortcut) toSet.shortcut = DEFAULT_SETTINGS.shortcut;
  if (Object.keys(toSet).length > 0) {
    await chrome.storage.sync.set(toSet);
  }
});

// Update extension badge when content script reports state change for its tab
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "IRAN_RTL_STATE_CHANGED" && sender.tab && sender.tab.id) {
    updateBadge(sender.tab.id, message.enabled);
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "IRAN_RTL_UPDATE_BADGE" && message.tabId) {
    updateBadge(message.tabId, message.enabled);
    sendResponse({ ok: true });
    return true;
  }
});

function updateBadge(tabId, enabled) {
  if (enabled) {
    chrome.action.setBadgeText({ tabId, text: "RTL" });
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#0D9488" });
    chrome.action.setBadgeTextColor({ tabId, color: "#FFFFFF" });
  } else {
    chrome.action.setBadgeText({ tabId, text: "" });
  }
}
