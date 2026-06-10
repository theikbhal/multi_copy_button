document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const viewport = document.getElementById("sandbox-viewport");
  const toast = document.getElementById("sandbox-toast");
  
  // Dock Elements
  const dockHandle = document.getElementById("mock-dock-handle");
  const dock = document.getElementById("mock-dock");
  const closeDockBtn = document.getElementById("close-dock-btn");
  const dockSearch = document.getElementById("dock-search");
  const dockListContainer = document.getElementById("dock-list-container");
  
  // Custom Creator Form
  const createBtn = document.getElementById("create-sandbox-btn");
  const createName = document.getElementById("create-name");
  const createText = document.getElementById("create-text");
  const createNotes = document.getElementById("create-notes");

  // Edit Modal Elements
  const modal = document.getElementById("sandbox-modal");
  const modalName = document.getElementById("modal-name");
  const modalText = document.getElementById("modal-text");
  const modalNotes = document.getElementById("modal-notes");
  const modalCancel = document.getElementById("modal-cancel");
  const modalSave = document.getElementById("modal-save");

  // Initial State Data for Sandbox
  let sandboxButtons = [
    {
      id: "demo-btn-1",
      name: "Prod Deploy",
      text: "vercel --prod",
      notes: "Production deployment command",
      position: { x: 65, y: 20 },
      visible: true
    },
    {
      id: "demo-btn-2",
      name: "Brand Color",
      text: "#8B5CF6",
      notes: "Brand purple CSS Hex code",
      position: { x: 65, y: 40 },
      visible: true
    }
  ];
  
  let activeEditingId = null;

  // Initialize
  initSandbox();

  function initSandbox() {
    // Setup existing buttons
    sandboxButtons.forEach(btn => {
      const btnEl = document.getElementById(btn.id);
      if (btnEl) {
        setupButtonListeners(btnEl, btn);
      }
    });

    renderDockList();
  }

  // Open / Close Mock Dock
  dockHandle.addEventListener("click", () => {
    dock.classList.add("open");
    dockHandle.style.right = "-40px";
  });

  closeDockBtn.addEventListener("click", () => {
    dock.classList.remove("open");
    dockHandle.style.right = "0";
  });

  // Search filter
  dockSearch.addEventListener("input", renderDockList);

  // Form Submission (Add to Sandbox)
  createBtn.addEventListener("click", () => {
    const name = createName.value.trim();
    const text = createText.value.trim();
    const notes = createNotes.value.trim();

    if (!name || !text) {
      alert("Name and snippet Text are required!");
      return;
    }

    const id = "sandbox-btn-" + Date.now();
    const randX = Math.floor(Math.random() * 30) + 15; // random positions
    const randY = Math.floor(Math.random() * 40) + 15;

    const newBtnData = {
      id: id,
      name: name,
      text: text,
      notes: notes,
      position: { x: randX, y: randY },
      visible: true
    };

    sandboxButtons.push(newBtnData);
    
    // Create DOM element
    createButtonDOM(newBtnData);
    renderDockList();

    // Reset fields
    createName.value = "";
    createText.value = "";
    createNotes.value = "";

    showToast(`Created button "${name}"!`);
  });

  // Create floating button element in mock browser
  function createButtonDOM(btn) {
    const btnEl = document.createElement("div");
    btnEl.className = "demo-btn";
    btnEl.id = btn.id;
    btnEl.style.left = btn.position.x + "%";
    btnEl.style.top = btn.position.y + "%";

    btnEl.innerHTML = `
      <div class="drag-handle" title="Drag me">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 9h14M5 15h14"/></svg>
      </div>
      <span class="btn-name">${btn.name}</span>
      <div class="tooltip">
        <strong>${btn.name}</strong>
        ${btn.notes ? `<p>${btn.notes}</p>` : ""}
        <div class="tooltip-text">${btn.text}</div>
      </div>
      <div class="actions">
        <button class="act-btn edit-btn" title="Edit">✏️</button>
        <button class="act-btn delete-btn" title="Hide">✕</button>
      </div>
    `;

    viewport.appendChild(btnEl);
    setupButtonListeners(btnEl, btn);
  }

  // Set up dragging, copying, and actions on floating buttons
  function setupButtonListeners(btnEl, btn) {
    const dragHandle = btnEl.querySelector(".drag-handle");
    const editBtn = btnEl.querySelector(".edit-btn");
    const deleteBtn = btnEl.querySelector(".delete-btn");

    // Copy to clipboard click handler
    btnEl.addEventListener("click", (e) => {
      // Don't copy if handle, edit, delete were clicked
      if (e.target.closest(".drag-handle") || e.target.closest(".actions")) {
        return;
      }
      copyToClipboard(btn.text);
    });

    // Edit Modal trigger
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openEditModal(btn);
    });

    // Delete (hide) trigger
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleButtonVisibility(btn.id, false);
      showToast(`Hidden "${btn.name}". Restore from the side panel!`);
    });

    // Drag and drop setup
    setupDragging(btnEl, dragHandle, btn);
  }

  function setupDragging(elmnt, dragHandle, btnData) {
    let startX = 0, startY = 0;
    let initialX = 0, initialY = 0;
    let isMoving = false;
    let dragThreshold = 4;

    dragHandle.addEventListener("mousedown", dragStart);

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

        // Constraint boundaries relative to mock viewport
        const viewportRect = viewport.getBoundingClientRect();
        const elmRect = elmnt.getBoundingClientRect();

        // Calculate absolute position inside viewport
        let relativeLeft = newX - viewportRect.left;
        let relativeTop = newY - viewportRect.top;

        const maxLeft = viewportRect.width - elmRect.width;
        const maxTop = viewportRect.height - elmRect.height;

        if (relativeLeft < 0) relativeLeft = 0;
        if (relativeLeft > maxLeft) relativeLeft = maxLeft;
        if (relativeTop < 0) relativeTop = 0;
        if (relativeTop > maxTop) relativeTop = maxTop;

        elmnt.style.left = relativeLeft + "px";
        elmnt.style.top = relativeTop + "px";
      }
    }

    function dragEnd() {
      document.removeEventListener("mouseup", dragEnd);
      document.removeEventListener("mousemove", dragMove);

      if (isMoving) {
        // Save final position in percentage
        const viewportRect = viewport.getBoundingClientRect();
        const elmRect = elmnt.getBoundingClientRect();
        
        const relLeft = elmnt.offsetLeft;
        const relTop = elmnt.offsetTop;

        const pctX = (relLeft / viewportRect.width) * 100;
        const pctY = (relTop / viewportRect.height) * 100;

        btnData.position.x = pctX;
        btnData.position.y = pctY;
      }
    }
  }

  // Render mock dock list
  function renderDockList() {
    dockListContainer.innerHTML = "";
    const searchVal = dockSearch.value.toLowerCase().trim();

    const filtered = sandboxButtons.filter(btn => {
      return btn.name.toLowerCase().includes(searchVal) || 
             btn.text.toLowerCase().includes(searchVal) || 
             btn.notes.toLowerCase().includes(searchVal);
    });

    if (filtered.length === 0) {
      dockListContainer.innerHTML = `<div style="text-align:center; font-size:10px; color:#9ca3af; padding: 12px 0;">Empty</div>`;
      return;
    }

    filtered.forEach(btn => {
      const item = document.createElement("div");
      item.className = "dock-item";
      item.innerHTML = `
        <span title="${btn.name}">${btn.name}</span>
        <div>
          <button class="mock-vis-btn" title="Toggle visibility">${btn.visible ? "👁️" : "🕶️"}</button>
          <button class="mock-del-btn" title="Delete">✕</button>
        </div>
      `;

      // Visual toggler
      item.querySelector(".mock-vis-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        toggleButtonVisibility(btn.id, !btn.visible);
      });

      // Delete from sandbox state entirely
      item.querySelector(".mock-del-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm(`Remove "${btn.name}" from sandbox?`)) {
          sandboxButtons = sandboxButtons.filter(b => b.id !== btn.id);
          const btnEl = document.getElementById(btn.id);
          if (btnEl) btnEl.remove();
          renderDockList();
        }
      });

      // Copy text on clicking label
      item.querySelector("span").addEventListener("click", () => {
        copyToClipboard(btn.text);
      });

      dockListContainer.appendChild(item);
    });
  }

  function toggleButtonVisibility(id, visibleState) {
    sandboxButtons = sandboxButtons.map(b => {
      if (b.id === id) {
        b.visible = visibleState;
        
        // Show/Hide in DOM
        const btnEl = document.getElementById(id);
        if (btnEl) {
          btnEl.style.display = visibleState ? "flex" : "none";
        }
      }
      return b;
    });
    renderDockList();
  }

  // Clipboard copy inside browser landing page
  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`Copied snippet: "${text}"`);
    }).catch(err => {
      console.error("Failed to copy clipboard: ", err);
    });
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 2000);
  }

  // Edit Modal Handling
  function openEditModal(btn) {
    activeEditingId = btn.id;
    modalName.value = btn.name;
    modalText.value = btn.text;
    modalNotes.value = btn.notes;
    modal.classList.add("open");
  }

  function closeEditModal() {
    modal.classList.remove("open");
    activeEditingId = null;
  }

  modalCancel.addEventListener("click", closeEditModal);

  modalSave.addEventListener("click", () => {
    if (!activeEditingId) return;

    const name = modalName.value.trim();
    const text = modalText.value.trim();
    const notes = modalNotes.value.trim();

    if (!name || !text) {
      alert("Name and snippet Text are required!");
      return;
    }

    // Update state
    sandboxButtons = sandboxButtons.map(b => {
      if (b.id === activeEditingId) {
        b.name = name;
        b.text = text;
        b.notes = notes;

        // Update DOM elements
        const btnEl = document.getElementById(b.id);
        if (btnEl) {
          btnEl.querySelector(".btn-name").textContent = name;
          btnEl.querySelector(".tooltip strong").textContent = name;
          
          let tooltipP = btnEl.querySelector(".tooltip p");
          if (notes) {
            if (!tooltipP) {
              tooltipP = document.createElement("p");
              btnEl.querySelector(".tooltip").insertBefore(tooltipP, btnEl.querySelector(".tooltip-text"));
            }
            tooltipP.textContent = notes;
          } else if (tooltipP) {
            tooltipP.remove();
          }

          btnEl.querySelector(".tooltip-text").textContent = text;
        }
      }
      return b;
    });

    closeEditModal();
    renderDockList();
    showToast("Changes saved successfully!");
  });
});
