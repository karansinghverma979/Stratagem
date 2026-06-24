# 📑 STRATAGEM: OPERATIONAL & FUNCTIONAL REFERENCE MANUAL
> **Master Sector Guide, Window Functions, and Runtime Telemetry Architecture**

---

## 🧭 1. CORE SECTOR REFERENCE GUIDE

Stratagem's interface is divided into six operational tabs (Sectors), managed by Svelte routing blocks inside `App.svelte`.

```
                  ┌──────────────────────────────┐
                  │        TOP NAVIGATION        │
                  └──────────────┬───────────────┘
                                 │
         ┌───────────┬───────────┼───────────┬───────────┬───────────┐
         ▼           ▼           ▼           ▼           ▼           ▼
    ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
    │EXECUTION│ │ ARSENAL │ │ BREACH  │ │ ARCHIVE │ │ CHRONOS │ │ GENESIS │
    └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

### 📂 EXECUTION SECTOR (Mission Deployment Board)
* **Functional Purpose**: The central hub for active missions. It displays all tasks flagged with a status of `EXECUTION` inside the SQLite database.
* **UI Features**:
  * **Tactical Filter Bar**: Combines query string inputs with threat selectors (Low, Med, High) and dynamic sort toggles (by Deadline, Creation, or Alphabetical title).
  * **Interactive Task Cards**: Each card displays a priority color code (low=blue, med=amber, high=red), tags list, status readout, and a custom checked-state trigger.
  * **Waterfall Entry**: Cards use Svelte transitions to slide down sequentially upon loading.

### 🧬 ARSENAL SECTOR (Strategic Planning Board)
* **Functional Purpose**: A 3-column Kanban interface used to structure raw ideas, sketch out strategies, and queue tasks for deployment.
* **Columns**:
  1. `RAW INTEL`: Holds fresh tasks, brainstorm items, or system messages.
  2. `SYNTHESIZING`: Represents items undergoing active planning or details formulation.
  3. `WEAPONIZED`: Staging area. Dragging a card here triggers the **Task Forge** modal instantly.
* **Mechanics**:
  * Leverages native HTML5 drag-and-drop bindings.
  * Staged data changes update the `status` string in the SQLite database instantly.
  * Emits physical audio clacks on successful drops.

### 🚨 BREACH SECTOR (System Compromises Panel)
* **Functional Purpose**: Monitors compromised, overdue, or failed missions that require urgent correction or termination.
* **UI Features**:
  * Framed inside a **Tactical Red** vignette that pulses on active compromises.
  * Encapsulates a stuttering canvas-like color-split glitch text header.
  * **Inline Mitigation Controls**: Offers immediate actions to re-schedule, change threat priority, or trigger the **Purge** protocol.

### 🗄️ ARCHIVE SECTOR (Historical Operations Registry)
* **Functional Purpose**: A read-only historical timeline containing all completed (`VICTORY`) or terminated (`ABORTED`) missions.
* **UI Features**:
  * Alternating vertical nodes mapping the chronological completion path of historical data.
  * Nodes are flagged with custom glowing badges (Emerald for Victory, Crimson for Abort).
  * Clicking an entry initiates a **Svelte-tweened cryptographic decryption animation** that decrypts parameters letter-by-letter, then opens a detailed after-action report modal.

### ⏱️ CHRONOS SECTOR (Temporal Sync Focus Station)
* **Functional Purpose**: An integrated Pomodoro-style focus scheduler and task list interface.
* **UI Features**:
  * **Circular Progress Ring**: SVG ring that shrinks and glows to represent time counts.
  * **Deep Focus Mode**: Toggling this blocks out surrounding UI sections, adds a CRT scanline monitor overlay, and floats a small, transparent holographic mini-timer that remains visible when navigating to other sectors.
  * **Background Persistence**: Countdown logic runs via a global window interval inside `chronos-store.js`, ensuring tracking survives sector routing.

### ⚙️ GENESIS SECTOR (Core Configuration Panel)
* **Functional Purpose**: The settings panel that houses local parameter toggles, companion configs, and skill configurations.
* **UI Features**:
  * **Toggle Controls**: Custom spring glassmorphic sliders.
  * **NoteCards Portal**: Settings path configuration for user reference cards and developer images.
  * **Mental Skill Tree**: Active interactive nodes that serve as visual dashboards for operator progression.

---

## 🖥️ 2. SYSTEM OVERLAYS & DIALOGS

### 🛠️ THE TASK FORGE MODAL (Mission Authorization Console)
* **Trigger**: Click the floating action button (FAB) in the bottom-right corner, or drag any card to the `WEAPONIZED` column in the Arsenal board.
* **Core Components**:
  * **Omni-Scope v6.0**: A highly detailed target selector scope. Moving your cursor over it triggers target acquisition locks: all lines turn crimson, speed spins accelerate, and sound telemetry clips play.
  * **Status Validation Card**: Dynamically reads input characters, checking designation length and validating parameters.
  * **Temporal Anchor**: A custom date selector button that formats dates as `DD-MM-YYYY` and pops open the `TemporalNexus.svelte` calendar grid.
  * **Brain/Thunderbolt Minicards**: Displays large 48x48 animated icons representing input states (synaptic firing brain nodes or discharging lightning thunderbolts).

### 🛡️ SYSTEM INTELLIGENCE HUB (Diagnostic Console)
* **Trigger**: Click the `STRATAGEM` brand text in the top navigation bar.
* **Core Components**:
  * **Asymmetrical 2x2 Grid**: Highlights metrics (mission counts, archive sizes), database paths, import/export buttons, and the system purge console.
  * **Open File Location**: Uses Electron's native shell bridge to open the SQLite database folder directly in Windows Explorer.
  * **Backup Backups**: Triggers file copying to save backup `.db` assets and JSON configurations safely, with status checks.

### ☣️ CRITICAL PURGE DIALOG (Nuke Storage)
* **Trigger**: Click the red "Nuke Storage" button inside the System Intelligence Hub.
* **Core Components**:
  * **Database Snapshots**: A 4-column real-time table displaying current missions and configurations.
  * **60s Countdown Circular Ring**: A pulsing crimson timer. Once it hits 0, it calls the SQLite database purge scripts.
  * **Safeguards Tape**: An animated diagonal scrolling hazard tape warning of system wipe operations.
  * **Abort Console**: Prompts to cancel the purge. If clicked, it returns system states to normal.
  * **Window Dump Vibration**: Shakes the application window dynamically to simulate system tension.
  * **Reboot Protocol**: Once purged, the screen locks out all tabs and displays a cyan reboot button to reload the database.

### ⌨️ THE COMMAND PALETTE MATRIX
* **Trigger**: Press `Ctrl + K` at any time.
* **Core Components**:
  * A text search console that matches input queries against active missions.
  * Allows the user to jump directly to any sector or task protocols via rapid keyboard selection.
