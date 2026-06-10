document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const openWelcomeBtn = document.getElementById("open-welcome-btn");
  const searchInput = document.getElementById("popup-search");
  const totalCount = document.getElementById("total-count");
  const globalToggleBtn = document.getElementById("global-toggle");
  const toggleIcon = document.getElementById("toggle-icon");
  const toggleText = document.getElementById("toggle-text");
  const popupList = document.getElementById("popup-list");
  
  const addName = document.getElementById("add-name");
  const addText = document.getElementById("add-text");
  const addBtn = document.getElementById("add-btn");
  const toast = document.getElementById("popup-toast");

  // State
  let buttons = [];
  let showAllButtons = true;

  // Initial load
  loadStateAndRender();

  // Storage listener
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.buttons || changes.showAllButtons) {
      loadStateAndRender();
    }
  });

  // Open welcome page
  openWelcomeBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
  });

  // Search
  searchInput.addEventListener("input", renderList);

  // Global toggle
  globalToggleBtn.addEventListener("click", () => {
    const nextState = !showAllButtons;
    chrome.storage.sync.set({ showAllButtons: nextState });
  });

  // Quick Add
  addBtn.addEventListener("click", () => {
    const name = addName.value.trim();
    const text = addText.value.trim();

    if (!name || !text) {
      alert("Name and snippet Text are required!");
      return;
    }

    const newBtn = {
      id: "btn-" + Date.now(),
      name: name,
      text: text,
      notes: "Quickly added via dashboard popup",
      global: true,
      domains: [],
      position: { x: 80, y: 20 },
      visible: true
    };

    const updatedButtons = [...buttons, newBtn];
    chrome.storage.sync.set({ buttons: updatedButtons }, () => {
      addName.value = "";
      addText.value = "";
      showToast("Snippet added successfully!");
    });
  });

  // Fetch and Render
  function loadStateAndRender() {
    chrome.storage.sync.get(["buttons", "showAllButtons"], (result) => {
      buttons = result.buttons || [];
      showAllButtons = result.showAllButtons !== false;

      totalCount.textContent = buttons.length;

      // Update toggle button UI
      if (showAllButtons) {
        toggleIcon.textContent = "👁️";
        toggleText.textContent = "Hide All";
      } else {
        toggleIcon.textContent = "🕶️";
        toggleText.textContent = "Show All";
      }

      renderList();
    });
  }

  function renderList() {
    popupList.innerHTML = "";
    const query = searchInput.value.toLowerCase().trim();

    const filtered = buttons.filter((btn) => {
      return btn.name.toLowerCase().includes(query) || 
             btn.text.toLowerCase().includes(query) ||
             (btn.notes && btn.notes.toLowerCase().includes(query));
    });

    if (filtered.length === 0) {
      popupList.innerHTML = `<div class="empty-state">No snippets found.</div>`;
      return;
    }

    filtered.forEach((btn) => {
      const item = document.createElement("div");
      item.className = "popup-item";
      item.innerHTML = `
        <div class="popup-item-info">
          <div class="popup-item-name">${btn.name}</div>
          <div class="popup-item-text" title="${btn.text}">${btn.text}</div>
        </div>
        <div class="popup-item-actions">
          <button class="popup-action-btn delete-btn" title="Delete">✕</button>
        </div>
      `;

      // Copy text on clicking item info
      item.querySelector(".popup-item-info").addEventListener("click", () => {
        copyToClipboard(btn.text, btn.name);
      });

      // Delete action
      item.querySelector(".delete-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm(`Delete snippet "${btn.name}"?`)) {
          const updatedButtons = buttons.filter(b => b.id !== btn.id);
          chrome.storage.sync.set({ buttons: updatedButtons });
        }
      });

      popupList.appendChild(item);
    });
  }

  function copyToClipboard(text, name) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(`Copied snippet!`);
      }).catch(err => {
        console.warn("Clipboard API failed in popup, running fallback: ", err);
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      textarea.style.left = "-999999px";
      textarea.style.top = "-999999px";
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (success) {
        showToast("Copied snippet!");
      } else {
        alert("Failed to copy snippet. Please copy manually.");
      }
    } catch (err) {
      console.error("Fallback popup copy failed", err);
    }
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 2000);
  }
});
