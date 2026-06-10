(function () {
  // Prevent duplicate injection
  if (document.getElementById("mcb-shadow-host")) return;

  const currentHost = window.location.hostname;

  // 1. Create Shadow Host and shadow root
  const host = document.createElement("div");
  host.id = "mcb-shadow-host";
  host.style.position = "fixed";
  host.style.top = "0";
  host.style.left = "0";
  host.style.width = "100vw";
  host.style.height = "100vh";
  host.style.pointerEvents = "none";
  host.style.zIndex = "2147483647";
  document.body.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: "open" });

  // 2. Inject styles
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL("content.css");
  shadowRoot.appendChild(link);

  // 3. Create main structure
  const container = document.createElement("div");
  container.className = "mcb-extension-container";
  shadowRoot.appendChild(container);

  container.innerHTML = `
    <!-- Dock Handle -->
    <div class="mcb-dock-handle" id="mcb-handle">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-dasharray="" stroke-dashoffset="" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/>
      </svg>
      <span>Snippets</span>
    </div>

    <!-- Slide Dock -->
    <div class="mcb-dock" id="mcb-dock">
      <div class="mcb-dock-header">
        <div class="mcb-dock-title">
          <img src="${chrome.runtime.getURL("icons/icon-48.png")}" alt="Logo">
          <span>Multi Copy Button</span>
        </div>
        <button class="mcb-dock-close" id="mcb-dock-close-btn">✕</button>
      </div>

      <div class="mcb-dock-body">
        <!-- Search -->
        <div class="mcb-search-box">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" class="mcb-search-input" id="mcb-search" placeholder="Search by name or notes...">
        </div>

        <!-- Global controls -->
        <div class="mcb-controls">
          <button class="mcb-btn-secondary" id="mcb-toggle-all-btn">
            <span id="mcb-toggle-icon">👁️</span>
            <span id="mcb-toggle-text">Hide All</span>
          </button>
        </div>

        <!-- List -->
        <div>
          <div class="mcb-list-title">My Snippets</div>
          <div class="mcb-snippets-list" id="mcb-list"></div>
        </div>

        <!-- Inline Creator -->
        <div class="mcb-creator-box">
          <div class="mcb-list-title" style="margin-bottom: 0;">Create Snippet</div>
          <div class="mcb-form-group">
            <label>Name</label>
            <input type="text" class="mcb-input" id="new-name" placeholder="e.g. Git Commit">
          </div>
          <div class="mcb-form-group">
            <label>Snippet Text</label>
            <textarea class="mcb-textarea" id="new-text" rows="2" placeholder="Text to copy..."></textarea>
          </div>
          <div class="mcb-form-group">
            <label>Notes / Tooltip</label>
            <input type="text" class="mcb-input" id="new-notes" placeholder="Optional description...">
          </div>
          <div class="mcb-checkbox-group">
            <input type="checkbox" id="new-global" checked>
            <label for="new-global">Show on all websites</label>
          </div>
          <button class="mcb-btn-primary" id="mcb-create-btn">Create Button</button>
        </div>
      </div>

      <div class="mcb-dock-footer">
        <a href="#" class="mcb-help-link" id="mcb-help-btn">📖 Onboarding & Help Guide</a>
      </div>
    </div>

    <!-- Floating Buttons Wrapper -->
    <div id="mcb-floating-buttons"></div>

    <!-- Modal for Edit -->
    <div class="mcb-modal-overlay" id="mcb-modal-overlay">
      <div class="mcb-modal">
        <h2 style="margin-top: 0;">Edit Snippet</h2>
        <div class="mcb-form-group" style="margin-bottom: 12px;">
          <label>Name</label>
          <input type="text" class="mcb-input" id="edit-name">
        </div>
        <div class="mcb-form-group" style="margin-bottom: 12px;">
          <label>Snippet Text</label>
          <textarea class="mcb-textarea" id="edit-text" rows="3"></textarea>
        </div>
        <div class="mcb-form-group" style="margin-bottom: 12px;">
          <label>Notes</label>
          <input type="text" class="mcb-input" id="edit-notes">
        </div>
        <div class="mcb-checkbox-group" style="margin-bottom: 16px;">
          <input type="checkbox" id="edit-global">
          <label for="edit-global">Show on all websites</label>
        </div>
        <div class="mcb-modal-buttons">
          <button class="mcb-btn-secondary" id="mcb-edit-cancel" style="flex: none;">Cancel</button>
          <button class="mcb-btn-primary" id="mcb-edit-save" style="flex: none;">Save Changes</button>
        </div>
      </div>
    </div>

    <!-- Toast Notification -->
    <div class="mcb-toast" id="mcb-toast">Copied to clipboard!</div>
  `;

  // 4. Element references inside shadow root
  const dockHandle = shadowRoot.getElementById("mcb-handle");
  const dock = shadowRoot.getElementById("mcb-dock");
  const dockCloseBtn = shadowRoot.getElementById("mcb-dock-close-btn");
  const searchInput = shadowRoot.getElementById("mcb-search");
  const toggleAllBtn = shadowRoot.getElementById("mcb-toggle-all-btn");
  const toggleIcon = shadowRoot.getElementById("mcb-toggle-icon");
  const toggleText = shadowRoot.getElementById("mcb-toggle-text");
  const snippetsList = shadowRoot.getElementById("mcb-list");
  
  const newName = shadowRoot.getElementById("new-name");
  const newText = shadowRoot.getElementById("new-text");
  const newNotes = shadowRoot.getElementById("new-notes");
  const newGlobal = shadowRoot.getElementById("new-global");
  const createBtn = shadowRoot.getElementById("mcb-create-btn");
  const helpBtn = shadowRoot.getElementById("mcb-help-btn");

  const floatingButtonsWrapper = shadowRoot.getElementById("mcb-floating-buttons");
  const toast = shadowRoot.getElementById("mcb-toast");

  const editModalOverlay = shadowRoot.getElementById("mcb-modal-overlay");
  const editName = shadowRoot.getElementById("edit-name");
  const editText = shadowRoot.getElementById("edit-text");
  const editNotes = shadowRoot.getElementById("edit-notes");
  const editGlobal = shadowRoot.getElementById("edit-global");
  const editCancel = shadowRoot.getElementById("mcb-edit-cancel");
  const editSave = shadowRoot.getElementById("mcb-edit-save");

  // Local state cache
  let buttons = [];
  let showAllButtons = true;
  let activeEditingButtonId = null;

  // 5. Initial load and event listeners
  loadStateAndRender();

  // Storage listener to sync across tabs and popups
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.buttons || changes.showAllButtons) {
      loadStateAndRender();
    }
  });

  // Dock toggle
  dockHandle.addEventListener("click", () => {
    dock.classList.add("open");
    dockHandle.style.right = "-60px"; // Hide handle when dock open
  });

  dockCloseBtn.addEventListener("click", () => {
    dock.classList.remove("open");
    dockHandle.style.right = "0";
  });

  // Help button link
  helpBtn.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.sendMessage({ action: "open_welcome" }, () => {
      // Fallback if message passing isn't capturing it
      window.open(chrome.runtime.getURL("welcome.html"), "_blank");
    });
  });

  // Hide/Show All Toggle
  toggleAllBtn.addEventListener("click", () => {
    const nextState = !showAllButtons;
    chrome.storage.sync.set({ showAllButtons: nextState });
  });

  // Search filter
  searchInput.addEventListener("input", filterList);

  // Create Button
  createBtn.addEventListener("click", () => {
    const name = newName.value.trim();
    const text = newText.value.trim();
    const notes = newNotes.value.trim();
    const globalVal = newGlobal.checked;

    if (!name || !text) {
      alert("Name and Snippet Text are required!");
      return;
    }

    const newBtn = {
      id: "btn-" + Date.now(),
      name: name,
      text: text,
      notes: notes,
      global: globalVal,
      domains: globalVal ? [] : [currentHost],
      position: { x: 50, y: 50 }, // middle of screen initially
      visible: true
    };

    const updatedButtons = [...buttons, newBtn];
    chrome.storage.sync.set({ buttons: updatedButtons }, () => {
      newName.value = "";
      newText.value = "";
      newNotes.value = "";
      showToast(`Created button "${name}"!`);
    });
  });

  // Modal handlers
  editCancel.addEventListener("click", () => {
    editModalOverlay.classList.remove("open");
    activeEditingButtonId = null;
  });

  editSave.addEventListener("click", () => {
    if (!activeEditingButtonId) return;

    const name = editName.value.trim();
    const text = editText.value.trim();
    const notes = editNotes.value.trim();
    const globalVal = editGlobal.checked;

    if (!name || !text) {
      alert("Name and Snippet Text are required!");
      return;
    }

    const updatedButtons = buttons.map((btn) => {
      if (btn.id === activeEditingButtonId) {
        return {
          ...btn,
          name: name,
          text: text,
          notes: notes,
          global: globalVal,
          // If turning local, make sure it binds to current hostname if no domain listed
          domains: globalVal ? [] : (btn.domains.length > 0 ? btn.domains : [currentHost])
        };
      }
      return btn;
    });

    chrome.storage.sync.set({ buttons: updatedButtons }, () => {
      editModalOverlay.classList.remove("open");
      activeEditingButtonId = null;
      showToast("Changes saved!");
    });
  });

  // 6. Data Fetch & Rendering
  function loadStateAndRender() {
    chrome.storage.sync.get(["buttons", "showAllButtons"], (result) => {
      buttons = result.buttons || [];
      showAllButtons = result.showAllButtons !== false;

      // Update control button text/icon
      if (showAllButtons) {
        toggleIcon.textContent = "👁️";
        toggleText.textContent = "Hide All";
      } else {
        toggleIcon.textContent = "🕶️";
        toggleText.textContent = "Show All";
      }

      renderDockList();
      renderFloatingButtons();
    });
  }

  // Render the snippets list inside the dock
  function renderDockList() {
    snippetsList.innerHTML = "";
    const query = searchInput.value.toLowerCase().trim();

    const filtered = buttons.filter((btn) => {
      const matchesSearch = btn.name.toLowerCase().includes(query) || 
                            btn.notes.toLowerCase().includes(query);
      return matchesSearch;
    });

    if (filtered.length === 0) {
      snippetsList.innerHTML = `<div class="mcb-empty-state">No snippets found.</div>`;
      return;
    }

    filtered.forEach((btn) => {
      const isVisibleOnThisPage = showAllButtons && btn.visible && (btn.global || btn.domains.includes(currentHost));
      
      const item = document.createElement("div");
      item.className = "mcb-item";
      
      item.innerHTML = `
        <div class="mcb-item-info">
          <div class="mcb-item-name">${btn.name}</div>
          <div class="mcb-item-text" title="${btn.text}">${btn.text}</div>
        </div>
        <div class="mcb-item-actions">
          <button class="mcb-item-btn mcb-visibility" title="${isVisibleOnThisPage ? 'Visible on page' : 'Hidden on page'}">
            ${btn.visible ? "👁️" : "🕶️"}
          </button>
          <button class="mcb-item-btn mcb-edit" title="Edit">✏️</button>
          <button class="mcb-item-btn mcb-delete" title="Delete">✕</button>
        </div>
      `;

      // Event Listeners for actions
      const visBtn = item.querySelector(".mcb-visibility");
      const editBtn = item.querySelector(".mcb-edit");
      const delBtn = item.querySelector(".mcb-delete");

      visBtn.addEventListener("click", () => {
        const updatedButtons = buttons.map(b => b.id === btn.id ? { ...b, visible: !b.visible } : b);
        chrome.storage.sync.set({ buttons: updatedButtons });
      });

      editBtn.addEventListener("click", () => {
        openEditModal(btn);
      });

      delBtn.addEventListener("click", () => {
        if (confirm(`Are you sure you want to delete the snippet "${btn.name}"?`)) {
          const updatedButtons = buttons.filter(b => b.id !== btn.id);
          chrome.storage.sync.set({ buttons: updatedButtons });
        }
      });

      snippetsList.appendChild(item);
    });
  }

  function filterList() {
    renderDockList();
  }

  function openEditModal(btn) {
    activeEditingButtonId = btn.id;
    editName.value = btn.name;
    editText.value = btn.text;
    editNotes.value = btn.notes;
    editGlobal.checked = btn.global;

    editModalOverlay.classList.add("open");
  }

  // Render floating buttons on webpage
  function renderFloatingButtons() {
    // Clear existing
    floatingButtonsWrapper.innerHTML = "";

    if (!showAllButtons) return;

    buttons.forEach((btn) => {
      // Visibility rules
      if (!btn.visible) return;
      
      const isGlobal = btn.global;
      const isLocal = btn.domains && btn.domains.includes(currentHost);
      
      if (!isGlobal && !isLocal) return;

      // Create button element
      const btnEl = document.createElement("div");
      btnEl.className = "mcb-float-btn";
      btnEl.style.left = btn.position.x + "%";
      btnEl.style.top = btn.position.y + "%";
      btnEl.setAttribute("data-id", btn.id);

      btnEl.innerHTML = `
        <div class="mcb-drag-handle">
          <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M5 9h14M5 15h14"></path>
          </svg>
        </div>
        <span class="mcb-btn-name">${btn.name}</span>
        
        <div class="mcb-tooltip">
          <strong>${btn.name}</strong>
          ${btn.notes ? `<p>${btn.notes}</p>` : ""}
          <div class="mcb-tooltip-text">${btn.text}</div>
        </div>

        <div class="mcb-float-actions">
          <button class="mcb-float-action-btn mcb-edit" title="Edit">✏️</button>
          <button class="mcb-float-action-btn mcb-close" title="Hide on page">✕</button>
        </div>
      `;

      // Wire events
      setupBtnDragging(btnEl, btnEl.querySelector(".mcb-drag-handle"), btn);
      
      // Copy action on clicking button body (excluding handle & actions)
      btnEl.addEventListener("click", (e) => {
        if (e.target.closest(".mcb-drag-handle") || e.target.closest(".mcb-float-actions")) {
          return;
        }
        copyToClipboard(btn.text, btn.name);
      });

      // Actions inside float button
      btnEl.querySelector(".mcb-edit").addEventListener("click", (e) => {
        e.stopPropagation();
        openEditModal(btn);
      });

      btnEl.querySelector(".mcb-close").addEventListener("click", (e) => {
        e.stopPropagation();
        // Hide button by set visible to false
        const updatedButtons = buttons.map(b => b.id === btn.id ? { ...b, visible: false } : b);
        chrome.storage.sync.set({ buttons: updatedButtons }, () => {
          showToast(`Hid "${btn.name}". You can restore it from the side panel.`);
        });
      });

      floatingButtonsWrapper.appendChild(btnEl);
    });
  }

  // Button dragging mechanism
  function setupBtnDragging(elmnt, dragHandleEl, btnData) {
    let startX = 0, startY = 0;
    let initialX = 0, initialY = 0;
    let isMoving = false;
    let dragThreshold = 5; // Pixels to distinguish click vs drag

    dragHandleEl.addEventListener("mousedown", dragStart);

    function dragStart(e) {
      e.preventDefault();
      
      startX = e.clientX;
      startY = e.clientY;
      
      const rect = elmnt.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;
      
      isMoving = false;

      document.addEventListener("mouseup", dragEnd);
      document.addEventListener("mousemove", dragMove);
    }

    function dragMove(e) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!isMoving && (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold)) {
        isMoving = true;
      }

      if (isMoving) {
        let newX = initialX + dx;
        let newY = initialY + dy;

        // Keep inside screen viewport boundaries
        const rect = elmnt.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;

        if (newX < 0) newX = 0;
        if (newX > maxX) newX = maxX;
        if (newY < 0) newY = 0;
        if (newY > maxY) newY = maxY;

        elmnt.style.left = newX + "px";
        elmnt.style.top = newY + "px";
      }
    }

    function dragEnd() {
      document.removeEventListener("mouseup", dragEnd);
      document.removeEventListener("mousemove", dragMove);

      if (isMoving) {
        // Calculate percentages
        const rect = elmnt.getBoundingClientRect();
        const percentX = (rect.left / window.innerWidth) * 100;
        const percentY = (rect.top / window.innerHeight) * 100;

        // Update in storage
        const updatedButtons = buttons.map((b) => {
          if (b.id === btnData.id) {
            return {
              ...b,
              position: { x: percentX, y: percentY }
            };
          }
          return b;
        });

        chrome.storage.sync.set({ buttons: updatedButtons });
      }
    }
  }

  // Clipboard copies
  function copyToClipboard(text, name) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`Copied ${name}!`);
    }).catch(err => {
      console.error("Failed to copy snippet: ", err);
    });
  }

  // Toasts
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("open");
    setTimeout(() => {
      toast.classList.remove("open");
    }, 2000);
  }
})();
