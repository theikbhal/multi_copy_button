// popup.js for Only Copy Buttons

document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("toggle-btn");
  const exportBtn = document.getElementById("export-btn");
  const importFile = document.getElementById("import-file");
  const importStatus = document.getElementById("import-status");
  
  const statTotal = document.getElementById("stat-total");
  const statFloating = document.getElementById("stat-floating");

  function updateStats() {
    chrome.storage.local.get(["snippets"], (data) => {
      const snippets = data.snippets || [];
      const total = snippets.length;
      
      let floatingCount = 0;
      snippets.forEach(snip => {
        if (snip.visible) {
          floatingCount++;
        }
      });
      
      statTotal.textContent = total;
      statFloating.textContent = floatingCount;
    });
  }

  updateStats();

  // Toggle active dashboard
  toggleBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "toggle-active-tab-panel" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Communication error:", chrome.runtime.lastError);
        alert("Navigate to a standard webpage and reload the page before toggling.");
        return;
      }
      if (response && !response.success) {
        console.warn("Toggle failed:", response.error);
        alert("Make sure you are on a webpage (not a Chrome system or store page).");
      }
    });
  });

  // Export JSON backup
  exportBtn.addEventListener("click", () => {
    chrome.storage.local.get(null, (data) => {
      const backupData = {
        snippets: data.snippets || [],
        settings: data.settings || {},
        version: "1.0",
        exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `copy_buttons_backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      importStatus.textContent = "JSON backup downloaded!";
      importStatus.style.color = "#10B981";
      setTimeout(() => { importStatus.textContent = ""; }, 3000);
    });
  });

  // Import JSON backup
  importFile.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        
        if (!imported.snippets) {
          throw new Error("Invalid backup: must contain snippets array.");
        }
        
        const updates = {
          snippets: imported.snippets
        };
        if (imported.settings) updates.settings = imported.settings;
        
        chrome.storage.local.set(updates, () => {
          importStatus.textContent = "Import completed!";
          importStatus.style.color = "#10B981";
          updateStats();
          
          // Relay sync to all active tabs
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
              chrome.tabs.sendMessage(tab.id, { action: "sync-storage-data" }).catch(() => {});
            });
          });
          
          setTimeout(() => { importStatus.textContent = ""; }, 3000);
        });
      } catch (err) {
        importStatus.textContent = "Import error: " + err.message;
        importStatus.style.color = "#EF4444";
      }
    };
    reader.readAsText(file);
  });
});
