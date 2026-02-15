# Kayorama Autopilot
> **The Ultimate AI Code Acceptance Tool for VS Code**

[![Version](https://img.shields.io/visual-studio-marketplace/v/Kayorama.kayorama-autopilot?style=flat-square&color=blue)](https://marketplace.visualstudio.com/items?itemName=Kayorama.kayorama-autopilot)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/Kayorama.kayorama-autopilot?style=flat-square&color=blue)](https://marketplace.visualstudio.com/items?itemName=Kayorama.kayorama-autopilot)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/Kayorama.kayorama-autopilot?style=flat-square&color=blue)](https://marketplace.visualstudio.com/items?itemName=Kayorama.kayorama-autopilot)

<a href="https://ko-fi.com/kayorama" target="_blank">
  <img src="https://storage.ko-fi.com/cdn/kofi2.png?v=3" alt="Buy Me a Coffee at ko-fi.com" height="36" style="border:0px;height:36px;">
</a>

## ⚡️ Transform Your AI Workflow
**Stop clicking "Accept". Start coding.**

Kayorama Autopilot is the missing link between your AI assistant and your code editor. It automatically detects and accepts code suggestions, chat responses, and refactoring previews, allowing you to stay in the flow.

**Compatible with:**
*   ✅ **GitHub Copilot** (Inline & Chat)
*   ✅ **Supermaven**
*   ✅ **VS Code Native Chat**
*   ✅ **Refactoring Previews**

---

## 🌟 Key Features

### 1. **Zero-UI Interaction (Native Mode)**
Out of the box, Autopilot hooks into VS Code's native command system to automatically trigger "Accept" actions for:
*   Inline Completions (`Tab`)
*   Chat Responses (`Insert`)
*   Refactoring Previews (`Apply`)

### 2. **Deep DOM Inspection (Pro Mode)**
For power users, the **CDP Engine (Chrome DevTools Protocol)** pierces through VS Code's internal Iframes and Webviews to find and click buttons that the native API can't reach.
*   **"Accept all"** buttons in complex Chat interfaces.
*   **"Apply"** buttons in propriety extension sidebars.
*   **Green Flash:** Visual confirmation when a button is clicked.

### 3. **Smart Safety System**
*   **Text Recognition:** Prioritizes exact matches like `"Accept all"`, `"Apply"`, `"Insert"`.
*   **Blacklist Protection:** actively avoids destructive text like `"Delete"`, `"Discard"`, `"Cancel"`.
*   **Context Awareness:** Ignores non-clickable status bars and tabs.

---

## 🚀 Getting Started

### **Mode A: Native (Plug & Play)**
**Best for:** Most users, GitHub Copilot.
1.  Install the extension.
2.  That's it! Autopilot will now try to accept suggestions automatically using internal commands.

### **Mode B: Pro (CDP Enhanced)**
**Best for:** Complex agents, Chat windows, "Accept All" buttons.
*Requires launching VS Code with a special flag.*

**macOS / Linux:**
```bash
open -n -a "Antigravity" --args --remote-debugging-port=9000
```

**Windows:**
```powershell
code --remote-debugging-port=9000
```

**Verify Connection:**
Look at the Status Bar (Bottom Right):
*   `$(check) Auto: ON (CDP: 1)` — **Connected & Empowered.**
*   `Auto: ON (CDP: 0)` — **Native Mode Only.**
*   `$(circle-slash) Auto: OFF` — **Paused.**

---

## ⚙️ Configuration

| Setting | Default | Description |
| :--- | :--- | :--- |
| `kayorama.cdpPort` | `9000` | The internal debugging port. Must match your launch flag. |

## 🔧 Troubleshooting

**"It's not clicking in Chat"**
*   Ensure you are using **Pro Mode** (CDP). Chat windows are often inside Iframes which native commands struggle to reach.
*   Check the Output log: `View > Output > Kayorama Autopilot`.

**"It says CDP: 0"**
*   This means you are running in **Native Mode**. It will still work for basic inline suggestions, but advanced button clicking is disabled.
*   To fix, restart VS Code with the `--remote-debugging-port=9000` flag.

---

<p align="left">
  <img src="https://img.shields.io/badge/Made_by-Kayorama-black?style=for-the-badge" alt="Made by Kayorama">
</p>
