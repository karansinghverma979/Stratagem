# Showcase & Forking Guide ♟️

> **Stratagem is an immutable, feature-complete production showcase and open-source architectural reference.**

---

## 🏛️ Repository Status: Showcase Only

**Stratagem v3.0.0 is finished.** The application has reached its architectural goal as a high-velocity, cinematic Tactical Intelligence Operating System with zero technical debt, native SQLite Write-Ahead Logging, hardware-accelerated Cyber-Stasis power governance, and standalone Windows distribution.

### 🚫 Why Pull Requests Are Closed
To preserve the deterministic architecture, aesthetic integrity, and stability of this milestone release:
- **We do not accept external pull requests or unsolicited code modifications.**
- **We do not accept feature requests or roadmap proposals.**
- Any pull requests opened against this repository will be automatically acknowledged and closed by our GitHub Actions showcase sentry.

---

## 🍴 You Are Warmly Welcome to Fork!

If you want to add new features, experiment with the Svelte 5 + Electron architecture, change the HUD visuals, or adapt Stratagem for your own workflow, **you are enthusiastically encouraged to fork this repository**!

Under the terms of the **[MIT License](LICENSE)**, you have full freedom to:
- Fork the project and customize the codebase to your liking.
- Run, compile, and distribute your own personal or commercial builds.
- Extract patterns, shaders, audio hooks, or IPC architecture for your own software.

---

## 🛠️ Local Development & Fork Guide

If you have forked Stratagem and want to develop locally:

### 1. Prerequisites
- **Node.js**: v20.x or higher LTS
- **Package Manager**: `npm` (v10+)
- **OS**: Windows 10 / 11 x64 (Native support for Windows API power hooks)
- **C++ Build Tools**: Required for compiling native `better-sqlite3` bindings (`npm install -g windows-build-tools` or Visual Studio Build Tools).

### 2. Clone Your Fork
```bash
git clone https://github.com/<your-username>/Stratagem.git
cd Stratagem
```

### 3. Install Dependencies
```bash
npm ci
```

### 4. Run in Development Mode
Launch the Vite hot-reloading renderer and Electron main process concurrently:
```bash
npm run dev
```

### 5. Typecheck & Lint
```bash
npm run typecheck
npm run lint
npx prettier --check .
```

### 6. Compile Standalone Windows Installer
Generate production binaries (`.exe` installer and portable unpacked directory) in the `dist/` folder:
```bash
npm run build:win
```

---

## 📜 Licensing & Attribution

Stratagem is released under the **[MIT License](LICENSE)**. If you fork this project or reuse its architecture, please preserve the original copyright notice:

```text
Copyright (c) 2026 Karan Singh Verma
```

Thank you for exploring Stratagem! ♟️
