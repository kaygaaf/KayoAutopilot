# Kayorama Autopilot
> **Automated Code Acceptance for VS Code**

![Version](https://img.shields.io/visual-studio-marketplace/v/Kayorama.kayorama-autopilot?style=flat-square&color=blue)
![Installs](https://img.shields.io/visual-studio-marketplace/i/Kayorama.kayorama-autopilot?style=flat-square&color=blue)
![Rating](https://img.shields.io/visual-studio-marketplace/r/Kayorama.kayorama-autopilot?style=flat-square&color=blue)

<a href="https://ko-fi.com/kayorama" target="_blank">
  <img src="https://storage.ko-fi.com/cdn/kofi2.png?v=3" alt="Buy Me a Coffee at ko-fi.com" height="36" style="border:0px;height:36px;">
</a>

**Autopilot** bridges the gap between *suggestion* and *action*.

Designed for **GitHub Copilot**, **Supermaven**, and **custom AI workflows**, it detects "Accept" buttons in the UI and triggers them instantly. It transforms your coding flow from "Review → Click → Continue" to simply "Review → Continue".

---

## ⚡️ Features

*   **Zero-UI Interaction:** Automatically clicks "Accept", "Accept all", and "Apply" buttons in Chat and Inline libraries.
*   **CDP Engine (v8.0+):** Uses Chrome DevTools Protocol to "pierce" through VS Code's internal iframes and webviews.
*   **Smart Recognition:**
    *   **Text Analysis:** Prioritizes exact matches like "Accept all".
    *   **Context Awareness:** Ignores status bars, tabs, and non-clickable text.
    *   **Shadow Hunter:** Recursively scans Shadow DOMs to find buttons hidden deep in extension UIs.
*   **Safety Guards:** Built-in blacklists prevent accidental clicks on destructive actions (Delete, Cancel, Discard).

## 🚀 Setup
**Option 1: Native Mode (Easiest)**
Just install the extension. It will attempt to use internal VS Code commands to accept suggestions.
*Note: This mode is less precise but requires no configuration.*

**Option 2: Pro Mode (Recommended)**
For 100% reliability and visual feedback (Green Flash), launch VS Code with the debug port:

**macOS / Linux**
```bash
code --remote-debugging-port=9000
```

**Windows**
```powershell
code --remote-debugging-port=9000
```

**2. Verify Connection**
Look at the Status Bar in the bottom right corner:
*   `$(check) Auto: ON (CDP: 1)` — **Connected.** Ready to accept.
*   `Auto: ON (CDP: 0)` — **Disconnected.** Did you use the launch flag?
*   `$(circle-slash) Auto: OFF` — **Paused.** Click to toggle.

## ⚙️ Configuration

| Setting | Default | Description |
| :--- | :--- | :--- |
| `kayorama.cdpPort` | `9000` | The internal debugging port. Must match your launch flag. |

## 🔧 Troubleshooting

**"It says CDP: 0"**
*   Ensure you launched VS Code from the terminal with `--remote-debugging-port=9000`.
*   **macOS Users:** You must fully quit VS Code (`Cmd+Q`) before launching from the terminal for the flag to take effect.

**"It's not clicking"**
1.  **Visibility:** The button must be visible on screen. Autopilot mimics a user click.
2.  **Inspector:** Run the command `Kayorama: Inspect DOM`. This will log all visible targets to the Output panel.
3.  **Logs:** Check the "Output" tab -> "Kayorama Autopilot" for details.

---



<p align="left">
  <img src="https://img.shields.io/badge/Made_by-Kayorama-black?style=for-the-badge" alt="Made by Kayorama">
</p>
