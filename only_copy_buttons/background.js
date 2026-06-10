// Background worker for Only Copy Buttons Extension

// Command keyboard listener
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-panel") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "toggle-panel" }).catch((err) => {
          console.log("Active page not loaded or incompatible:", err);
        });
      }
    });
  }
});

// Communication relay from popup to tab
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggle-active-tab-panel") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "toggle-panel" })
          .then(() => sendResponse({ success: true }))
          .catch((err) => sendResponse({ success: false, error: err.message }));
      } else {
        sendResponse({ success: false, error: "No active tab" });
      }
    });
    return true; // async reply channel
  }
});
