// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // Open the welcome onboarding page
    chrome.tabs.create({
      url: chrome.runtime.getURL("welcome.html")
    });

    // Initialize default buttons
    const defaultButtons = [
      {
        id: "btn-" + Date.now() + "-1",
        name: "Git Amend Command",
        notes: "Useful command to quickly amend last git commit without changing the message.",
        text: "git commit --amend --no-edit",
        global: true,
        domains: [],
        position: { x: 80, y: 15 }, // percentage of viewport (left: 80%, top: 15%)
        visible: true
      },
      {
        id: "btn-" + Date.now() + "-2",
        name: "Quick Thanks Email",
        notes: "Professional thanks and acknowledgment template.",
        text: "Thank you for the update. I appreciate your quick response and will look into this as soon as possible.",
        global: true,
        domains: [],
        position: { x: 80, y: 30 }, // percentage of viewport
        visible: true
      },
      {
        id: "btn-" + Date.now() + "-3",
        name: "Brand Purple CSS Hex",
        notes: "Vibrant violet hex code for web styling.",
        text: "#8B5CF6",
        global: true,
        domains: [],
        position: { x: 80, y: 45 }, // percentage of viewport
        visible: true
      }
    ];

    chrome.storage.sync.set({
      buttons: defaultButtons,
      showAllButtons: true
    }, () => {
      console.log("Initialized default buttons.");
    });
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "open_welcome") {
    chrome.tabs.create({
      url: chrome.runtime.getURL("welcome.html")
    });
    sendResponse({ success: true });
  }
  return true;
});
