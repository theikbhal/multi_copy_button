// Background script for Outreach CRM & Multi-Copy Extension

// Listen for keyboard commands
chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-panel") {
    // Send a message to the active tab to toggle the CRM panel
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "toggle-panel" }).catch((err) => {
          console.log("Could not send command message to content script (is it a system page or not loaded yet?):", err);
        });
      }
    });
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggle-active-tab-panel") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "toggle-panel" })
          .then(() => sendResponse({ success: true }))
          .catch((err) => sendResponse({ success: false, error: err.message }));
      } else {
        sendResponse({ success: false, error: "No active tab found" });
      }
    });
    return true; // Keep message channel open for async response
  }
});
