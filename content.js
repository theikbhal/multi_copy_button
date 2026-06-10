// Content script for Outreach CRM & Multi-Copy Extension

(function() {
  // Prevent duplicate injection
  if (document.getElementById("multi-copy-crm-root")) {
    return;
  }

  // --- STATE INITIALIZATION ---
  let state = {
    accounts: [],
    snippets: [],
    statuses: [],
    settings: { onboardingCompleted: false },
    panel: { x: 50, y: 50, visible: true, minimized: false, activeTab: "crm" }
  };

  const defaultStatuses = [
    { name: "Not Contacted", color: "#64748B" },
    { name: "Sent DM", color: "#3B82F6" },
    { name: "Replied", color: "#EAB308" },
    { name: "Interested", color: "#22C55E" },
    { name: "Declined", color: "#EF4444" }
  ];

  const defaultSnippets = [
    {
      id: "snip-default-1",
      name: "Equity Pitch (US/UK)",
      notes: "Default pitch targeting native partners on equity basis",
      copyText: "Hey! Love your channel. We're building a new AI startup on an equity basis, looking for a strong creator partner in the US/UK to co-own and promote. Let me know if you'd be down for a quick call!",
      visible: false,
      position: { x: 100, y: 100 }
    },
    {
      id: "snip-default-2",
      name: "Follow-up",
      notes: "Follow up after 3 days of no reply",
      copyText: "Hey there! Just checking if you saw my previous message about the AI app partnership. Let me know if you'd be open to checking out a quick demo!",
      visible: false,
      position: { x: 120, y: 150 }
    }
  ];

  // --- DOM INJECTION (SHADOW DOM) ---
  const shadowHost = document.createElement("div");
  shadowHost.id = "multi-copy-crm-root";
  document.body.appendChild(shadowHost);
  const shadowRoot = shadowHost.attachShadow({ mode: "open" });

  // Stylesheet
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL("content.css");
  shadowRoot.appendChild(link);

  // App Container
  const appContainer = document.createElement("div");
  appContainer.className = "crm-theme-container";
  shadowRoot.appendChild(appContainer);

  // Search/Filters caching
  let crmSearchQuery = "";
  let crmPlatformFilter = "all";
  let crmStatusFilter = "all";
  let showStatusConfig = false;

  // --- PLATFORM SCRAPING ENGINE ---
  function getInstagramHandle() {
    try {
      const url = new URL(window.location.href);
      if (!url.hostname.includes("instagram.com")) return null;
      const paths = url.pathname.split("/").filter(p => p.length > 0);
      if (paths.length === 0) return null;
      const firstPath = paths[0];
      const excluded = ["explore", "direct", "developer", "emails", "accounts", "about", "legal", "terms", "privacy", "blog", "jobs", "p", "reel", "stories", "tv"];
      if (excluded.includes(firstPath)) return null;
      return firstPath;
    } catch (e) {
      return null;
    }
  }

  function getYouTubeHandle() {
    try {
      const url = new URL(window.location.href);
      if (!url.hostname.includes("youtube.com")) return null;
      const paths = url.pathname.split("/").filter(p => p.length > 0);
      if (paths.length === 0) return null;
      const firstPath = paths[0];
      if (firstPath.startsWith("@")) {
        return firstPath;
      }
      if (firstPath === "channel" || firstPath === "c" || firstPath === "user") {
        return paths[1] || null;
      }
      const excluded = ["feed", "watch", "results", "playlist", "shorts", "premium", "logout", "explore", "trending", "subscriptions"];
      if (excluded.includes(firstPath)) return null;
      // Many creators have handles direct like youtube.com/handle
      return firstPath;
    } catch (e) {
      return null;
    }
  }

  function detectCurrentProfile() {
    const ig = getInstagramHandle();
    if (ig) {
      return { platform: "instagram", handle: ig, url: window.location.href };
    }
    const yt = getYouTubeHandle();
    if (yt) {
      return { platform: "youtube", handle: yt.startsWith("@") ? yt : "@" + yt, url: window.location.href };
    }
    return null;
  }

  // --- STORAGE & SYNCHRONIZATION ---
  function loadState(callback) {
    chrome.storage.local.get(["accounts", "snippets", "statuses", "settings", "panel"], (res) => {
      state.accounts = res.accounts || [];
      state.snippets = res.snippets || defaultSnippets;
      state.statuses = res.statuses || defaultStatuses;
      state.settings = res.settings || { onboardingCompleted: false };
      state.panel = res.panel || { x: 50, y: 50, visible: true, minimized: false, activeTab: "crm" };
      
      // If storage was empty, initialize with defaults
      if (!res.statuses || !res.snippets) {
        chrome.storage.local.set({
          statuses: state.statuses,
          snippets: state.snippets,
          accounts: state.accounts,
          settings: state.settings,
          panel: state.panel
        });
      }

      if (callback) callback();
    });
  }

  function saveState() {
    chrome.storage.local.set({
      accounts: state.accounts,
      snippets: state.snippets,
      statuses: state.statuses,
      settings: state.settings,
      panel: state.panel
    });
  }

  // Sync state from storage if it changes in another tab
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local") {
      let shouldRender = false;
      if (changes.accounts) {
        state.accounts = changes.accounts.newValue || [];
        shouldRender = true;
      }
      if (changes.snippets) {
        state.snippets = changes.snippets.newValue || [];
        shouldRender = true;
      }
      if (changes.statuses) {
        state.statuses = changes.statuses.newValue || [];
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

  // Listen for background page instructions
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

  // --- CLIPBOARD WRITER Fallback ---
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

  // --- DRAG ENGINE IMPLEMENTATION ---
  function makeElementDraggable(element, dragHandle, onDragEnd) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    dragHandle.addEventListener("mousedown", dragMouseDown);
    
    function dragMouseDown(e) {
      // Don't drag if we click inside an input/button
      if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON" || e.target.tagName === "SELECT" || e.target.tagName === "A" || e.target.classList.contains("badge-status")) {
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

    // Touch Support
    dragHandle.addEventListener("touchstart", dragTouchStart, { passive: false });
    
    function dragTouchStart(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON" || e.target.tagName === "SELECT" || e.target.tagName === "A" || e.target.classList.contains("badge-status")) {
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

  // --- SVG ASSETS ---
  const SVG_ICONS = {
    instagram: `<svg class="platform-icon" viewBox="0 0 24 24" fill="none" stroke="#E1306C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>`,
    youtube: `<svg class="platform-icon" viewBox="0 0 24 24" fill="none" stroke="#FF0000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>`,
    search: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>`,
    plus: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"></path></svg>`,
    close: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>`,
    minimize: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12h-15"></path></svg>`,
    settings: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>`,
    back: `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"></path></svg>`,
    float: `<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"></path></svg>`,
    logo: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="6" fill="url(#grad)"/><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6366F1"/><stop offset="100%" stop-color="#06B6D4"/></linearGradient></defs><rect x="6" y="6" width="8" height="10" rx="1.5" fill="rgba(255,255,255,0.25)" stroke="white" stroke-width="1.2"/><rect x="10" y="9" width="8" height="10" rx="1.5" fill="white" stroke="#6366F1" stroke-width="1.2"/><circle cx="16" cy="6" r="2.5" fill="#10B981" stroke="white" stroke-width="0.8"/></svg>`,
    trash: `<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"></path></svg>`
  };

  // --- RENDER DOM CONTROLLER ---
  function render() {
    // 1. Build or Show/Hide Floating Action Button
    let fab = appContainer.querySelector(".crm-fab");
    if (!fab) {
      fab = document.createElement("div");
      fab.className = "crm-fab hidden";
      fab.innerHTML = SVG_ICONS.logo;
      appContainer.appendChild(fab);
      fab.addEventListener("click", () => {
        state.panel.visible = true;
        saveState();
        render();
      });
    }

    // Toggle FAB Visibility based on panel visibility state
    if (!state.panel.visible) {
      fab.classList.remove("hidden");
    } else {
      fab.classList.add("hidden");
    }

    // 2. Build or Update Dashboard
    let dashboard = appContainer.querySelector(".crm-dashboard");
    if (!dashboard) {
      dashboard = document.createElement("div");
      dashboard.className = "crm-dashboard";
      appContainer.appendChild(dashboard);
    }

    // Set visibility
    if (state.panel.visible) {
      dashboard.classList.remove("hidden");
    } else {
      dashboard.classList.add("hidden");
    }

    // Position Dashboard
    dashboard.style.left = state.panel.x + "px";
    dashboard.style.top = state.panel.y + "px";

    if (state.panel.minimized) {
      dashboard.classList.add("minimized");
      dashboard.innerHTML = `
        <div class="crm-header" style="height: 100%; border-bottom: none; padding: 10px 16px;">
          <div class="crm-logo-title">
            <div class="crm-logo-dot"></div>
            <span class="crm-title">Outreach CRM</span>
          </div>
          <button class="crm-action-btn maximize-btn" title="Expand Dashboard">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5"/></svg>
          </button>
        </div>
      `;
      const headerDrag = dashboard.querySelector(".crm-header");
      makeElementDraggable(dashboard, headerDrag, (x, y) => {
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
      return; // Skip drawing tabs when minimized
    } else {
      dashboard.classList.remove("minimized");
    }

    // Full Panel Layout HTML
    dashboard.innerHTML = `
      <!-- Header -->
      <div class="crm-header">
        <div class="crm-logo-title">
          <div class="crm-logo-dot"></div>
          <span class="crm-title">Outreach CRM & Snippets</span>
        </div>
        <div class="crm-header-actions">
          <button class="crm-action-btn minimize-btn" title="Minimize to Bar">${SVG_ICONS.minimize}</button>
          <button class="crm-action-btn close crm-close-btn" title="Hide Panel">${SVG_ICONS.close}</button>
        </div>
      </div>
      
      <!-- Navigation Tabs -->
      <div class="crm-tabs">
        <button class="crm-tab-btn ${state.panel.activeTab === "crm" ? "active" : ""}" data-tab="crm">CRM Leads</button>
        <button class="crm-tab-btn ${state.panel.activeTab === "snippets" ? "active" : ""}" data-tab="snippets">Pitches & Snippets</button>
        <button class="crm-tab-btn ${state.panel.activeTab === "help" ? "active" : ""}" data-tab="help">Help Guide</button>
      </div>

      <!-- Content Area -->
      <div class="crm-body">
        <!-- CRM TAB PANEL -->
        <div class="crm-tab-panel ${state.panel.activeTab === "crm" ? "active" : ""}" id="panel-crm">
          ${renderCRMTabHTML()}
        </div>

        <!-- SNIPPETS TAB PANEL -->
        <div class="crm-tab-panel ${state.panel.activeTab === "snippets" ? "active" : ""}" id="panel-snippets">
          ${renderSnippetsTabHTML()}
        </div>

        <!-- HELP TAB PANEL -->
        <div class="crm-tab-panel ${state.panel.activeTab === "help" ? "active" : ""}" id="panel-help">
          ${renderHelpTabHTML()}
        </div>
      </div>
    `;

    // Make full panel draggable
    const headerDrag = dashboard.querySelector(".crm-header");
    makeElementDraggable(dashboard, headerDrag, (x, y) => {
      state.panel.x = x;
      state.panel.y = y;
      saveState();
    });

    // Event Handlers for Header Actions
    dashboard.querySelector(".minimize-btn").addEventListener("click", () => {
      state.panel.minimized = true;
      saveState();
      render();
    });

    dashboard.querySelector(".crm-close-btn").addEventListener("click", () => {
      state.panel.visible = false;
      saveState();
      render();
    });

    // Tab Navigation Buttons
    const tabButtons = dashboard.querySelectorAll(".crm-tab-btn");
    tabButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        state.panel.activeTab = btn.getAttribute("data-tab");
        showStatusConfig = false; // Reset settings view
        saveState();
        render();
      });
    });

    // Setup tab-specific active event listeners
    if (state.panel.activeTab === "crm") {
      setupCRMEventListeners(dashboard);
    } else if (state.panel.activeTab === "snippets") {
      setupSnippetsEventListeners(dashboard);
    }

    // Render side elements
    renderFloatingPills();
    renderOnboarding();
  }

  // --- CRM TAB GRAPHICS & LOGIC ---
  function renderCRMTabHTML() {
    if (showStatusConfig) {
      return renderStatusConfigHTML();
    }

    const currentProfile = detectCurrentProfile();
    let scraperButtonHTML = "";
    
    if (currentProfile) {
      const alreadySaved = state.accounts.some(acc => acc.url === currentProfile.url || acc.handle === currentProfile.handle);
      if (alreadySaved) {
        scraperButtonHTML = `<button class="btn-scrape" disabled>Already Added</button>`;
      } else {
        scraperButtonHTML = `<button class="btn-scrape" id="btn-scrape-action">Add ${currentProfile.handle}</button>`;
      }
    } else {
      scraperButtonHTML = `<button class="btn-scrape" disabled title="Browse to an Instagram profile or YouTube channel">Add Current</button>`;
    }

    // Filter accounts
    const filteredAccounts = state.accounts.filter(acc => {
      const matchesSearch = acc.handle.toLowerCase().includes(crmSearchQuery.toLowerCase()) || 
                            (acc.notes && acc.notes.toLowerCase().includes(crmSearchQuery.toLowerCase()));
      
      const matchesPlatform = crmPlatformFilter === "all" || acc.platform === crmPlatformFilter;
      const matchesStatus = crmStatusFilter === "all" || acc.status === crmStatusFilter;
      
      return matchesSearch && matchesPlatform && matchesStatus;
    });

    // CRM Table rows
    let tableRowsHTML = "";
    if (filteredAccounts.length === 0) {
      tableRowsHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 30px 10px;">No matching accounts found.</td></tr>`;
    } else {
      filteredAccounts.forEach(acc => {
        // Status color matching
        const statusObj = state.statuses.find(s => s.name === acc.status) || { name: acc.status, color: "#64748B" };
        
        // Options in status select
        let statusOptionsHTML = "";
        state.statuses.forEach(s => {
          statusOptionsHTML += `<option value="${s.name}" ${s.name === acc.status ? "selected" : ""}>${s.name}</option>`;
        });

        tableRowsHTML += `
          <tr data-id="${acc.id}">
            <td style="width: 28px;">
              ${acc.platform === "instagram" ? SVG_ICONS.instagram : SVG_ICONS.youtube}
            </td>
            <td>
              <a href="${acc.url}" target="_blank" class="handle-link" title="Visit Profile">${acc.handle}</a>
            </td>
            <td>
              <div class="status-dropdown-wrapper">
                <span class="badge-status" style="background-color: rgba(${hexToRgb(statusObj.color)}, 0.15); color: ${statusObj.color}; border-color: rgba(${hexToRgb(statusObj.color)}, 0.3);">
                  ${acc.status}
                </span>
                <select class="status-select-native" data-id="${acc.id}">
                  ${statusOptionsHTML}
                </select>
              </div>
            </td>
            <td>
              <div class="note-cell-container" data-id="${acc.id}">
                <span class="note-text-display" title="Click to edit">${acc.notes || "<em>No notes...</em>"}</span>
              </div>
            </td>
            <td style="width: 32px; text-align: center;">
              <button class="btn-row-action btn-delete-account" data-id="${acc.id}" title="Remove Account">${SVG_ICONS.trash}</button>
            </td>
          </tr>
        `;
      });
    }

    // Platform select options
    let platformFilterOptionsHTML = `
      <option value="all" ${crmPlatformFilter === "all" ? "selected" : ""}>All Platforms</option>
      <option value="instagram" ${crmPlatformFilter === "instagram" ? "selected" : ""}>Instagram</option>
      <option value="youtube" ${crmPlatformFilter === "youtube" ? "selected" : ""}>YouTube</option>
    `;

    // Status select options
    let statusFilterOptionsHTML = `<option value="all" ${crmStatusFilter === "all" ? "selected" : ""}>All Statuses</option>`;
    state.statuses.forEach(s => {
      statusFilterOptionsHTML += `<option value="${s.name}" ${crmStatusFilter === s.name ? "selected" : ""}>${s.name}</option>`;
    });

    return `
      <!-- Scraper Widget -->
      <div class="scraper-row">
        <div class="scraper-info">
          <span class="scraper-title">Influencer Lead Capture</span>
          <span class="scraper-desc">${currentProfile ? `Detected profile: ${currentProfile.handle}` : "Browse Instagram/YouTube profile to auto-capture"}</span>
        </div>
        ${scraperButtonHTML}
      </div>

      <!-- Filters -->
      <div class="filter-row">
        <input type="text" id="crm-search" class="search-input" placeholder="Search handles, notes..." value="${crmSearchQuery}">
        <select id="filter-platform" class="select-filter">${platformFilterOptionsHTML}</select>
        <select id="filter-status" class="select-filter">${statusFilterOptionsHTML}</select>
        <button id="btn-status-config" class="crm-action-btn" title="Manage Status Options" style="padding: 8px; border: 1px solid var(--border-light); background: var(--bg-card); border-radius: 8px;">
          ${SVG_ICONS.settings}
        </button>
      </div>

      <!-- CRM Table -->
      <div class="table-container">
        <table class="crm-table">
          <thead>
            <tr>
              <th>Plat</th>
              <th>Handle</th>
              <th>Status</th>
              <th>Outreach Notes</th>
              <th style="text-align: center;">Del</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHTML}
          </tbody>
        </table>
      </div>
    `;
  }

  function setupCRMEventListeners(dashboard) {
    // 1. Scrape action
    const btnScrape = dashboard.querySelector("#btn-scrape-action");
    if (btnScrape) {
      btnScrape.addEventListener("click", () => {
        const currentProfile = detectCurrentProfile();
        if (currentProfile) {
          const defaultStatus = state.statuses[0]?.name || "Not Contacted";
          const newAccount = {
            id: "acc-" + Date.now(),
            handle: currentProfile.handle,
            platform: currentProfile.platform,
            url: currentProfile.url,
            status: defaultStatus,
            notes: "",
            createdAt: new Date().toISOString()
          };
          
          state.accounts.unshift(newAccount);
          saveState();
          render();
        }
      });
    }

    // 2. Search filtering
    const searchInput = dashboard.querySelector("#crm-search");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        crmSearchQuery = e.target.value;
        // Don't re-render entire page to prevent focus loss, just re-render body
        const panelBody = dashboard.querySelector("#panel-crm");
        panelBody.innerHTML = renderCRMTabHTML();
        setupCRMEventListeners(dashboard); // Re-hook
      });
      // Focus restoration
      searchInput.focus();
      searchInput.setSelectionRange(crmSearchQuery.length, crmSearchQuery.length);
    }

    // Platform Filter
    const filterPlat = dashboard.querySelector("#filter-platform");
    if (filterPlat) {
      filterPlat.addEventListener("change", (e) => {
        crmPlatformFilter = e.target.value;
        render();
      });
    }

    // Status Filter
    const filterStat = dashboard.querySelector("#filter-status");
    if (filterStat) {
      filterStat.addEventListener("change", (e) => {
        crmStatusFilter = e.target.value;
        render();
      });
    }

    // Trigger Status Manager View
    const btnStatusConfig = dashboard.querySelector("#btn-status-config");
    if (btnStatusConfig) {
      btnStatusConfig.addEventListener("click", () => {
        showStatusConfig = true;
        render();
      });
    }

    // 3. Table events: Status changes
    const statusSelects = dashboard.querySelectorAll(".status-select-native");
    statusSelects.forEach(select => {
      select.addEventListener("change", (e) => {
        const accId = e.target.getAttribute("data-id");
        const newStatus = e.target.value;
        const acc = state.accounts.find(a => a.id === accId);
        if (acc) {
          acc.status = newStatus;
          saveState();
          render();
        }
      });
    });

    // 4. Notes inline editing
    const notesCells = dashboard.querySelectorAll(".note-cell-container");
    notesCells.forEach(cell => {
      cell.addEventListener("click", function() {
        const accId = this.getAttribute("data-id");
        const acc = state.accounts.find(a => a.id === accId);
        if (!acc) return;

        // Prevent multiple input swaps
        if (this.querySelector("input")) return;

        const originalNotes = acc.notes || "";
        this.innerHTML = `<input type="text" class="note-input-inline" value="${originalNotes.replace(/"/g, '&quot;')}">`;
        const input = this.querySelector("input");
        input.focus();

        const saveNote = () => {
          acc.notes = input.value.trim();
          saveState();
          // Render locally
          this.innerHTML = `<span class="note-text-display" title="Click to edit">${acc.notes || "<em>No notes...</em>"}</span>`;
        };

        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            saveNote();
          } else if (e.key === "Escape") {
            // Cancel
            this.innerHTML = `<span class="note-text-display" title="Click to edit">${originalNotes || "<em>No notes...</em>"}</span>`;
          }
        });

        input.addEventListener("blur", saveNote);
      });
    });

    // 5. Delete account row
    const deleteAccountBtns = dashboard.querySelectorAll(".btn-delete-account");
    deleteAccountBtns.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const accId = btn.getAttribute("data-id");
        if (confirm("Are you sure you want to remove this account from your outreach CRM?")) {
          state.accounts = state.accounts.filter(a => a.id !== accId);
          saveState();
          render();
        }
      });
    });
  }

  // --- STATUS CONFIGURATION SUBTAB ---
  function renderStatusConfigHTML() {
    let itemsHTML = "";
    state.statuses.forEach((s, idx) => {
      itemsHTML += `
        <div class="status-item">
          <div class="status-item-preview">
            <span class="status-color-dot" style="background-color: ${s.color};"></span>
            <span style="font-weight:600; color: white;">${s.name}</span>
          </div>
          <div class="status-item-actions">
            ${state.statuses.length > 1 ? `<button class="btn-sm-action delete btn-delete-status" data-idx="${idx}" title="Delete Status">${SVG_ICONS.trash}</button>` : ""}
          </div>
        </div>
      `;
    });

    return `
      <div class="status-config-panel">
        <div class="status-config-title-row">
          <button id="btn-status-config-back" class="crm-action-btn" title="Back to CRM">
            ${SVG_ICONS.back} <span style="font-size:12px; margin-left:4px; font-weight:600;">Back to Leads</span>
          </button>
          <span class="scraper-title" style="font-size:13px;">Manage Statuses</span>
        </div>

        <div style="display:flex; flex-direction:column; gap:6px; max-height:260px; overflow-y:auto; padding-right:4px;">
          ${itemsHTML}
        </div>

        <!-- Add New Status -->
        <div style="border-top: 1px solid var(--border-light); padding-top:10px; margin-top:8px;">
          <span class="scraper-title" style="font-size:11px; color:var(--text-secondary); margin-bottom:6px; display:block;">Create New Status Badge</span>
          <div class="status-create-form">
            <input type="color" id="new-status-color" class="status-color-input" value="#6366F1">
            <input type="text" id="new-status-name" class="search-input status-name-input" placeholder="e.g. Call Scheduled, Followed Up">
            <button id="btn-add-status-action" class="btn-add-status">Add</button>
          </div>
        </div>
      </div>
    `;
  }

  function setupStatusConfigEvents(dashboard) {
    const btnBack = dashboard.querySelector("#btn-status-config-back");
    if (btnBack) {
      btnBack.addEventListener("click", () => {
        showStatusConfig = false;
        render();
      });
    }

    const btnAdd = dashboard.querySelector("#btn-add-status-action");
    if (btnAdd) {
      btnAdd.addEventListener("click", () => {
        const nameInput = dashboard.querySelector("#new-status-name");
        const colorInput = dashboard.querySelector("#new-status-color");
        const name = nameInput.value.trim();
        const color = colorInput.value;

        if (!name) {
          alert("Status name cannot be empty.");
          return;
        }

        // Check duplicates
        const exists = state.statuses.some(s => s.name.toLowerCase() === name.toLowerCase());
        if (exists) {
          alert("A status option with this name already exists.");
          return;
        }

        state.statuses.push({ name, color });
        saveState();
        render();
      });
    }

    const deleteBtns = dashboard.querySelectorAll(".btn-delete-status");
    deleteBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-idx"));
        const statusToDelete = state.statuses[idx].name;

        // Ask for confirmation and if they want to re-map existing leads
        if (confirm(`Delete the status option "${statusToDelete}"? Existing leads with this status will be reset to "${state.statuses[0].name === statusToDelete ? state.statuses[1].name : state.statuses[0].name}".`)) {
          // Re-map leads
          const backupStatus = state.statuses[0].name === statusToDelete ? state.statuses[1].name : state.statuses[0].name;
          state.accounts.forEach(acc => {
            if (acc.status === statusToDelete) {
              acc.status = backupStatus;
            }
          });

          state.statuses.splice(idx, 1);
          saveState();
          render();
        }
      });
    });
  }

  // --- SNIPPETS & PITCHES TAB HTML & EVENTS ---
  function renderSnippetsTabHTML() {
    let snippetCardsHTML = "";
    if (state.snippets.length === 0) {
      snippetCardsHTML = `<div style="text-align: center; color: var(--text-secondary); padding: 40px 10px;">No pitches saved yet. Create one below!</div>`;
    } else {
      state.snippets.forEach(snip => {
        snippetCardsHTML += `
          <div class="snippet-card" data-id="${snip.id}">
            <div class="snippet-card-header">
              <div>
                <div class="snippet-card-name">${snip.name}</div>
                <div class="snippet-card-notes">${snip.notes || "No notes"}</div>
              </div>
              <button class="btn-card float-action btn-float-toggle" data-id="${snip.id}" title="${snip.visible ? "Hide Floating Pill" : "Float on Screen"}">
                ${SVG_ICONS.float} <span>${snip.visible ? "Dock" : "Float"}</span>
              </button>
            </div>
            <div class="snippet-card-body">${escapeHTML(snip.copyText)}</div>
            <div class="snippet-card-actions">
              <button class="btn-card delete-action btn-delete-snippet" data-id="${snip.id}">${SVG_ICONS.trash} Delete</button>
            </div>
          </div>
        `;
      });
    }

    return `
      <!-- Create Snippet Form -->
      <div class="snippet-form">
        <span class="scraper-title" style="font-size:12px; margin-bottom: 2px;">Create Copy Template</span>
        <div class="form-row">
          <div class="form-group" style="flex:1;">
            <label>Template Name</label>
            <input type="text" id="snip-name" class="form-input" placeholder="e.g. Equity Pitch, Bio Link">
          </div>
          <div class="form-group" style="flex:1;">
            <label>Short Notes</label>
            <input type="text" id="snip-notes" class="form-input" placeholder="e.g. targeting US, follow-up">
          </div>
        </div>
        <div class="form-group">
          <label>Outreach Pitch Copy Text</label>
          <textarea id="snip-text" class="form-input form-textarea" placeholder="Paste the message templates you want to copy click..."></textarea>
        </div>
        <button id="btn-add-snippet" class="btn-submit">Add Pitch Template</button>
      </div>

      <!-- Saved Templates List -->
      <span class="scraper-title" style="font-size:11px; color: var(--text-secondary); margin-bottom: 6px;">Saved Templates</span>
      <div class="snippets-list">
        ${snippetCardsHTML}
      </div>
    `;
  }

  function setupSnippetsEventListeners(dashboard) {
    const btnAdd = dashboard.querySelector("#btn-add-snippet");
    if (btnAdd) {
      btnAdd.addEventListener("click", () => {
        const nameInput = dashboard.querySelector("#snip-name");
        const notesInput = dashboard.querySelector("#snip-notes");
        const textInput = dashboard.querySelector("#snip-text");

        const name = nameInput.value.trim();
        const notes = notesInput.value.trim();
        const copyText = textInput.value.trim();

        if (!name || !copyText) {
          alert("Template Name and Copy Text cannot be empty.");
          return;
        }

        const newSnippet = {
          id: "snip-" + Date.now(),
          name,
          notes,
          copyText,
          visible: false,
          position: { x: window.innerWidth / 2 - 60, y: window.innerHeight / 2 - 20 }
        };

        state.snippets.push(newSnippet);
        saveState();
        render();
      });
    }

    // Toggle float status
    const floatBtns = dashboard.querySelectorAll(".btn-float-toggle");
    floatBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const snipId = btn.getAttribute("data-id");
        const snip = state.snippets.find(s => s.id === snipId);
        if (snip) {
          snip.visible = !snip.visible;
          // Set initial centering on the screen if it was never set
          if (!snip.position) {
            snip.position = { x: window.innerWidth / 2 - 50, y: window.innerHeight / 2 - 15 };
          }
          saveState();
          render();
        }
      });
    });

    // Delete snippet
    const deleteBtns = dashboard.querySelectorAll(".btn-delete-snippet");
    deleteBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const snipId = btn.getAttribute("data-id");
        if (confirm("Delete this outreach pitch template? This will also remove any floating button for it.")) {
          state.snippets = state.snippets.filter(s => s.id !== snipId);
          saveState();
          render();
        }
      });
    });
  }

  // --- HELP / HOW-TO TAB HTML ---
  function renderHelpTabHTML() {
    return `
      <div class="help-content">
        <div class="help-section">
          <span class="help-h4">🚀 Quick Onboarding Tour</span>
          <span class="help-p">Want to review the initial setup guide? Click the button below to restart the interactive walkthrough overlay.</span>
          <button id="btn-restart-onboarding" class="btn-card" style="margin-top: 6px; width: fit-content;">Restart Onboarding</button>
        </div>

        <div class="help-section" style="border-top:1px solid var(--border-light); padding-top:10px;">
          <span class="help-h4">📱 Automated Lead Capturing</span>
          <span class="help-p">1. Go to any Instagram account page (e.g. <span class="help-code-tip">instagram.com/instagram</span>) or YouTube channel main page.</span>
          <span class="help-p">2. A neon active button will light up at the top of the CRM tab showing <span class="help-code-tip">Add @username</span>.</span>
          <span class="help-p">3. Click it to auto-scraps the platform, handle, and full URL directly into your CRM table list below!</span>
        </div>

        <div class="help-section" style="border-top:1px solid var(--border-light); padding-top:10px;">
          <span class="help-h4">📌 Draggable Copy Pills (Floaters)</span>
          <span class="help-p">1. Go to the "Pitches & Snippets" tab.</span>
          <span class="help-p">2. Click <span class="help-code-tip">Float</span> on any template you want to use.</span>
          <span class="help-p">3. A small pill/capsule widget will appear floating on the page. Drag it anywhere (e.g. next to the DM input box).</span>
          <span class="help-p">4. Simply click the pill to copy the pitch. It copies instantly and flashes green to confirm! Close it via the "×" symbol.</span>
        </div>

        <div class="help-section" style="border-top:1px solid var(--border-light); padding-top:10px;">
          <span class="help-h4">💾 Backups (JSON Export)</span>
          <span class="help-p">Use the Chrome extension icon in the toolbar (top right of browser) to download a full backup copy of your CRM database, or upload data if switching devices!</span>
        </div>
      </div>
    `;
  }

  // Bind help tab actions
  function setupCRMHelpTabActions(dashboard) {
    const restartBtn = dashboard.querySelector("#btn-restart-onboarding");
    if (restartBtn) {
      restartBtn.addEventListener("click", () => {
        state.settings.onboardingCompleted = false;
        saveState();
        render();
      });
    }
  }

  // Hook global dashboard triggers
  function setupGlobalEvents(dashboard) {
    if (state.panel.activeTab === "help") {
      setupCRMHelpTabActions(dashboard);
    }
    if (showStatusConfig) {
      setupStatusConfigEvents(dashboard);
    }
  }

  // Wrapper for routing actions
  const oldRender = render;
  render = function() {
    oldRender();
    const dashboard = appContainer.querySelector(".crm-dashboard");
    if (dashboard && !state.panel.minimized) {
      setupGlobalEvents(dashboard);
    }
  };

  // --- FLOATING COPY PILLS INJECTOR ---
  function renderFloatingPills() {
    // Collect all active pills currently rendered
    const existingPills = appContainer.querySelectorAll(".floating-snippet-pill");
    const activePillIds = new Set();

    // Rerender or update floating pills
    state.snippets.forEach(snip => {
      if (!snip.visible) return;
      activePillIds.add(snip.id);

      let pill = appContainer.querySelector(`.floating-snippet-pill[data-id="${snip.id}"]`);
      if (!pill) {
        pill = document.createElement("div");
        pill.className = "floating-snippet-pill";
        pill.setAttribute("data-id", snip.id);
        
        // Add content
        pill.innerHTML = `
          <div class="floating-pill-drag" title="Drag to reposition">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle>
              <circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="19" r="1"></circle>
            </svg>
          </div>
          <span class="floating-pill-text">${snip.name}</span>
          <button class="floating-pill-close" title="Close Float">×</button>
        `;
        appContainer.appendChild(pill);

        // Bind drag positioning
        const dragHandle = pill.querySelector(".floating-pill-drag");
        makeElementDraggable(pill, dragHandle, (x, y) => {
          const s = state.snippets.find(item => item.id === snip.id);
          if (s) {
            s.position = { x, y };
            saveState();
          }
        });

        // Copy functionality on click (clicking the pill label/body)
        pill.addEventListener("click", (e) => {
          // Prevent copy on drag or close click
          if (e.target.closest(".floating-pill-drag") || e.target.closest(".floating-pill-close")) {
            return;
          }

          copyTextToClipboard(snip.copyText)
            .then(() => {
              // Add copied effect class
              pill.classList.add("copied");
              const label = pill.querySelector(".floating-pill-text");
              const originalText = label.textContent;
              label.textContent = "Copied!";
              setTimeout(() => {
                pill.classList.remove("copied");
                label.textContent = originalText;
              }, 1000);
            })
            .catch(err => {
              console.error("Clipboard copy failed:", err);
            });
        });

        // Close/Dock action click
        pill.querySelector(".floating-pill-close").addEventListener("click", (e) => {
          e.stopPropagation();
          const s = state.snippets.find(item => item.id === snip.id);
          if (s) {
            s.visible = false;
            saveState();
            render();
          }
        });
      }

      // Update tooltip notes dynamically
      pill.setAttribute("data-tooltip", snip.notes || "Click to copy text");

      // Update positions
      if (snip.position) {
        pill.style.left = snip.position.x + "px";
        pill.style.top = snip.position.y + "px";
      }
    });

    // Remove pills that are no longer visible or deleted
    existingPills.forEach(pill => {
      const id = pill.getAttribute("data-id");
      if (!activePillIds.has(id)) {
        pill.remove();
      }
    });
  }

  // --- INTERACTIVE ONBOARDING OVERLAY ---
  let onboardingStep = 0;
  const onboardingSteps = [
    {
      title: "👋 Welcome to Outreach CRM!",
      text: "This extension is designed to help you quickly scrape, track, and contact Instagram and YouTube influencers for equity partnerships or business deals.",
    },
    {
      title: "📊 Auto-Scraping Leads",
      text: "When you browse an Instagram or YouTube page, click the highlighted 'Add Current' button in the CRM tab. The extension scrapes the username and profile URL into your lead sheet automatically!",
    },
    {
      title: "📍 Draggable Copy Pills",
      text: "Write pitches in the 'Pitches & Snippets' tab. Click 'Float' to create a tiny draggable button. You can drag it right next to your influencer DM input box and click it to paste instant templates!",
    },
    {
      title: "🎨 Custom Status Tracks",
      text: "Manage notes and statuses (Replied, Interested) directly inline. Click the gear icon in the CRM view to rename, recolor, or delete status tracks to match your funnel workflow.",
    },
    {
      title: "💾 Export & Backups",
      text: "Click the Outreach CRM extension icon in your browser toolbar to export your gathered leads list and configurations. Keep your backups secure! You're ready to start."
    }
  ];

  function renderOnboarding() {
    let overlay = appContainer.querySelector(".onboarding-backdrop");
    
    // Check if onboarding is completed or panel is hidden
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
          <button class="btn-onboard btn-skip">Skip Tour</button>
          <button class="btn-onboard next btn-next">${onboardingStep === onboardingSteps.length - 1 ? "Get Started" : "Next →"}</button>
        </div>
      </div>
    `;

    // Skip Onboarding
    overlay.querySelector(".btn-skip").addEventListener("click", () => {
      state.settings.onboardingCompleted = true;
      saveState();
      render();
    });

    // Next Step
    overlay.querySelector(".btn-next").addEventListener("click", () => {
      if (onboardingStep < onboardingSteps.length - 1) {
        onboardingStep++;
        renderOnboarding();
      } else {
        state.settings.onboardingCompleted = true;
        onboardingStep = 0; // Reset for next time
        saveState();
        render();
      }
    });
  }

  // --- HELPER UTILITIES ---
  function escapeHTML(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : "99, 102, 241";
  }

  // Track page change inside Single Page Applications (SPA) like Instagram/YouTube
  let currentHref = window.location.href;
  const observer = new MutationObserver(() => {
    if (window.location.href !== currentHref) {
      currentHref = window.location.href;
      // Refresh SCRAPE button if showing crm tab
      if (state.panel.visible && !state.panel.minimized && state.panel.activeTab === "crm") {
        render();
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // --- BOOTSTRAP ---
  loadState(render);

})();
