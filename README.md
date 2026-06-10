# Multi Copy Button

A premium, open-source Google Chrome extension that allows you to create floating, draggable snippet buttons on any webpage. Copy templates, commands, colors, and notes to your clipboard instantly with a single click.

It includes a fully functional, premium landing page in the `website/` directory, ready to be deployed to Vercel.

---

## Key Features

- **Floating Custom Buttons**: Custom labels that hover directly on your screen.
- **Instant Copy**: Click once to copy the text to your clipboard.
- **Interactive Drag & Drop**: Place buttons anywhere on your screen. Positions are stored dynamically as percentages and persist on page reloads.
- **Smart Side Dock panel**: A collapsible side panel (accessed via the right screen handle) to search snippets, toggle page visibility, edit details, or create new snippets.
- **Domain Locking**: Keep buttons global across all web pages, or lock them to specific domains (e.g. only on `github.com` or `localhost`).
- **Interactive Onboarding**: A step-by-step interactive setup guide opens automatically on installation.

---

## Directory Layout

```
multi_copy_button/
├── README.md
├── extension/          # Chrome Extension source code (Manifest V3)
│   ├── manifest.json
│   ├── background.js   # Service worker
│   ├── content.js      # Script injected into host pages inside Shadow DOM
│   ├── content.css     # Shadow DOM component styles
│   ├── popup.html      # Browser toolbar control dashboard
│   ├── popup.js
│   ├── popup.css
│   ├── welcome.html    # Interactive onboarding & help page
│   ├── welcome.js
│   └── welcome.css
└── website/            # Product landing page
    ├── index.html      # Responsive landing page with interactive sandbox
    ├── styles.css
    └── script.js
```

---

## Getting Started

### 1. Load the Chrome Extension

1. Clone or download this repository:
   ```bash
   git clone https://github.com/theikbhal/multi_copy_button.git
   ```
2. Open Google Chrome and go to `chrome://extensions/`.
3. Toggle **"Developer mode"** in the top-right corner.
4. Click the **"Load unpacked"** button in the top-left corner.
5. Select the `extension/` directory of the cloned project folder.
6. The extension is now active! Try visiting any site or click the extension logo in the toolbar.

### 2. Run / Preview the Landing Page

The landing page resides in the `website/` directory. You can view it by running a simple server locally:

```bash
# Using python built-in server
cd website
python3 -m http.server 8000

# Or using Node.js npx
npx serve website
```

Then visit `http://localhost:8000` or `http://localhost:3000` in your browser.

---

## Deployment to Vercel

To deploy the landing page to Vercel, run the following command in the root folder:

```bash
npx vercel
```

Ensure you select `website` as the root directory during the Vercel deployment wizard.

---

## License

This project is licensed under the MIT License.
