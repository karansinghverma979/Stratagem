# 🛰️ STRATAGEM v1.0.1
> **Classified Tactical Intelligence Operating System & Mission Control Matrix**

---

![Security Clearance](https://img.shields.io/badge/Security--Clearance-LEVEL--4-red?style=for-the-badge)
![System State](https://img.shields.io/badge/System--State-ACTIVE-brightgreen?style=for-the-badge)
![Release build](https://img.shields.io/badge/Build-v1.0.1--Production-blueviolet?style=for-the-badge)

Welcome to the official Operator's Manual for **Stratagem 1.0.1**—a highly advanced, cinematic **Futuristic User Interface (FUI)** project planning and tactical execution suite. 

This document serves as the master guide to all operational sectors, dashboard windows, and diagnostic consoles within the system.

<img width="512" height="512" alt="icon" src="https://github.com/user-attachments/assets/2748268e-f1d1-4948-b178-deb3f53f5c4d" />


---

## 🛠️ CORE SYSTEM COMPONENT DOCUMENTATION


## 0. SYSTEM BOOT SEQUENCE (Cold Boot Loading Screen)

<img width="2879" height="1799" alt="Screenshot 2026-06-25 051940" src="https://github.com/user-attachments/assets/bb7b9956-8fe0-487e-97b4-4ed835d09d9f" />

* **UI & Aesthetics**: A dark, full-screen holographic terminal overlay. Employs a scrolling diagnostics log printing hexadecimal address blocks, loading status indicators, and system checks. Features an oversized header reading `SYSTEM BOOT SEQUENCE` with a shimmering neon gradient pulse and high-contrast typography.
* **Function & Abilities**: Plays the `cold-boot` console chime on mount. Runs a sequential initialization loop checking Electron IPC connections, querying registry portals, and mounting the SQLite database. Once complete, it executes a Svelte transition fade-out to reveal the main workspace.

---

### 1. CRITICAL PURGE CONSOLE (Nuke Storage Protocol)

<img width="2879" height="1799" alt="Screenshot 2026-06-25 044836" src="https://github.com/user-attachments/assets/74945c67-9b65-4fd8-944a-caa844c2497d" />

* **UI & Aesthetics**: High-intensity Tactical Red glassmorphic full-screen overlay. Includes a neon-glowing 60-second circular progress countdown SVG, a diagonal scrolling caution safeguard tape animation, and a real-time data table showing active system snapshots. The container is subject to a kinetic vibration effect (`dumpShake` keyframe loop) when active.
* **Function & Abilities**: A lock-out screen that suspends all other UI interactions. Once authorized, it initiates a complete transactional database purge, deleting all rows in `missions` and `audit_log`, resetting configs, and displaying a Cyan-themed `SYSTEM REBOOT` controller to reinitialize the empty database workspace.

---

### 2. DATABASE INTEGRITY STATION (System Backup Matrix)

<img width="2879" height="1799" alt="Screenshot 2026-06-25 044823" src="https://github.com/user-attachments/assets/bb199aa2-32aa-4d54-965f-40fd4bc6b09c" />


* **UI & Aesthetics**: Located inside the Intelligence Hub modal, styled with glowing emerald and cyan borders. Features database path readouts with a pen-and-paper SVG cursor hover effect, and diagnostic progress bars.
* **Function & Abilities**: Links the user to native Windows shell functions to open the database filepath directly in Windows Explorer. Contains triggers for local `.db` binary exporting and JSON config backups, showing stateful color indicators (orange for processing, green for success, red for failures) and displaying holographic copy notifications.

---

### 3. NEURAL LINK STATION (Diagnostics Feed Console)

<img width="2879" height="1799" alt="Screenshot 2026-06-25 044722" src="https://github.com/user-attachments/assets/7182c6f0-bf4c-4edb-9aae-791f855c4c9a" />


<img width="2879" height="1799" alt="Screenshot 2026-06-25 044905" src="https://github.com/user-attachments/assets/ac28d791-d24a-4b80-a372-208844383b14" />


<img width="2879" height="1799" alt="Screenshot 2026-06-25 044916" src="https://github.com/user-attachments/assets/fea94212-d9a2-45d8-8d9e-32009225b70a" />



* **UI & Aesthetics**: A vertically layout terminal console streaming simulated cybernetic synchronization telemetry logs. Uses mono-spaced font weights, dotted data matrices, and active checking marks.
* **Function & Abilities**: Handles custom configuration file imports. Displays real-time validation checks for uploaded data schemas. If a file is successfully parsed, it triggers store syncs and plays the `success-ping` sound; otherwise, it highlights structural syntax errors in red.

---

### 4. FORGE STATION (Task Forge Modal)

<img width="2879" height="1799" alt="Screenshot 2026-06-25 045010" src="https://github.com/user-attachments/assets/e2a46996-f036-420d-bdd2-2859a7bd178d" />


* **UI & Aesthetics**: A prominent modal overlay (spanning 75vw) featuring a 3D glassmorphic panel, high-contrast inputs, and a target validation telemetry card on the top right. Displays the primary **Omni-Scope v6.0** targeting reticle.
* **Function & Abilities**: The central command window for adding new missions. Operator inputs are dynamically validated for length and characters. Provides priority selectors, tactical tags configurations, and integrates the temporal date scheduler, writing entries directly into SQLite.

---

### 5. TEMPORAL NEXUS (Forge Calendar Engine)

<img width="2879" height="1799" alt="Screenshot 2026-06-25 045033" src="https://github.com/user-attachments/assets/55100b73-8dff-4313-937b-a6ba28c043b0" />


* **UI & Aesthetics**: A 500px circular grid layout representing dates, styled with thin glowing lines, month/year selector dropdown menus, and neon indicators.
* **Function & Abilities**: A custom-coded calendar calendar grid utilizing timezone arithmetic and leap-year calculations. Blocks selection of past dates, highlights target dates in neon cyan, and outputs selected date captures back to the parent Forge modal.

---

### 6. MISSION PROTOCOL MODAL (Execution Task View)
<!-- --image: Mission Protocol Modal -- -->
* **UI & Aesthetics**: Oversized overlay (85vw width by 80vh height) featuring a 48px padding layout, deep backdrop blurs, and high-visibility typography (Outfit headers scaled to 2.5rem).
* **Function & Abilities**: Displays comprehensive parameters for a single mission. Houses sub-mission checkbox registries, threat adjustment dials, and outputs a scrolling chronological timeline log (`audit_log` table) detailing every state change the mission has undergone.

### 7. VICTORY / ABORT BADGES (Mission Resolutions)
<!-- --image: Victory and Abort badges -- -->
* **UI & Aesthetics**: Saturated neon badges embedded on historical rows. Completed missions display a glowing emerald badge marked `VICTORY`, while terminated ones display a crimson `ABORTED` badge.
* **Function & Abilities**: Clicking a completed or aborted mission badge locks edit capabilities (sets `readOnly` to true) and loads their corresponding resolution comments.

### 8. ARSENAL SECTOR (Strategic Kanban Board)
<!-- --image: Arsenal Sector Kanban Console -- -->
* **UI & Aesthetics**: Three-column tactical grid layout using Outfit headers and glowing volumetric borders. Column backdrops feature glassmorphic blurs.
* **Function & Abilities**: A Kanban planning system mapping the phases of project setup. Supports fluid HTML5 drag-and-drop actions, shuffling cards smoothly with Svelte `animate:flip`, and updating database states reactively on drop.

### 9. RAW INTEL & SYNTHESIZING (Kanban Columns)
<!-- --image: Raw Intel and Synthesizing columns -- -->
* **UI & Aesthetics**: Raw Intel column uses cyan border accents (Utility), representing unprocessed inputs. Synthesizing uses neon-violet highlights (Sync), representing tasks undergoing detail compilation.
* **Function & Abilities**: Serves as the pre-execution planning ground. Cards dragged between these columns execute instant database update promises without locking the main UI thread.

### 10. CALIBRATION STATION (Telemetry Filters & Sorting)
<!-- --image: Calibration Station Control Bar -- -->
* **UI & Aesthetics**: Expansive, 100% wide horizontal filter bar positioned directly below the top navigation. Designed with glassmorphic blurs, solid checkmark icons, and threat selection tabs.
* **Function & Abilities**: Enables real-time, non-blocking sorting and filtering of active missions. Evaluates sorting criteria (e.g., sort by deadline, alphabetically, or date created) and filters based on text match inputs.

### 11. BREACH SECTOR (Alarm Dashboard)
<!-- --image: Breach Sector Interface -- -->
* **UI & Aesthetics**: Wrapped inside a pulsing **Tactical Red** vignette glow, showcasing stuttering color-split glitch text headers, representing system alarms.
* **Function & Abilities**: Pulls all missions from the database where deadlines have passed or parameters are compromised. Keeps a persistent badge notification in the top bar navigation showing compromise counts.

### 12. BREACH TASK VIEW (Compromise Details Modal)
<!-- --image: Breach Task View Modal -- -->
* **UI & Aesthetics**: Centered overlay modal styled with red alarm borders and scrolling diagnostic metadata telemetry logs.
* **Function & Abilities**: Isolate a compromised task, inspect security breach timestamps, and determine why the system flagged the parameters.

### 13. REALIGNMENT STATION (Mitigation Dials)
<!-- --image: Realignment Station Controls -- -->
* **UI & Aesthetics**: Inline interactive buttons with glowing hover states.
* **Function & Abilities**: Initiates realignment for breached tasks. Allows the operator to immediately assign new temporal boundaries (dates), lower threat levels to clear alerts, or trigger system purge overrides.

### 14. CHRONOS SECTOR (Focus Sync Station)
<!-- --image: Chronos Sector -- -->
* **UI & Aesthetics**: Volumetric console featuring a central countdown timer, circular progress SVG rings, and side-aligned command panels.
* **Function & Abilities**: Handles temporal synchronization routines, combining Pomodoro timers, scheduled reminder notifications, stopwatch tracking, and todo logs.

### 15. CHRONOS FOCUS TIMER (Target Lock Progress Ring)
<!-- --image: Chronos Focus Timer Ring -- -->
* **UI & Aesthetics**: SVG neon-purple circular progress ring. When active, it displays target lock animations.
* **Function & Abilities**: A focus timer countdown. Once the timer reaches zero, it plays target lock alarms, resets state blocks, and records the session count.

### 16. CHRONOS TODO (Auxiliary Task Checklists)
<!-- --image: Chronos Todo Console -- -->
* **UI & Aesthetics**: A scrolling sidebar list with hollow checkbox indicators, green completion strikes, and thin borders.
* **Function & Abilities**: Handles minor, short-term tasks that don't require full Forge authorization. Stores checklist items inside the configuration store.

### 17. CHRONOS REMINDERS (Operational Alarms)
<!-- --image: Chronos Reminders List -- -->
* **UI & Aesthetics**: Grid cells showing time readouts, notification badges, and delete triggers.
* **Function & Abilities**: Allows scheduled time alarms. Once a reminder time is reached, it triggers the global Shield notification engine to display alerts.

### 18. CHRONOS STOPWATCH (Diagnostic Dial)
<!-- --image: Chronos Stopwatch Dial -- -->
* **UI & Aesthetics**: A secondary digital layout console displaying milliseconds readouts.
* **Function & Abilities**: Acts as a simple stopwatch tool for timing diagnostic operations.

### 19. GENESIS SECTOR (Central Configuration Panel)
<!-- --image: Genesis Sector -- -->
* **UI & Aesthetics**: Modular glassmorphic settings panel with neon violet accent sliders, toggle checkboxes, and diagnostic telemetries.
* **Function & Abilities**: The central command node to toggle companion modes, manage file directory paths (devImages, NoteCards, DB), and configure sound card diagnostics.

### 20. DEVELOPER PORTRAITS PANEL (devImages Configuration)
<!-- --image: Developer Portraits Panel -- -->
* **UI & Aesthetics**: Slide-out panel loading developer portrait grids, custom images, and telemetry data tables.
* **Function & Abilities**: Registers the directory portal path for developer portrait folders. Reads custom image files and updates the visual interface maps.

### 21. MENTAL SKILLS (Cognitive Improvement Nodes)
<!-- --image: Mental Skills Tree Node Panel -- -->
* **UI & Aesthetics**: Interactive node network grid (skill tree) displaying connected cognitive and operational nodes.
* **Function & Abilities**: Allows tracking personal goals and cognitive progression. Clicking nodes displays operational requirements and unlock statuses.

### 22. NOTECARDS (Cognitive Flashcard Portal)
<!-- --image: NoteCards Study Screen -- -->
* **UI & Aesthetics**: High-contrast card slides featuring text matrices, study logs, and next/previous button readouts.
* **Function & Abilities**: A diagnostic study tool loading note files from custom directories. Allows testing and flashcard revision logs.

### 23. ENVIRONMENT SETTINGS (System Toggles)
<!-- --image: Environment Settings Panel -- -->
* **UI & Aesthetics**: Row lists with active green/red toggles and volumetric slides.
* **Function & Abilities**: Direct toggle controls for sound card activation, global telemetry sweeps, background gradient animations, and registry queries overrides.

### 24. INTEGRATED IMPROVEMENT MATRIX (Neural Uplink Logs)
<!-- --image: Integrated Improvement Matrix Panel -- -->
* **UI & Aesthetics**: Scrolling diagnostic log tracking recent configuration improvements and task calibrations.
* **Function & Abilities**: Pulls logs from the database configurations, tracking system-wide adjustments and calibrations.

---

## 🚀 STANDALONE INSTALLATION & COMPILATION

For details on cloning this repository, installing dependencies, or compiling local builds, review **[guid.md](file:///C:/Users/karan/Void/Stratagem/N0_Furnace/guid.md)**.
For database schemas, preload APIs, and Svelte store references, review **[info.md](file:///C:/Users/karan/Void/Stratagem/N0_Furnace/info.md)**.

---
*Classified Document — Authorization Level 4 Required — Stratagem Core AI*
