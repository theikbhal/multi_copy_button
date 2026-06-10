document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const demoBtn = document.getElementById("demo-float-btn");
  const dragHandle = document.getElementById("demo-drag-handle");
  const demoWorkspace = document.getElementById("demo-workspace");
  const toast = document.getElementById("demo-toast");
  
  // Onboarding Steps
  const step1 = document.getElementById("step-1");
  const step2 = document.getElementById("step-2");
  const step3 = document.getElementById("step-3");
  
  // Custom creator
  const addBtn = document.getElementById("demo-add-btn");
  const nameInput = document.getElementById("demo-name-in");
  const textInput = document.getElementById("demo-text-in");
  const notesInput = document.getElementById("demo-notes-in");
  
  // Edit Modal Elements
  const editModal = document.getElementById("demo-modal");
  const editName = document.getElementById("edit-name");
  const editText = document.getElementById("edit-text");
  const editNotes = document.getElementById("edit-notes");
  const cancelEdit = document.getElementById("cancel-edit");
  const saveEdit = document.getElementById("save-edit");
  
  // State
  let activeEditTarget = null;
  let hasDragged = false;
  let stepsCompleted = { step1: false, step2: false, step3: false };

  // 1. Copy Clipboard Functionality
  function copyTextToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`Copied snippet: "${text}"`);
      
      // Mark step 1 completed
      if (!stepsCompleted.step1) {
        stepsCompleted.step1 = true;
        step1.classList.remove("active");
        step1.classList.add("completed");
        step2.classList.add("active");
      }
    }).catch(err => {
      console.error("Could not copy text: ", err);
    });
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 2500);
  }

  // 2. Setup Draggable Functionality
  setupDragging(demoBtn, dragHandle);

  function setupDragging(elmnt, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    handle.onmousedown = dragMouseDown;
    
    // Fallback for clicking the whole body (excluding actions/handle)
    elmnt.addEventListener("click", (e) => {
      // Don't copy if user clicked handle, action buttons or if they are dragging
      if (e.target.closest(".drag-handle") || e.target.closest(".btn-actions") || e.target.closest(".action-btn")) {
        return;
      }
      
      const copyVal = elmnt.querySelector(".btn-text").textContent;
      copyTextToClipboard(copyVal);
    });

    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      
      // Get the mouse cursor position at startup:
      pos3 = e.clientX;
      pos4 = e.clientY;
      
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      
      // Calculate the new cursor position:
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      
      // Calculate boundaries within workspace
      const rect = demoWorkspace.getBoundingClientRect();
      const elmRect = elmnt.getBoundingClientRect();
      
      let newTop = elmnt.offsetTop - pos2;
      let newLeft = elmnt.offsetLeft - pos1;
      
      // Boundary constraints
      if (newTop < 0) newTop = 0;
      if (newTop > rect.height - elmRect.height) newTop = rect.height - elmRect.height;
      if (newLeft < 0) newLeft = 0;
      if (newLeft > rect.width - elmRect.width) newLeft = rect.width - elmRect.width;
      
      elmnt.style.top = newTop + "px";
      elmnt.style.left = newLeft + "px";
      elmnt.style.right = "auto"; // remove right-alignment once dragged
      
      // Mark step 2 completed
      if (stepsCompleted.step1 && !stepsCompleted.step2) {
        hasDragged = true;
      }
    }

    function closeDragElement() {
      // Stop moving when mouse button is released:
      document.onmouseup = null;
      document.onmousemove = null;
      
      if (hasDragged && !stepsCompleted.step2) {
        stepsCompleted.step2 = true;
        step2.classList.remove("active");
        step2.classList.add("completed");
        step3.classList.add("active");
      }
    }
  }

  // 3. Edit & Delete Actions for Default Button
  bindButtonActions(demoBtn);

  function bindButtonActions(btnEl) {
    const editBtn = btnEl.querySelector(".edit-btn");
    const deleteBtn = btnEl.querySelector(".delete-btn");

    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openModal(btnEl);
    });

    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      btnEl.remove();
      showToast("Button removed from preview!");
    });
  }

  // 4. Modal Handlers
  function openModal(btnEl) {
    activeEditTarget = btnEl;
    const name = btnEl.querySelector(".btn-name").textContent.replace("🚀 ", "").replace("💡 ", "").replace("🏷️ ", "");
    const text = btnEl.querySelector(".btn-text").textContent;
    const notesEl = btnEl.querySelector(".btn-tooltip p");
    const notes = notesEl ? notesEl.textContent : "";
    
    editName.value = name;
    editText.value = text;
    editNotes.value = notes;
    
    editModal.classList.add("show");
  }

  function closeModal() {
    editModal.classList.remove("show");
    activeEditTarget = null;
  }

  cancelEdit.addEventListener("click", closeModal);
  
  saveEdit.addEventListener("click", () => {
    if (!activeEditTarget) return;
    
    const nameVal = editName.value.trim() || "Snippet";
    const textVal = editText.value.trim() || "No text";
    const notesVal = editNotes.value.trim() || "No description";
    
    // Update active target elements
    activeEditTarget.querySelector(".btn-name").textContent = `🏷️ ${nameVal}`;
    activeEditTarget.querySelector(".btn-text").textContent = textVal;
    activeEditTarget.querySelector(".btn-tooltip strong").textContent = nameVal;
    
    let notesPEl = activeEditTarget.querySelector(".btn-tooltip p");
    if (!notesPEl) {
      notesPEl = document.createElement("p");
      activeEditTarget.querySelector(".btn-tooltip").insertBefore(notesPEl, activeEditTarget.querySelector(".btn-text"));
    }
    notesPEl.textContent = notesVal;
    
    closeModal();
    showToast("Changes saved successfully!");
  });

  // 5. Custom Button Creator
  addBtn.addEventListener("click", () => {
    const name = nameInput.value.trim();
    const text = textInput.value.trim();
    const notes = notesInput.value.trim();

    if (!name || !text) {
      alert("Please fill in both the Name and snippet Text!");
      return;
    }

    createFloatingButton(name, text, notes);

    // Clear inputs
    nameInput.value = "";
    textInput.value = "";
    notesInput.value = "";

    // Mark step 3 completed
    if (stepsCompleted.step2 && !stepsCompleted.step3) {
      stepsCompleted.step3 = true;
      step3.classList.remove("active");
      step3.classList.add("completed");
    }
  });

  function createFloatingButton(name, text, notes) {
    const newBtn = document.createElement("div");
    newBtn.className = "floating-btn-demo";
    
    // Generate unique positioning to avoid stacking exactly on top
    const randTop = Math.floor(Math.random() * 100) + 50;
    const randLeft = Math.floor(Math.random() * 100) + 50;
    newBtn.style.top = randTop + "px";
    newBtn.style.left = randLeft + "px";

    newBtn.innerHTML = `
      <div class="drag-handle">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 9h14M5 15h14"/></svg>
      </div>
      <span class="btn-name">💡 ${name}</span>
      <div class="btn-tooltip">
        <strong>${name}</strong>
        ${notes ? `<p>${notes}</p>` : ""}
        <div class="btn-text">${text}</div>
      </div>
      <div class="btn-actions">
        <button class="action-btn edit-btn" title="Edit">✏️</button>
        <button class="action-btn delete-btn" title="Delete">✕</button>
      </div>
    `;

    demoWorkspace.appendChild(newBtn);
    setupDragging(newBtn, newBtn.querySelector(".drag-handle"));
    bindButtonActions(newBtn);
    showToast(`"${name}" floating button added!`);
  }

  // 6. Close onboarding window
  document.getElementById("close-welcome").addEventListener("click", () => {
    window.close();
  });
});
