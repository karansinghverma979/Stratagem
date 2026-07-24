# 🌌 STRATAGEM v2.3 / v2.0 LATEST RELEASE DOCUMENTATION & RELEASE NOTES
> **Classified Tactical Operations Terminal — System Architecture & Change Telemetry**

---

## 🛰️ EXECUTIVE RELEASE SUMMARY
**Stratagem Latest Version** represents a major architectural, performance, and feature update to the classified FUI strategic planner application. This release upgrades data persistence, eliminates UI thread latency, resolves timezone date-shift anomalies, and transforms companion engagement telemetry from volatile time-tracking to a persistent, click-based milestone system.

---

## ⚡ KEY HIGHLIGHTS & NEW FEATURES

### 1. 🖼️ Companion Nudity Interface: Click-Based Unlock Telemetry
- **Complete Removal of Legacy Time Countdown**: Retired `notecardsActiveSeconds` timer, `nudeModeRemainingSeconds` countdown, and 1-second ticker loops.
- **Milestone Click Ratio (1,440 : 60)**:
  - **Unlock Requirement**: **1,440 NoteCards image-change clicks** unlocks the Nudity Interface.
  - **Allocation Quota**: Unlocking awards **60 Nudity image-change clicks**.
- **Click Validation Guard**: Increments and decrements ONLY trigger when clicking directly on the avatar image and when the image successfully changes to a new asset (`imgRes.success`).
- **Auto-Reversion & Quota Reset**: When `nudeClicksRemaining` reaches `0`, the interface automatically locks, reverts to NoteCards Mode, and resets the NoteCards click counter to `0`.
- **SQLite Configuration Persistence**: Click counts (`notecardsClickCount`, `nudeClicksRemaining`) are stored in `stratagem_intel.db` config table, preserving progress across app restarts.
- **Settings Panel Telemetry Gauges**: Real-time HUD gauges displaying progress (`LOCKED: X / 1,440 CLICKS` or `QUOTA: X / 60 CLICKS`).

---

### 2. ⚡ Instant Genesis Sector Navigation (0ms Latency)
- **Non-Blocking Asset Scanning**: Converted `loadImagesList()` in `DeveloperPanel.svelte` to a non-blocking asynchronous Promise chain.
- **Zero UI Stalls**: Prevents IPC file system reads from blocking Svelte's mounting lifecycle, enabling instant (0ms) sector switching to Genesis.

---

### 3. 📅 Date & Timezone Integrity Engine
- **Archive Local Date Parsing (`ArchiveTaskRow.svelte`)**: Fixed UTC-to-local timezone shift backwards by parsing `YYYY-MM-DD` strings into explicit local year, month, and day components (`new Date(year, month - 1, day)`).
- **Breach UTC Formatting (`BreachTaskView.svelte`)**: Synchronized space-separated SQLite UTC timestamps into ISO-8601 strings, matching `MissionProtocol.svelte` display logic.
- **Calendar Initial Date Synchronization (`TemporalNexus.svelte` & `TaskForgeModal.svelte`)**: Added reactive `$effect` and `initialDate` props to ensure smooth calendar selection across modal openings.

---

### 4. 🛡️ Main Process, Database & Concurrency Hardening
- **SQLite WAL Checkpoint on Exit (`index.ts`)**: Added `app.on('before-quit')` and `app.on('window-all-closed')` hooks to trigger `PRAGMA wal_checkpoint(FULL)` before process termination.
- **Submission Lock Guard (`TaskForgeModal.svelte`)**: Added atomic `if (isProcessing) return;` guard in `initiateMission()` to prevent double-click mission duplications.
- **Chronos Stopwatch Tab-Switch Continuity (`ChronosSector.svelte`)**: Accrues elapsed time into `stopwatchElapsedBefore` on sub-tab navigation to prevent stopwatch timer drift.
- **Code Clean-up (`store.js` & `App.svelte`)**: Eliminated duplicate top-level exports and legacy ticker subscriptions.

---

## 📋 DETAILED CHANGELOG & MODIFIED MODULES

| Module / Component | Type | Description |
| :--- | :--- | :--- |
| `src/main/index.ts` | **Database & Lifecycle** | Added WAL checkpoint handlers on app quit; registered DevPanel IPC handlers. |
| `src/renderer/src/core/store.js` | **State Engine** | Implemented `recordNoteCardsImageClick` and `recordNudityImageClick`; removed legacy time ticker. |
| `src/renderer/src/App.svelte` | **App Core** | Removed legacy `startTicker`/`stopTicker` imports and lifecycle hooks. |
| `src/renderer/src/sectors/Genesis/.../DeveloperPanel.svelte` | **Performance** | Converted `onMount` image scanning to non-blocking async execution. |
| `src/renderer/src/sectors/Genesis/.../NoteCards.svelte` | **Feature** | Integrated `recordNoteCardsImageClick()` on valid image change. |
| `src/renderer/src/sectors/Genesis/.../Nudity.svelte` | **Feature** | Integrated `recordNudityImageClick()` on valid image change. |
| `src/renderer/src/sectors/Genesis/.../SettingsPanel.svelte` | **HUD UI** | Updated Nudity card HUD to display click progress and quotas. |
| `src/renderer/src/sectors/Archive/.../ArchiveTaskRow.svelte` | **Fix** | Corrected `YYYY-MM-DD` parsing to prevent timezone day-rollback. |
| `src/renderer/src/sectors/Breach/.../BreachTaskView.svelte` | **Fix** | Standardized UTC timestamp formatting for Breach task inspection. |
| `src/renderer/src/sectors/Forge/.../TaskForgeModal.svelte` | **Fix / UX** | Added double-click submission lock and calendar initial date sync. |
| `src/renderer/src/sectors/Chronos/.../ChronosSector.svelte` | **Fix** | Fixed elapsed time calculations when switching tabs inside Chronos. |

---

## 🛠️ VERIFICATION & COMPILATION TELEMETRY

- **Svelte & TypeScript Diagnostics (`npm run typecheck`)**: `0 errors, 0 warnings`
- **Vite Production Bundler (`npx electron-vite build`)**: `242 modules transformed cleanly in 4.32s`
- **Electron Executable Builder (`npm run build:win`)**:
  - Installer: `dist/Stratagem-2.0.0-setup.exe`
  - Unpacked Application: `dist/win-unpacked/Stratagem.exe`

---

## 🚀 RELEASE INSTRUCTIONS
1. Deploy `dist/Stratagem-2.0.0-setup.exe` to GitHub Release Assets.
2. Attach `Stratagem Latest.md` release notes to the release tagged `v2.3` / `v2.0-latest`.

---
*Stratagem System Architecture — High-Fidelity Tactical Command Interface*
