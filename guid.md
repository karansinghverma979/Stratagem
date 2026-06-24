# 🧭 STRATAGEM: OPERATOR ONBOARDING & DEVELOPMENT PROTOCOL
> **Developer Setup, Cloning Walkthrough, Compilation Targets, and Feature Extension Guide**

---

## ⚡ 1. REPOSITORY CLONING & INITIALIZATION

To clone and initialize the **Stratagem** codebase in your local environment, execute the following commands in sequence:

```bash
# 1. Clone the repository from GitHub
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git

# 2. Enter the project root directory
cd YOUR_REPOSITORY_NAME
```

---

## 🛠️ 2. DEPENDENCY BOOTSTRAPPING (FIRST-TIME SETUP)

Because the project utilizes native C++ bindings for the **SQLite3** database, you must build the binaries to match your system.

### Prerequisites
Ensure you have **Node.js** (v18 or higher) and **npm** installed on your system.

### Installation Steps
```bash
# 1. Install Node modules and build dependencies
npm install

# 2. Rebuild Native Modules (Syncs the SQLite3 driver with your active Electron runtime version)
npm run postinstall
```

> [!WARNING]
> If step 2 fails with C++ compiler errors, you need to install C++ build tools on your system:
> * **Windows**: Open PowerShell as administrator and run `npm install --global windows-build-tools` OR install the **Desktop Development with C++** workload via the Visual Studio Installer.
> * **macOS**: Run `xcode-select --install` in your terminal.

---

## 🏃 3. RUNNING THE SYSTEM (LOCAL DEVELOPMENT)

Once bootstrapping is complete, you can launch the application in development mode with hot reloading:

```bash
# Start standard Electron dev server
npm run dev

# Start development mode with Nudity bypass flags enabled (for testing Genesis assets)
npm run dev:nude
```

---

## 📦 4. PRODUCTION COMPILATION & PACKAGING

To package the application into a standalone installer, run the compiler corresponding to your target operating system:

```bash
# Build standalone Windows setup installer (.exe)
npm run build:win

# Build macOS app bundle (.dmg)
npm run build:mac

# Build Linux distribution packages (.AppImage, .deb)
npm run build:linux
```

The resulting packages will be generated inside the `/dist` directory in your project root:
* **Windows Installer Output**: `dist/Stratagem-1.0.1-setup.exe`
* **Unpacked Portable Directory**: `dist/win-unpacked/`

---

## 📂 5. CODEBASE DIRECTORY BLUEPRINT

Before writing any code, review this file layout to understand where logic is stored:

```
YOUR_REPOSITORY_NAME/
├── build/                # NSIS Installer script templates (installer.nsh) & app icons
├── resources/            # Production asset resource folder
├── src/
│   ├── main/             # Main process (Node/Electron context)
│   │   ├── database.js   # SQLite database connection, table schemas, and queries
│   │   ├── registry.ts   # Windows registry query readers
│   │   └── index.ts      # Main entry point: windows initialization and IPC handlers
│   ├── preload/          # Inter-process communication (IPC) context bridges
│   │   ├── index.ts      # Exposes database & system APIs securely to window context
│   └── renderer/         # Frontend application context (Svelte 5 & Vite)
│       └── src/
│           ├── components/# Global UI elements (Top navigation, Notification Engine)
│           ├── core/     # Audio engines, global Svelte stores, and system configurations
│           └── sectors/  # Isolated tabs/viewports (Execution, Arsenal, Chronos, etc.)
```

---

## 🚀 6. DEVELOPER GUIDE: EXTENDING STRATAGEM

### How to Add a New Sector (Tab)
If you want to introduce a new Sector viewport to the application:

1. **Create the Sector files**:
   Create a new directory inside `src/renderer/src/sectors/YourNewSector/`. Create `YourNewSector.svelte` as the main shell.

2. **Add Tab navigation**:
   Open `src/renderer/src/components/TopNavigation.svelte`:
   * Add your new Sector name to the `sectors` array (line 7).
   * Inside the button loop, add your Sector's custom SVG tab icon.

3. **Configure Routing**:
   Open `src/renderer/src/App.svelte`:
   * Import your new Sector component at the top of the file.
   * Inside the router routing block (around line 200), add a conditional check:
     ```svelte
     {#else if currentSector === 'YourNewSector'}
       <YourNewSector />
     {/if}
     ```

### How to Create a New Database IPC Channel
If you need to query the database from your new sector:

1. **Add the query function**:
   Open `src/main/database.js`. Define your promise-based SQLite function, and export it:
   ```javascript
   export function customFetchData(param) {
     return new Promise((resolve, reject) => {
       db.all("SELECT * FROM my_table WHERE key = ?", [param], (err, rows) => {
         if (err) reject(err);
         else resolve(rows);
       });
     });
   }
   ```

2. **Register the IPC handler**:
   Open `src/main/index.ts`. Import your database function and add an `ipcMain.handle` listener:
   ```typescript
   import { customFetchData } from './database';
   // inside your app initialization block:
   ipcMain.handle('db-custom-fetch', async (_, param) => {
     return await customFetchData(param);
   });
   ```

3. **Expose the Preload API**:
   Open `src/preload/index.ts`. Expose the channel through `contextBridge`:
   ```typescript
   const stratagemAPI = {
     customFetch: (param: string) => ipcRenderer.invoke('db-custom-fetch', param),
   }
   ```
   *(Ensure you update `src/preload/index.d.ts` to keep the TypeScript compiler happy!)*

4. **Call the API from Svelte**:
   In your Svelte component, call the function asynchronously:
   ```javascript
   onMount(async () => {
     const data = await window.stratagemAPI.customFetch('my-param');
     console.log(data);
   });
   ```
