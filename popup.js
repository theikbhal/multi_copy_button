// Javascript for Outreach CRM & Multi-Copy Extension Popup

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const toggleBtn = document.getElementById("toggle-btn");
  const exportBtn = document.getElementById("export-btn");
  const importFile = document.getElementById("import-file");
  const importStatus = document.getElementById("import-status");
  
  const statTotal = document.getElementById("stat-total");
  const statReplied = document.getElementById("stat-replied");
  const statInstagram = document.getElementById("stat-instagram");
  const statYoutube = document.getElementById("stat-youtube");

  // Load and display statistics
  function updateStats() {
    chrome.storage.local.get(["accounts", "statuses"], (data) => {
      const accounts = data.accounts || [];
      const total = accounts.length;
      
      // Calculate statistics
      let repliedCount = 0;
      let instagramCount = 0;
      let youtubeCount = 0;
      
      accounts.forEach(acc => {
        // Platform count
        if (acc.platform === "instagram") {
          instagramCount++;
        } else if (acc.platform === "youtube") {
          youtubeCount++;
        }
        
        // Replied check (case insensitive check on status name)
        if (acc.status && acc.status.toLowerCase() === "replied") {
          repliedCount++;
        }
      });
      
      // Render stats
      statTotal.textContent = total;
      statReplied.textContent = repliedCount;
      statInstagram.textContent = instagramCount;
      statYoutube.textContent = youtubeCount;
    });
  }

  // Initial call
  updateStats();

  // Handle Toggle Button Click
  toggleBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "toggle-active-tab-panel" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error communicating with extension:", chrome.runtime.lastError);
        alert("Make sure you are on a webpage (not a Chrome internal page or new tab) and try reloading the page.");
        return;
      }
      if (response && !response.success) {
        console.warn("Could not toggle panel on page:", response.error);
        alert("Make sure the page is fully loaded and is not a chrome:// or extensions store page.");
      }
    });
  });

  // Handle Export Data
  exportBtn.addEventListener("click", () => {
    chrome.storage.local.get(null, (data) => {
      // Create export object containing database structures
      const backupData = {
        accounts: data.accounts || [],
        snippets: data.snippets || [],
        statuses: data.statuses || [],
        settings: data.settings || {},
        version: "1.0",
        exportedAt: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      // Use chrome.downloads if available or simple HTML5 download anchor
      const a = document.createElement("a");
      a.href = url;
      a.download = `outreach_crm_backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      importStatus.textContent = "Backup downloaded!";
      importStatus.style.color = "#10B981";
      setTimeout(() => { importStatus.textContent = ""; }, 3000);
    });
  });

  // Handle Import Data
  importFile.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        
        // Simple structure validation
        if (!imported.accounts && !imported.snippets) {
          throw new Error("Invalid backup file: must contain accounts or snippets.");
        }
        
        const updates = {};
        if (imported.accounts) updates.accounts = imported.accounts;
        if (imported.snippets) updates.snippets = imported.snippets;
        if (imported.statuses) updates.statuses = imported.statuses;
        if (imported.settings) updates.settings = imported.settings;
        
        chrome.storage.local.set(updates, () => {
          importStatus.textContent = "Data imported successfully!";
          importStatus.style.color = "#10B981";
          updateStats();
          
          // Notify active tabs that data has changed
          chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
              chrome.tabs.sendMessage(tab.id, { action: "sync-storage-data" }).catch(() => {
                // Ignore errors on pages where extension is not loaded
              });
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
