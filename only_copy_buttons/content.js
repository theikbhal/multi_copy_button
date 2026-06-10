// content.js for Only Copy Buttons Extension

(function() {
  if (document.getElementById("only-copy-buttons-root")) {
    return;
  }

  // --- STATE ---
  let state = {
    snippets: [],
    settings: { onboardingCompleted: false },
    panel: { x: 50, y: 50, visible: true, minimized: false }
  };

  const defaultSnippets = [
    {
      id: "snip-def-1",
      name: "Greeting Pitch",
      notes: "Initial outreach greetings template",
      copyText: "Hey! Hope you are doing well. I came across your page and loved your content. I was wondering if you'd be open to checking out a project I'm working on?",
      visible: false,
      position: { x: 100, y: 100 }
    },
    {
      id: "snip-def-2",
      name: "Meeting Scheduler",
      notes: "Quick Calendly booking snippet",
      copyText: "Awesome, let's connect! You can book a time that works best for you here: calendly.com/your-profile. Looking forward to our chat!",
      visible: false,
      position: { x: 120, y: 150 }
    }
  ];

  // --- DOM INJECTION (SHADOW DOM) ---
  const shadowHost = document.createElement("div");
  shadowHost.id = "only-copy-buttons-root";
  document.body.appendChild(shadowHost);
  const shadowRoot = shadowHost.attachShadow({ mode: "open" });

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL("content.css");
  shadowRoot.appendChild(link);

  const appContainer = document.createElement("div");
  appContainer.className = "copy-theme-container";
  shadowRoot.appendChild(appContainer);

  let searchQuery = "";
  let editingSnippetId = null;

  // --- STORAGE & SYNC ---
  function loadState(callback) {
    chrome.storage.local.get(["snippets", "settings", "panel"], (res) => {
      state.snippets = res.snippets || defaultSnippets;
      state.settings = res.settings || { onboardingCompleted: false };
      state.panel = res.panel || { x: 50, y: 50, visible: true, minimized: false };
      
      if (!res.snippets) {
        chrome.storage.local.set({
          snippets: state.snippets,
          settings: state.settings,
          panel: state.panel
        });
      }
      if (callback) callback();
    });
  }

  function saveState() {
    chrome.storage.local.set({
      snippets: state.snippets,
      settings: state.settings,
      panel: state.panel
    });
  }

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local") {
      let shouldRender = false;
      if (changes.snippets) {
        state.snippets = changes.snippets.newValue || [];
        shouldRender = true;
      }
      if (changes.settings) {
        state.settings = changes.settings.newValue || { onboardingCompleted: false };
        shouldRender = true;
      }
      if (changes.panel) {
        state.panel = changes.panel.newValue || state.panel;
        shouldRender = true;
      }
      if (shouldRender) {
        render();
      }
    }
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggle-panel") {
      state.panel.visible = !state.panel.visible;
      saveState();
      render();
      sendResponse({ success: true, visible: state.panel.visible });
    } else if (request.action === "sync-storage-data") {
      loadState(render);
      sendResponse({ success: true });
    }
  });

  // --- COPY LOGIC ---
  function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand("copy");
        document.body.removeChild(textarea);
        return Promise.resolve();
      } catch (err) {
        document.body.removeChild(textarea);
        return Promise.reject(err);
      }
    }
  }

  // --- DRAG PHYSICS ---
  function makeElementDraggable(element, dragHandle, onDragEnd) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    dragHandle.addEventListener("mousedown", dragMouseDown);
    
    function dragMouseDown(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "BUTTON") {
        return;
      }
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.addEventListener("mouseup", closeDragElement);
      document.addEventListener("mousemove", elementDrag);
    }
    
    function elementDrag(e) {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      
      let newTop = element.offsetTop - pos2;
      let newLeft = element.offsetLeft - pos1;
      
      newTop = Math.max(0, Math.min(window.innerHeight - element.offsetHeight, newTop));
      newLeft = Math.max(0, Math.min(window.innerWidth - element.offsetWidth, newLeft));
      
      element.style.top = newTop + "px";
      element.style.left = newLeft + "px";
    }
    
    function closeDragElement() {
      document.removeEventListener("mouseup", closeDragElement);
      document.removeEventListener("mousemove", elementDrag);
      if (onDragEnd) {
        onDragEnd(element.offsetLeft, element.offsetTop);
      }
    }

    // Mobile/Touch Support
    dragHandle.addEventListener("touchstart", dragTouchStart, { passive: false });
    
    function dragTouchStart(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "BUTTON") {
        return;
      }
      const touch = e.touches[0];
      pos3 = touch.clientX;
      pos4 = touch.clientY;
      document.addEventListener("touchend", closeTouchDrag);
      document.addEventListener("touchmove", touchDrag, { passive: false });
    }

    function touchDrag(e) {
      const touch = e.touches[0];
      pos1 = pos3 - touch.clientX;
      pos2 = pos4 - touch.clientY;
      pos3 = touch.clientX;
      pos4 = touch.clientY;
      
      let newTop = element.offsetTop - pos2;
      let newLeft = element.offsetLeft - pos1;
      
      newTop = Math.max(0, Math.min(window.innerHeight - element.offsetHeight, newTop));
      newLeft = Math.max(0, Math.min(window.innerWidth - element.offsetWidth, newLeft));
      
      element.style.top = newTop + "px";
      element.style.left = newLeft + "px";
    }

    function closeTouchDrag() {
      document.removeEventListener("touchend", closeTouchDrag);
      document.removeEventListener("touchmove", touchDrag);
      if (onDragEnd) {
        onDragEnd(element.offsetLeft, element.offsetTop);
      }
    }
  }

  // --- SVG ICONS ---
  const SVG_ICONS = {
    logo: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="6" fill="url(#grad2)"/><defs><linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#8B5CF6"/><stop offset="100%" stop-color="#6366F1"/></linearGradient></defs><rect x="6" y="8" width="7" height="8" rx="1.5" fill="rgba(255,255,255,0.25)" stroke="white" stroke-width="1.2"/><rect x="10" y="10" width="7" height="8" rx="1.5" fill="white" stroke="#8B5CF6" stroke-width="1.2"/><circle cx="16" cy="7" r="2" fill="#06B6D4" stroke="white" stroke-width="0.8"/></svg>`,
    search: `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>`,
    close: `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>`,
    minimize: `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15"></path></svg>`,
    float: `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>`,
    trash: `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"></path></svg>`,
    edit: `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"></path></svg>`,
    check: `<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"></path></svg>`
  };

  // --- MAIN RENDER ---
  function render() {
    // 1. Floating Action Button (FAB)
    let fab = appContainer.querySelector(".copy-fab");
    if (!fab) {
      fab = document.createElement("div");
      fab.className = "copy-fab hidden";
      fab.innerHTML = SVG_ICONS.logo;
      appContainer.appendChild(fab);
      fab.addEventListener("click", () => {
        state.panel.visible = true;
        saveState();
        render();
      });
    }

    if (!state.panel.visible) {
      fab.classList.remove("hidden");
    } else {
      fab.classList.add("hidden");
    }

    // 2. Control Dashboard
    let dashboard = appContainer.querySelector(".copy-dashboard");
    if (!dashboard) {
      dashboard = document.createElement("div");
      dashboard.className = "copy-dashboard";
      appContainer.appendChild(dashboard);
    }

    if (state.panel.visible) {
      dashboard.classList.remove("hidden");
    } else {
      dashboard.classList.add("hidden");
    }

    dashboard.style.left = state.panel.x + "px";
    dashboard.style.top = state.panel.y + "px";

    if (state.panel.minimized) {
      dashboard.classList.add("minimized");
      dashboard.innerHTML = `
        <div class="copy-header" style="height:100%; border:none; padding: 10px 16px;">
          <div class="copy-logo-title">
            <div class="copy-logo-dot"></div>
            <span class="copy-title">Copy Dashboard</span>
          </div>
          <button class="copy-action-btn maximize-btn" title="Expand Dashboard">
            <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5"/></svg>
          </button>
        </div>
      `;
      const dragHeader = dashboard.querySelector(".copy-header");
      makeElementDraggable(dashboard, dragHeader, (x, y) => {
        state.panel.x = x;
        state.panel.y = y;
        saveState();
      });

      dashboard.querySelector(".maximize-btn").addEventListener("click", () => {
        state.panel.minimized = false;
        saveState();
        render();
      });

      renderFloatingPills();
      renderOnboarding();
      return;
    } else {
      dashboard.classList.remove("minimized");
    }

    dashboard.innerHTML = `
      <div class="copy-header">
        <div class="copy-logo-title">
          <div class="copy-logo-dot"></div>
          <span class="copy-title">Only Copy Buttons</span>
        </div>
        <div class="copy-header-actions">
          <button class="copy-action-btn minimize-btn" title="Minimize Panel">${SVG_ICONS.minimize}</button>
          <button class="copy-action-btn close copy-close-btn" title="Hide Panel">${SVG_ICONS.close}</button>
        </div>
      </div>

      <div class="copy-body">
        <!-- Search bar -->
        <div class="search-row">
          <input type="text" id="buttons-search" class="search-input" placeholder="Search saved buttons..." value="${searchQuery}">
        </div>

        <!-- Add Button Form -->
        <div class="snippet-form">
          <span class="form-title">Create Copy Button</span>
          <div class="form-row">
            <div class="form-group" style="flex:1;">
              <label>Button Name</label>
              <input type="text" id="btn-name-input" class="form-input" placeholder="e.g. Email signature">
            </div>
            <div class="form-group" style="flex:1;">
              <label>Short Notes</label>
              <input type="text" id="btn-notes-input" class="form-input" placeholder="e.g. general use">
            </div>
          </div>
          <div class="form-group">
            <label>Text to be Copied</label>
            <textarea id="btn-text-input" class="form-input form-textarea" placeholder="Enter text to copy on click..."></textarea>
          </div>
          <button id="btn-add-action" class="btn-submit">Add Copy Button</button>
        </div>

        <!-- Scrollable List -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2px;">
          <span class="form-title">Your Copy Buttons</span>
          ${state.snippets.length > 0 ? `<button id="btn-clear-all" class="btn-card delete-action" style="padding: 2px 6px;">Clear All</button>` : ''}
        </div>
        <div class="snippets-list">
          ${renderSnippetsListHTML()}
        </div>
      </div>
    `;

    // Draggable
    const dragHeader = dashboard.querySelector(".copy-header");
    makeElementDraggable(dashboard, dragHeader, (x, y) => {
      state.panel.x = x;
      state.panel.y = y;
      saveState();
    });

    dashboard.querySelector(".minimize-btn").addEventListener("click", () => {
      state.panel.minimized = true;
      saveState();
      render();
    });

    dashboard.querySelector(".copy-close-btn").addEventListener("click", () => {
      state.panel.visible = false;
      saveState();
      render();
    });

    setupDashboardEventListeners(dashboard);
    renderFloatingPills();
    renderOnboarding();
  }

  // --- RENDER SNIPPETS CARD ITEMS ---
  function renderSnippetsListHTML() {
    const filtered = state.snippets.filter(snip => {
      return snip.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             (snip.notes && snip.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    });

    if (filtered.length === 0) {
      return `<div style="text-align: center; color: var(--text-secondary); padding: 30px 10px;">No copy buttons match.</div>`;
    }

    let cardsHTML = "";
    filtered.forEach(snip => {
      const isEditing = editingSnippetId === snip.id;

      if (isEditing) {
        cardsHTML += `
          <div class="snippet-card editing" data-id="${snip.id}">
            <div class="edit-form-inputs">
              <div class="form-row">
                <input type="text" class="form-input edit-name" value="${escapeHTML(snip.name)}" placeholder="Button Name" style="flex:1;">
                <input type="text" class="form-input edit-notes" value="${escapeHTML(snip.notes || '')}" placeholder="Short Notes" style="flex:1;">
              </div>
              <textarea class="form-input edit-text form-textarea" placeholder="Text to copy...">${escapeHTML(snip.copyText)}</textarea>
              <div class="card-actions">
                <button class="btn-card save-edit-btn" data-id="${snip.id}">${SVG_ICONS.check} Save</button>
                <button class="btn-card cancel-edit-btn">Cancel</button>
              </div>
            </div>
          </div>
        `;
      } else {
        cardsHTML += `
          <div class="snippet-card" data-id="${snip.id}">
            <div class="card-header">
              <div class="card-title-area">
                <span class="card-name">${escapeHTML(snip.name)}</span>
                <div class="card-notes">${escapeHTML(snip.notes || "No notes")}</div>
              </div>
              <button class="btn-card float-action btn-float-toggle" data-id="${snip.id}" title="${snip.visible ? "Return to list" : "Float on page"}">
                ${SVG_ICONS.float} <span>${snip.visible ? "Dock" : "Float"}</span>
              </button>
            </div>
            <div class="card-body">${escapeHTML(snip.copyText)}</div>
            <div class="card-actions">
              <button class="btn-card btn-edit-snippet" data-id="${snip.id}">${SVG_ICONS.edit} Edit</button>
              <button class="btn-card delete-action btn-delete-snippet" data-id="${snip.id}">${SVG_ICONS.trash} Delete</button>
            </div>
          </div>
        `;
      }
    });

    return cardsHTML;
  }

  function setupDashboardEventListeners(dashboard) {
    // 1. Search Bar
    const searchInput = dashboard.querySelector("#buttons-search");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        const listDiv = dashboard.querySelector(".snippets-list");
        listDiv.innerHTML = renderSnippetsListHTML();
        setupDashboardEventListeners(dashboard);
      });
      searchInput.focus();
      searchInput.setSelectionRange(searchQuery.length, searchQuery.length);
    }

    // 2. Add Button Action
    const btnAdd = dashboard.querySelector("#btn-add-action");
    if (btnAdd) {
      btnAdd.addEventListener("click", () => {
        const nameInput = dashboard.querySelector("#btn-name-input");
        const notesInput = dashboard.querySelector("#btn-notes-input");
        const textInput = dashboard.querySelector("#btn-text-input");

        const name = nameInput.value.trim();
        const notes = notesInput.value.trim();
        const copyText = textInput.value.trim();

        if (!name || !copyText) {
          alert("Button Name and Copy Text are required!");
          return;
        }

        const newSnip = {
          id: "snip-" + Date.now(),
          name,
          notes,
          copyText,
          visible: false,
          position: { x: window.innerWidth / 2 - 50, y: window.innerHeight / 2 - 15 }
        };

        state.snippets.push(newSnip);
        saveState();
        render();
      });
    }

    // 3. Float button toggles
    const floatBtns = dashboard.querySelectorAll(".btn-float-toggle");
    floatBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const snipId = btn.getAttribute("data-id");
        const snip = state.snippets.find(s => s.id === snipId);
        if (snip) {
          snip.visible = !snip.visible;
          if (!snip.position) {
            snip.position = { x: window.innerWidth / 2 - 60, y: window.innerHeight / 2 - 15 };
          }
          saveState();
          render();
        }
      });
    });

    // 4. Delete button
    const deleteBtns = dashboard.querySelectorAll(".btn-delete-snippet");
    deleteBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const snipId = btn.getAttribute("data-id");
        if (confirm("Delete this copy button?")) {
          state.snippets = state.snippets.filter(s => s.id !== snipId);
          saveState();
          render();
        }
      });
    });

    // Clear All button
    const btnClearAll = dashboard.querySelector("#btn-clear-all");
    if (btnClearAll) {
      btnClearAll.addEventListener("click", () => {
        if (confirm("Are you sure you want to delete all copy buttons? This cannot be undone.")) {
          state.snippets = [];
          saveState();
          render();
        }
      });
    }

    // 5. Edit mode triggers
    const editBtns = dashboard.querySelectorAll(".btn-edit-snippet");
    editBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        editingSnippetId = btn.getAttribute("data-id");
        render();
      });
    });

    // Save edited snippet
    const saveEditBtn = dashboard.querySelector(".save-edit-btn");
    if (saveEditBtn) {
      saveEditBtn.addEventListener("click", () => {
        const id = saveEditBtn.getAttribute("data-id");
        const card = dashboard.querySelector(`.snippet-card[data-id="${id}"]`);
        
        const newName = card.querySelector(".edit-name").value.trim();
        const newNotes = card.querySelector(".edit-notes").value.trim();
        const newText = card.querySelector(".edit-text").value.trim();

        if (!newName || !newText) {
          alert("Name and Copy Text cannot be empty.");
          return;
        }

        const snip = state.snippets.find(s => s.id === id);
        if (snip) {
          snip.name = newName;
          snip.notes = newNotes;
          snip.copyText = newText;
          editingSnippetId = null;
          saveState();
          render();
        }
      });
    }

    // Cancel edit
    const cancelEditBtn = dashboard.querySelector(".cancel-edit-btn");
    if (cancelEditBtn) {
      cancelEditBtn.addEventListener("click", () => {
        editingSnippetId = null;
        render();
      });
    }
  }

  // --- FLOATING COPY PILLS INJECTION ---
  function renderFloatingPills() {
    const existingPills = appContainer.querySelectorAll(".floating-copy-pill");
    const activePillIds = new Set();

    state.snippets.forEach(snip => {
      if (!snip.visible) return;
      activePillIds.add(snip.id);

      let pill = appContainer.querySelector(`.floating-copy-pill[data-id="${snip.id}"]`);
      if (!pill) {
        pill = document.createElement("div");
        pill.className = "floating-copy-pill";
        pill.setAttribute("data-id", snip.id);
        
        pill.innerHTML = `
          <div class="pill-drag-handle" title="Drag to reposition">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle>
              <circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="19" r="1"></circle>
            </svg>
          </div>
          <span class="pill-label">${escapeHTML(snip.name)}</span>
          <button class="pill-close-btn" title="Dock Button">×</button>
        `;
        appContainer.appendChild(pill);

        // Make draggable
        const dragHandle = pill.querySelector(".pill-drag-handle");
        makeElementDraggable(pill, dragHandle, (x, y) => {
          const s = state.snippets.find(item => item.id === snip.id);
          if (s) {
            s.position = { x, y };
            saveState();
          }
        });

        // Click to copy
        pill.addEventListener("click", (e) => {
          if (e.target.closest(".pill-drag-handle") || e.target.closest(".pill-close-btn")) {
            return;
          }

          copyTextToClipboard(snip.copyText)
            .then(() => {
              pill.classList.add("copied");
              const label = pill.querySelector(".pill-label");
              const originalText = label.textContent;
              label.textContent = "Copied!";
              setTimeout(() => {
                pill.classList.remove("copied");
                label.textContent = originalText;
              }, 900);
            })
            .catch(err => {
              console.error("Clipboard copy failed:", err);
            });
        });

        // Close/Dock action click
        pill.querySelector(".pill-close-btn").addEventListener("click", (e) => {
          e.stopPropagation();
          const s = state.snippets.find(item => item.id === snip.id);
          if (s) {
            s.visible = false;
            saveState();
            render();
          }
        });
      }

      pill.setAttribute("data-tooltip", snip.notes || "Click to copy text");

      if (snip.position) {
        pill.style.left = snip.position.x + "px";
        pill.style.top = snip.position.y + "px";
      }
    });

    // Remove inactive pills
    existingPills.forEach(pill => {
      const id = pill.getAttribute("data-id");
      if (!activePillIds.has(id)) {
        pill.remove();
      }
    });
  }

  // --- INTERACTIVE ONBOARDING WALKTHROUGH ---
  let onboardingStep = 0;
  const onboardingSteps = [
    {
      title: "👋 Only Copy Buttons!",
      text: "Create multiple floating copy buttons on any webpage. Clicking a button immediately copies its configured text to your clipboard.",
    },
    {
      title: "📝 Create & Configure",
      text: "Type in a Name (e.g. 'Email Signature'), Short Notes (e.g. 'Business'), and the Copy Text. Click 'Add Copy Button' to save it.",
    },
    {
      title: "📍 Float Draggable Pills",
      text: "Click 'Float' on any saved card. A floating pill capsule will appear. Grab its handle (⋮⋮) to drag it next to your message textareas.",
    },
    {
      title: "⚡ One-Click Copying",
      text: "Just click the floating pill directly! It flashes green ('Copied!') and copies the snippet. Paste with Cmd+V or Ctrl+V.",
    },
    {
      title: "💾 Export & Restores",
      text: "Click the extension icon in your browser toolbar to download a JSON file of all your copy buttons or import backups!"
    }
  ];

  function renderOnboarding() {
    let overlay = appContainer.querySelector(".onboarding-backdrop");
    
    if (state.settings.onboardingCompleted || !state.panel.visible || state.panel.minimized) {
      if (overlay) overlay.remove();
      return;
    }

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "onboarding-backdrop";
      appContainer.appendChild(overlay);
    }

    const currentStep = onboardingSteps[onboardingStep];
    overlay.innerHTML = `
      <div class="onboarding-card">
        <div class="onboarding-step-indicator">Step ${onboardingStep + 1} of ${onboardingSteps.length}</div>
        <h3>${currentStep.title}</h3>
        <div class="onboarding-text">${currentStep.text}</div>
        <div class="onboarding-actions">
          <button class="btn-onboard btn-skip">Skip</button>
          <button class="btn-onboard next btn-next">${onboardingStep === onboardingSteps.length - 1 ? "Finish" : "Next →"}</button>
        </div>
      </div>
    `;

    overlay.querySelector(".btn-skip").addEventListener("click", () => {
      state.settings.onboardingCompleted = true;
      saveState();
      render();
    });

    overlay.querySelector(".btn-next").addEventListener("click", () => {
      if (onboardingStep < onboardingSteps.length - 1) {
        onboardingStep++;
        renderOnboarding();
      } else {
        state.settings.onboardingCompleted = true;
        onboardingStep = 0;
        saveState();
        render();
      }
    });
  }

  // --- HELPERS ---
  function escapeHTML(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Boot
  loadState(render);

})();
