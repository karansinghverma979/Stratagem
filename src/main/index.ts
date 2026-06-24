import { app, shell, BrowserWindow, ipcMain, dialog, screen } from 'electron'
import { join, extname } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import fs from 'fs'
import { 
  initDatabase, insertMission, fetchSectorMissions, 
  importDatabaseFile, purgeDatabase, getConfig, 
  setConfig, updateMissionStatus, validateDatabase,
  updateMissionAsRescheduled, updateMissionThreatLevel,
  deleteMission, updateMissionDetails,
  appendAuditLog, getAuditLog, updateResolutionComment, getMissionById,
  runDatabaseDiagnostics,
  verifyCoreSystem,
  verifySqliteMount,
  verifyHandshake,
  mergeDatabaseFile,
  seedDatabase,
  getDatabasePath
} from './database'
import { getRegistryValue } from './registry'

let mainWindow: BrowserWindow | null = null

interface CacheEntry {
  mtime: number
  base64: string
}

const fileCache = new Map<string, CacheEntry>()

function getCachedFileData(filePath: string, mimeType: string): string {
  const stat = fs.statSync(filePath)
  const mtime = stat.mtimeMs
  const cached = fileCache.get(filePath)
  if (cached && cached.mtime === mtime) {
    return cached.base64
  }
  const fileBuffer = fs.readFileSync(filePath)
  const base64Data = fileBuffer.toString('base64')
  const result = `data:${mimeType};base64,${base64Data}`
  
  if (fileCache.size >= 50) {
    const keys = Array.from(fileCache.keys())
    const oldestKey = keys[0]
    fileCache.delete(oldestKey)
  }
  
  fileCache.set(filePath, { mtime, base64: result })
  return result
}

function getNoteCardsDir(): string {
  const defaultDir = join(app.getPath('userData'), 'NoteCards');
  if (!app.isPackaged) {
    return join(process.cwd(), 'src', 'renderer', 'src', 'sectors', 'Genesis', 'GenesisMain', 'AIGirlPanel', 'NoteCards');
  }
  return getRegistryValue('NoteCardsPath', defaultDir);
}

function getDevImagesDir(): string {
  const defaultDir = join(app.getPath('userData'), 'devImages');
  if (!app.isPackaged) {
    return join(process.cwd(), 'src', 'renderer', 'src', 'sectors', 'Genesis', 'GenesisMain', 'DeveloperPanel', 'devImages');
  }
  return getRegistryValue('DevImagesPath', defaultDir);
}

function getNudityDir(): string {
  const defaultDir = join(app.getPath('userData'), 'Nudity');
  if (!app.isPackaged) {
    return join(process.cwd(), 'src', 'renderer', 'src', 'sectors', 'Genesis', 'GenesisMain', 'AIGirlPanel', 'Nudity');
  }
  return defaultDir;
}

function resolveAIGirlFolderPath(folderName: string): string {
  const isDev = !app.isPackaged;
  if (isDev) {
    return join(process.cwd(), 'src', 'renderer', 'src', 'sectors', 'Genesis', 'GenesisMain', 'AIGirlPanel', folderName);
  }

  if (folderName.startsWith('Nudity')) {
    const baseNudity = getNudityDir();
    const sub = folderName.substring('Nudity'.length);
    return join(baseNudity, sub);
  } else if (folderName.startsWith('NoteCards')) {
    const baseNoteCards = getNoteCardsDir();
    const sub = folderName.substring('NoteCards'.length);
    return join(baseNoteCards, sub);
  } else {
    return join(app.getPath('userData'), folderName);
  }
}

function ensureDirectoryPopulated(targetDir: string, resourceSubPath: string) {
  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    const files = fs.readdirSync(targetDir);
    const validFiles = files.filter(f => !f.startsWith('.'));
    if (validFiles.length === 0) {
      const sourceDir = join(process.resourcesPath, resourceSubPath);
      if (fs.existsSync(sourceDir)) {
        const defaultFiles = fs.readdirSync(sourceDir);
        for (const file of defaultFiles) {
          const srcFile = join(sourceDir, file);
          const destFile = join(targetDir, file);
          if (fs.statSync(srcFile).isFile()) {
            fs.copyFileSync(srcFile, destFile);
          }
        }
        console.log(`[AssetSync] Successfully populated ${targetDir} from resources/${resourceSubPath}`);
      } else {
        console.warn(`[AssetSync] Source resources directory not found: ${sourceDir}`);
      }
    }
  } catch (err) {
    console.error(`[AssetSync] Failed to populate target directory ${targetDir}:`, err);
  }
}

function syncDefaultAssets() {
  const isDev = !app.isPackaged;
  if (isDev) return;

  console.log('[AssetSync] Initializing asset synchronization protocol...');
  const defaultUserData = app.getPath('userData');
  
  const devImagesDir = getRegistryValue('DevImagesPath', join(defaultUserData, 'devImages'));
  const noteCardsDir = getRegistryValue('NoteCardsPath', join(defaultUserData, 'NoteCards'));
  const nudityDir = join(defaultUserData, 'Nudity');

  ensureDirectoryPopulated(devImagesDir, 'DeveloperPanel/devImages');
  ensureDirectoryPopulated(join(noteCardsDir, 'Cards'), 'NoteCards/Cards');
  ensureDirectoryPopulated(join(nudityDir, 'assets'), 'Nudity/assets');
  ensureDirectoryPopulated(join(nudityDir, 'effects'), 'Nudity/effects');
}

function createWindow(): void {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.bounds

  // Create the browser window.
  const win = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    fullscreen: true,
    kiosk: false,
    resizable: false,
    maximizable: false,
    minimizable: true,
    alwaysOnTop: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow = win

  win.on('ready-to-show', () => {
    win.show()
    win.maximize()
  })

  // Intercept default shortcut input events to strictly prevent escaping fullscreen
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' || input.key === 'Escape' || (input.key === 'Enter' && input.alt)) {
      event.preventDefault()
    }
  })

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Watch directories for live updates
  setupWatchers(win)
}

let dbFileExisted = false

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const windows = BrowserWindow.getAllWindows()
    if (windows.length) {
      const mainWindow = windows[0]
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  // Electron Initialization
  app.whenReady().then(() => {
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.stratagem.n0furnace')

    // Window control listeners
    ipcMain.on('window-close', () => app.quit())
    ipcMain.on('window-toggle-maximize', () => {
      if (mainWindow) {
        if (mainWindow.isMaximized()) mainWindow.unmaximize()
        else mainWindow.maximize()
      }
    })
    ipcMain.on('window-set-always-on-top', (_event, flag) => {
      if (mainWindow) mainWindow.setAlwaysOnTop(flag, 'screen-saver')
    })
    ipcMain.on('window-set-kiosk', (_event, flag) => {
      if (mainWindow) mainWindow.setKiosk(flag)
    })

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const dbPath = getDatabasePath()
  dbFileExisted = fs.existsSync(dbPath)

  // Initialize Database Persistence Layer
  initDatabase()
  seedQuotesDir()
  syncDefaultAssets()

  // Sync auto-launch configuration settings on app boot
  try {
    getConfig().then((config: any) => {
      if (config && config.appLaunchOnStartup !== undefined) {
        const flag = config.appLaunchOnStartup === true || config.appLaunchOnStartup === 'true';
        app.setLoginItemSettings({
          openAtLogin: flag,
          path: app.getPath('exe')
        });
        console.log(`[AutoLaunch] Loaded startup configuration: openAtLogin = ${flag}`);
      }
    }).catch(err => {
      console.error('[AutoLaunch] Failed to load startup config from DB:', err);
    });
  } catch (err) {
    console.error('[AutoLaunch] Startup check execution failed:', err);
  }

  // --- SECURE DATABASE IPC HANDLERS ---

  ipcMain.handle('db-get-path', () => {
    return getDatabasePath()
  })

  ipcMain.handle('intel-read-quotes', async (_event, filename) => {
    try {
      const quotesDir = join(app.getPath('userData'), 'quotes')
      const filePath = join(quotesDir, filename)
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8')
        return { success: true, data: JSON.parse(fileContent) }
      }
      return { success: false, error: 'File not found' }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('intel-open-file', async (_event, filename) => {
    try {
      const quotesDir = join(app.getPath('userData'), 'quotes')
      const filePath = join(quotesDir, filename)
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'File not found' }
      }
      await shell.openPath(filePath)
      return { success: true, filePath }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('intel-write-quotes', async (_event, { filename, content }) => {
    try {
      const quotesDir = join(app.getPath('userData'), 'quotes')
      const filePath = join(quotesDir, filename)
      // Validate JSON syntax before writing
      JSON.parse(content)
      fs.writeFileSync(filePath, content, 'utf-8')
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  interface FileNode {
    name: string;
    type: 'file' | 'folder';
    path: string;
    children?: FileNode[];
  }

  function scanDir(absolutePath: string, relativePath: string): FileNode[] {
    if (!fs.existsSync(absolutePath)) return [];
    const items = fs.readdirSync(absolutePath, { withFileTypes: true });
    const nodes: FileNode[] = [];
    for (const item of items) {
      if (item.name.startsWith('.')) continue;
      const childAbsPath = join(absolutePath, item.name);
      const childRelPath = `${relativePath}/${item.name}`;
      if (item.isDirectory()) {
        const children = scanDir(childAbsPath, childRelPath);
        nodes.push({
          name: item.name,
          type: 'folder',
          path: childRelPath,
          children
        });
      } else {
        const ext = item.name.split('.').pop()?.toLowerCase();
        if (ext && ['svelte', 'ts', 'js', 'css', 'json'].includes(ext)) {
          nodes.push({
            name: item.name,
            type: 'file',
            path: childRelPath
          });
        }
      }
    }
    return nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  function getGlobalFiles(absoluteSrcPath: string): FileNode[] {
    if (!fs.existsSync(absoluteSrcPath)) return [];
    const items = fs.readdirSync(absoluteSrcPath, { withFileTypes: true });
    const nodes: FileNode[] = [];
    for (const item of items) {
      if (item.isFile()) {
        const ext = item.name.split('.').pop()?.toLowerCase();
        if (ext && ['svelte', 'ts', 'js', 'css', 'json'].includes(ext)) {
          nodes.push({
            name: item.name,
            type: 'file',
            path: `src/${item.name}`
          });
        }
      }
    }
    return nodes.sort((a, b) => a.name.localeCompare(b.name));
  }

  ipcMain.handle('app-scan-paths', async () => {
    try {
      let projectRoot = process.cwd();
      let rendererSrcPath = join(projectRoot, 'src', 'renderer', 'src');
      
      if (!fs.existsSync(rendererSrcPath)) {
        const appPath = app.getAppPath();
        const pathsToTry = [
          appPath,
          join(appPath, '..'),
          join(appPath, '..', '..')
        ];
        for (const p of pathsToTry) {
          const checkPath = join(p, 'src', 'renderer', 'src');
          if (fs.existsSync(checkPath)) {
            projectRoot = p;
            rendererSrcPath = checkPath;
            break;
          }
        }
      }

      const tree: FileNode[] = [
        {
          name: 'GLOBAL',
          type: 'folder',
          path: 'src',
          children: getGlobalFiles(rendererSrcPath)
        },
        {
          name: 'COMPONENTS',
          type: 'folder',
          path: 'src/components',
          children: scanDir(join(rendererSrcPath, 'components'), 'src/components')
        },
        {
          name: 'DATABASE STATION',
          type: 'folder',
          path: 'src/sectors/StratagemHub',
          children: scanDir(join(rendererSrcPath, 'sectors', 'StratagemHub'), 'src/sectors/StratagemHub')
        },
        {
          name: 'FORGE',
          type: 'folder',
          path: 'src/sectors/Forge',
          children: scanDir(join(rendererSrcPath, 'sectors', 'Forge'), 'src/sectors/Forge')
        },
        {
          name: 'EXECUTION',
          type: 'folder',
          path: 'src/sectors/Execution',
          children: scanDir(join(rendererSrcPath, 'sectors', 'Execution'), 'src/sectors/Execution')
        },
        {
          name: 'ARSENAL',
          type: 'folder',
          path: 'src/sectors/Arsenal',
          children: scanDir(join(rendererSrcPath, 'sectors', 'Arsenal'), 'src/sectors/Arsenal')
        },
        {
          name: 'BREACH',
          type: 'folder',
          path: 'src/sectors/Breach',
          children: scanDir(join(rendererSrcPath, 'sectors', 'Breach'), 'src/sectors/Breach')
        },
        {
          name: 'ARCHIVE',
          type: 'folder',
          path: 'src/sectors/Archive',
          children: scanDir(join(rendererSrcPath, 'sectors', 'Archive'), 'src/sectors/Archive')
        },
        {
          name: 'CHRONOS',
          type: 'folder',
          path: 'src/sectors/Chronos',
          children: scanDir(join(rendererSrcPath, 'sectors', 'Chronos'), 'src/sectors/Chronos')
        },
        {
          name: 'GENESIS',
          type: 'folder',
          path: 'src/sectors/Genesis',
          children: scanDir(join(rendererSrcPath, 'sectors', 'Genesis'), 'src/sectors/Genesis')
        }
      ];
      return { success: true, tree };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  })

  ipcMain.handle('db-insert-mission', async (_event, mission) => {
    const result = await insertMission(mission)
    if (result && (result as any).id) {
      appendNoteAuditLog((result as any).id, 'MISSION_CREATE', `Mission initialized. Designation: ${mission.title.toUpperCase()}`)
    }
    return result
  })

  ipcMain.handle('db-update-mission-status', async (_event, { id, status }) => {
    const result = await updateMissionStatus(id, status)
    appendNoteAuditLog(id, 'STATUS_CHANGE', `Status updated to ${status}`)
    return result
  })

  ipcMain.handle('db-update-mission-threat-level', async (_event, { id, threatLevel }) => {
    const result = await updateMissionThreatLevel(id, threatLevel)
    appendNoteAuditLog(id, 'THREAT_CHANGE', `Threat parameters set to: ${threatLevel}`)
    return result
  })

  ipcMain.handle('db-fetch-missions', async () => {
    return await fetchSectorMissions()
  })

  ipcMain.handle('db-reschedule-mission', async (_event, { id, newDeadline }) => {
    const result = await updateMissionAsRescheduled(id, newDeadline)
    appendNoteAuditLog(id, 'DEADLINE_CHANGE', `Temporal boundary set to: ${newDeadline}`)
    return result
  })

  ipcMain.handle('db-update-mission-details', async (_event, { id, title, classifications, threatLevel, deadline, status }) => {
    return await updateMissionDetails(id, title, classifications, threatLevel, deadline, status)
  })

  ipcMain.handle('db-purge-database', async () => {
    return await purgeDatabase()
  })

  ipcMain.handle('db-delete-mission', async (_event, id) => {
    return await deleteMission(id)
  })

  ipcMain.handle('db-get-config', async () => {
    return await getConfig()
  })

  ipcMain.handle('db-set-config', async (_event, { key, value }) => {
    if (key === 'appLaunchOnStartup') {
      try {
        const flag = value === true || value === 'true';
        app.setLoginItemSettings({
          openAtLogin: flag,
          path: app.getPath('exe')
        });
        console.log(`[AutoLaunch] Startup configuration updated: openAtLogin = ${flag}`);
      } catch (err) {
        console.error('[AutoLaunch] Failed to update startup configuration:', err);
      }
    }
    return await setConfig(key, value)
  })

  ipcMain.handle('db-validate-database', async (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (!window) return { success: false, error: 'Window not found' }

      const { canceled, filePaths } = await dialog.showOpenDialog(window, {
        title: 'Validate Stratagem Intelligence Source',
        filters: [{ name: 'SQLite Database', extensions: ['db'] }],
        properties: ['openFile']
      })

      if (canceled || filePaths.length === 0) {
        return { success: false, message: 'ABORTED' }
      }

      const selectedPath = filePaths[0]
      const result = await validateDatabase(selectedPath)
      return { success: true, filePath: selectedPath, ...result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('db-import-path', async (_event, { path, mode }) => {
    if (mode === 'MERGE') {
      return await mergeDatabaseFile(path)
    } else {
      return await importDatabaseFile(path)
    }
  })

  ipcMain.handle('db-get-size', () => {
    try {
      const dbPath = getDatabasePath()
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath)
        if (stats.size < 1024 * 1024) {
          const sizeInKB = stats.size / 1024
          return `${sizeInKB.toFixed(2)} KB`
        }
        const sizeInMB = stats.size / (1024 * 1024)
        return `${sizeInMB.toFixed(2)} MB`
      }
      return '0.00 KB'
    } catch (e) {
      return '0.00 KB'
    }
  })

  // Append an audit log entry to the immutable audit_log table
  function appendNoteAuditLog(id: number, actionName: string, description: string) {
    appendAuditLog(id, actionName, description).catch((e) => {
      console.warn('[AuditLog] Failed to write log entry:', e?.message);
    });
  }

  ipcMain.handle('note-exists', (_event, id) => {
    const notesDir = join(app.getPath('home'), 'StratagemNotes')
    const notePath = join(notesDir, `task_${id}.md`)
    return fs.existsSync(notePath)
  })

  ipcMain.handle('note-read', (_event, { id }) => {
    const notesDir = join(app.getPath('home'), 'StratagemNotes')
    const notePath = join(notesDir, `task_${id}.md`)
    if (fs.existsSync(notePath)) {
      return fs.readFileSync(notePath, 'utf-8')
    } else {
      return ''
    }
  })

  ipcMain.handle('note-write', (_event, { id, content }) => {
    const notesDir = join(app.getPath('home'), 'StratagemNotes')
    if (!fs.existsSync(notesDir)) {
      fs.mkdirSync(notesDir, { recursive: true })
    }
    const notePath = join(notesDir, `task_${id}.md`)
    fs.writeFileSync(notePath, content, 'utf-8')
    return { success: true }
  })

  ipcMain.handle('note-append-log', (_event, { id, actionName, description }) => {
    appendNoteAuditLog(id, actionName, description)
    return { success: true }
  })

  // --- NEW: Audit log & resolution comment IPC handlers ---

  ipcMain.handle('db-get-audit-log', async (_event, id) => {
    return await getAuditLog(id)
  })

  ipcMain.handle('db-update-resolution-comment', async (_event, { id, comment }) => {
    return await updateResolutionComment(id, comment)
  })

  ipcMain.handle('db-get-mission-by-id', async (_event, id) => {
    return await getMissionById(id)
  })

  ipcMain.handle('db-run-diagnostics', async () => {
    return await runDatabaseDiagnostics()
  })

  ipcMain.handle('aigirl-scan-images', async () => {
    try {
      const targetDir = resolveAIGirlFolderPath('Nudity/assets');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const files = fs.readdirSync(targetDir);
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
      const images = files.filter(file => {
        const ext = extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      });
      return { success: true, images, path: targetDir, isDev: !app.isPackaged };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('aigirl-get-image', async (_event, fileName) => {
    try {
      const targetDir = resolveAIGirlFolderPath('Nudity/assets');
      const filePath = join(targetDir, fileName);
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'File not found' };
      }
      const ext = extname(filePath).toLowerCase();
      let mimeType = 'image/jpeg';
      if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.gif') mimeType = 'image/gif';
      else if (ext === '.svg') mimeType = 'image/svg+xml';
      else if (ext === '.webp') mimeType = 'image/webp';

      const data = getCachedFileData(filePath, mimeType);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('aigirl-scan-effects', async () => {
    try {
      const targetDir = resolveAIGirlFolderPath('Nudity/effects');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const files = fs.readdirSync(targetDir);
      const audioExtensions = ['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a', '.webm', '.wma'];
      const effects = files.filter(file => {
        const ext = extname(file).toLowerCase();
        return audioExtensions.includes(ext);
      });
      return { success: true, effects, path: targetDir, isDev: !app.isPackaged };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('aigirl-get-effect', async (_event, fileName) => {
    try {
      const targetDir = resolveAIGirlFolderPath('Nudity/effects');
      const filePath = join(targetDir, fileName);
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'File not found' };
      }
      const ext = extname(filePath).toLowerCase();
      let mimeType = 'audio/mpeg';
      if (ext === '.wav') mimeType = 'audio/wav';
      else if (ext === '.ogg') mimeType = 'audio/ogg';
      else if (ext === '.aac') mimeType = 'audio/aac';
      else if (ext === '.flac') mimeType = 'audio/flac';
      else if (ext === '.m4a') mimeType = 'audio/mp4';
      else if (ext === '.webm') mimeType = 'audio/webm';

      const data = getCachedFileData(filePath, mimeType);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('aigirl-scan-folder-files', async (_event, folderName) => {
    try {
      const targetDir = resolveAIGirlFolderPath(folderName);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const files = fs.readdirSync(targetDir);
      return { success: true, files, path: targetDir };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('aigirl-delete-file', async (_event, { folderName, fileName }) => {
    try {
      const targetDir = resolveAIGirlFolderPath(folderName);
      const filePath = join(targetDir, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return { success: true };
      }
      return { success: false, error: 'File not found' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('aigirl-upload-file', async (event, folderName) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) return { success: false, error: 'Window not found' };
      const { canceled, filePaths } = await dialog.showOpenDialog(window, {
        title: `Import Assets to ${folderName} Folder`,
        filters: [
          { name: 'Assets (Images/Audio)', extensions: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'webm'] }
        ],
        properties: ['openFile', 'multiSelections']
       });
      if (canceled || filePaths.length === 0) {
        return { success: false, message: 'ABORTED' };
      }
      const targetDir = resolveAIGirlFolderPath(folderName);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      for (const filePath of filePaths) {
        const baseName = filePath.split(/[\\/]/).pop() || 'asset';
        const destPath = join(targetDir, baseName);
        fs.copyFileSync(filePath, destPath);
      }
      return { success: true, uploadedCount: filePaths.length };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('aigirl-get-file-data', async (_event, { folderName, fileName }) => {
    try {
      const targetDir = resolveAIGirlFolderPath(folderName);
      const filePath = join(targetDir, fileName);
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'File not found' };
      }
      const ext = extname(filePath).toLowerCase();
      let mimeType = 'image/jpeg';
      if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.gif') mimeType = 'image/gif';
      else if (ext === '.svg') mimeType = 'image/svg+xml';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.mp3') mimeType = 'audio/mpeg';
      else if (ext === '.wav') mimeType = 'audio/wav';
      else if (ext === '.ogg') mimeType = 'audio/ogg';
      else if (ext === '.aac') mimeType = 'audio/aac';
      else if (ext === '.flac') mimeType = 'audio/flac';
      else if (ext === '.m4a') mimeType = 'audio/mp4';
      else if (ext === '.webm') mimeType = 'audio/webm';

      const data = getCachedFileData(filePath, mimeType);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('dev-scan-images', async () => {
    try {
      const targetDir = getDevImagesDir();
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const files = fs.readdirSync(targetDir);
      return { success: true, files, path: targetDir };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('dev-delete-image', async (_event, fileName) => {
    try {
      const targetDir = getDevImagesDir();
      const filePath = join(targetDir, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return { success: true };
      }
      return { success: false, error: 'File not found' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('dev-upload-image', async (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (!window) return { success: false, error: 'Window not found' };
      const { canceled, filePaths } = await dialog.showOpenDialog(window, {
        title: 'Import Developer Portrait Assets',
        filters: [
          { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'] }
        ],
        properties: ['openFile', 'multiSelections']
       });
      if (canceled || filePaths.length === 0) {
        return { success: false, message: 'ABORTED' };
      }
      const targetDir = getDevImagesDir();
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      for (const filePath of filePaths) {
        const baseName = filePath.split(/[\\/]/).pop() || 'asset';
        const destPath = join(targetDir, baseName);
        fs.copyFileSync(filePath, destPath);
      }
      return { success: true, uploadedCount: filePaths.length };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('dev-get-image-data', async (_event, fileName) => {
    try {
      const targetDir = getDevImagesDir();
      const filePath = join(targetDir, fileName);
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'File not found' };
      }
      const ext = extname(filePath).toLowerCase();
      let mimeType = 'image/jpeg';
      if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.gif') mimeType = 'image/gif';
      else if (ext === '.svg') mimeType = 'image/svg+xml';
      else if (ext === '.webp') mimeType = 'image/webp';

      const data = getCachedFileData(filePath, mimeType);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('boot-verify-core', async () => {
    return await verifyCoreSystem()
  })

  ipcMain.handle('boot-verify-bridge', async () => {
    return { success: true }
  })

  ipcMain.handle('boot-verify-sqlite', async () => {
    return await verifySqliteMount()
  })

  ipcMain.handle('boot-verify-handshake', async () => {
    return await verifyHandshake()
  })

  ipcMain.handle('boot-db-file-existed', () => {
    return dbFileExisted
  })

  ipcMain.handle('boot-seed-database', async () => {
    return await seedDatabase()
  })

  ipcMain.handle('boot-write-log', (_event, content) => {
    try {
      const logPath = join(app.getPath('userData'), 'stratagem_boot_error.log')
      fs.writeFileSync(logPath, content, 'utf-8')
      return { success: true, path: logPath }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('boot-open-log', async () => {
    try {
      const logPath = join(app.getPath('userData'), 'stratagem_boot_error.log')
      if (!fs.existsSync(logPath)) {
        fs.writeFileSync(logPath, '[STRATAGEM COLD BOOT SYSTEM DIAGNOSTIC ERROR REPORT]\nNo boot errors have been recorded in this run.', 'utf-8')
      }
      const err = await shell.openPath(logPath)
      if (err) {
        console.error('[Boot Log] Failed to open path:', err)
        return { success: false, error: err }
      }
      return { success: true }
    } catch (e: any) {
      console.error('[Boot Log] Exception opening path:', e.message)
      return { success: false, error: e.message }
    }
  })

  // --- NATIVE DIALOG HANDLERS ---

  ipcMain.handle('dialog:exportJSON', async (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (!window) return { success: false, error: 'Window not found' }
      
      const { canceled, filePath } = await dialog.showSaveDialog(window, {
        title: 'Export Intelligence Matrix (JSON)',
        defaultPath: 'stratagem_intel_backup.json',
        filters: [{ name: 'JSON Document', extensions: ['json'] }]
      })

      if (canceled || !filePath) return { success: false, message: 'ABORTED' }

      const missions = await fetchSectorMissions()
      const config = await getConfig()

      const exportData = { exported_at: new Date().toISOString(), system_integrity: 'SECURE', config, missions }
      fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2))
      return { success: true, filePath }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('dialog:exportDB', async (event) => {
    try {
      const dbPath = getDatabasePath()
      const window = BrowserWindow.fromWebContents(event.sender)
      if (!window) return { success: false, error: 'Window not found' }
      
      const { canceled, filePath } = await dialog.showSaveDialog(window, {
        title: 'Export Stratagem Core Database',
        defaultPath: 'stratagem_intel.db',
        filters: [{ name: 'SQLite Database', extensions: ['db'] }]
      })

      if (canceled || !filePath) return { success: false, message: 'ABORTED' }
      fs.copyFileSync(dbPath, filePath)
      return { success: true, filePath }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('dialog:importDB', async (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (!window) return { success: false, error: 'Window not found' }

      const { canceled, filePaths } = await dialog.showOpenDialog(window, {
        title: 'Import Stratagem Core Database',
        filters: [{ name: 'SQLite Database', extensions: ['db'] }],
        properties: ['openFile']
      })

      if (canceled || filePaths.length === 0) return { success: false, message: 'ABORTED' }

      const selectedPath = filePaths[0]
      const result = await importDatabaseFile(selectedPath)
      return { success: true, ...result }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('os-open-in-explorer', async (_event, path) => {
    try {
      shell.showItemInFolder(path)
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('app-check-nude-bypass', () => {
    return !app.isPackaged && (process.argv.includes('--nude') || process.env.ELECTRON_NUDE_BYPASS === 'true')
  })

  ipcMain.handle('app-is-packaged', () => {
    return app.isPackaged
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

function seedQuotesDir() {
  const quotesDir = join(app.getPath('userData'), 'quotes');
  if (!fs.existsSync(quotesDir)) {
    fs.mkdirSync(quotesDir, { recursive: true });
  }

  const defaults = {
    'laws_of_power.json': [
      "LAW 1: NEVER OUTSHINE THE MASTER. Make those above you feel superior.",
      "LAW 2: NEVER PUT TOO MUCH TRUST IN FRIENDS, LEARN HOW TO USE ENEMIES. Friends betray out of envy; a former enemy is more loyal.",
      "LAW 3: CONCEAL YOUR INTENTIONS. Keep people off-balance and in the dark.",
      "LAW 4: ALWAYS SAY LESS THAN NECESSARY. The more you say, the more common you appear.",
      "LAW 5: SO MUCH DEPENDS ON REPUTATION - GUARD IT WITH YOUR LIFE. Reputation is the cornerstone of power.",
      "LAW 6: COURT ATTENTION AT ALL COST. Be conspicuous; do not let yourself get lost in the crowd.",
      "LAW 7: GET OTHERS TO DO THE WORK FOR YOU, BUT ALWAYS TAKE THE CREDIT. Save your energy and make yourself look like a giant.",
      "LAW 8: MAKE OTHER PEOPLE COME TO YOU - USE BAIT IF NECESSARY. When you force the other person to act, you are in control.",
      "LAW 9: WIN THROUGH YOUR ACTIONS, NEVER THROUGH ARGUMENT. Demonstrations are more powerful.",
      "LAW 10: INFECTION: AVOID THE UNHAPPY AND UNLUCKY. Emotional states are as infectious as diseases.",
      "LAW 15: CRUSH YOUR ENEMY TOTALLY. If one ember is left alight, a fire will eventually break out.",
      "LAW 18: DO NOT BUILD FORTRESSES TO PROTECT YOURSELF. Isolation is dangerous. Strongholds cut you off from power.",
      "LAW 28: ENTER ACTION WITH BOLDNESS. Hesitation is dangerous. Boldness eliminates errors.",
      "LAW 29: PLAN ALL THE WAY TO THE END. The ending is everything.",
      "LAW 33: DISCOVER EACH MAN'S THUMBSCREW. Everyone has a weakness, a button you can press.",
      "LAW 48: ASSUME FORMLESSNESS. By having no visible plan, you are impossible to attack."
    ],
    '33_strategies_of_war.json': [
      "STRATEGY 1: THE POLARITY STRATEGY. Declare war on your enemies. Clear boundaries define your strength.",
      "STRATEGY 2: THE GUERILLA-WAR-OF-THE-MIND STRATEGY. Do not let the past dictate the present. Keep moving.",
      "STRATEGY 3: THE COUNTERBALANCE STRATEGY. Keep your presence of mind under fire. Master your emotions.",
      "STRATEGY 4: THE DEATH-GROUND STRATEGY. A lack of options forces absolute focus and fighting spirit.",
      "STRATEGY 5: THE AVOID-THE-MIRE STRATEGY. Guard your time and energy. Withdrawal can be a victory.",
      "STRATEGY 9: THE COUNTERATTACK STRATEGY. Let them make the first move, then strike their exposed flank.",
      "STRATEGY 11: THE KNOW-YOUR-ENEMY STRATEGY. Assess your opponent's psychology and weaknesses.",
      "STRATEGY 12: THE GRAND STRATEGY. Rise above the battlefield. Win the war, not just individual skirmishes.",
      "STRATEGY 16: THE VULNERABLE FLANK STRATEGY. Find their weaknesses and strike where they least expect.",
      "STRATEGY 23: THE MISDIRECTION STRATEGY. Force them to look elsewhere while you breach their main gate."
    ],
    'laws_of_human_nature.json': [
      "LAW OF IRRATIONALITY: Control your emotional self. Realize that feelings cloud clear strategic thinking.",
      "LAW OF NARCISSISM: Transform self-love into empathy. Learn to see others from their perspective.",
      "LAW OF ROLE-PLAYING: See through people's masks. Pay attention to body language and micro-expressions.",
      "LAW OF COMPULSIVE BEHAVIOR: Determine the strength of character. Do not judge by reputation alone.",
      "LAW OF DEFENSIVENESS: Soften people's resistance by confirming their self-opinion.",
      "LAW OF COVETOUSNESS: Become an elusive object of desire. People always want what they cannot have.",
      "LAW OF SHORT-SIGHTEDNESS: Keep a long-term perspective. Do not react to immediate situations without a broader plan.",
      "LAW OF GRANDIOSITY: Counteract self-inflation by remaining grounded in reality and limits.",
      "LAW OF ENVY: Spot envier tendencies before they manifest as sabotage."
    ],
    'daily_law.json': {
      "06-01": "DAILY LAW (JUNE 1): Find your life's task. Your vocational calling is the anchor of your power.",
      "06-02": "DAILY LAW (JUNE 2): Embrace your uniqueness. Do not conform to societal paths that dilute your identity.",
      "06-03": "DAILY LAW (JUNE 3): Choose a mentor wisely. Learn from those who have walked the path before you.",
      "06-04": "DAILY LAW (JUNE 4): Value practice over results. Mastery is built through tedious hours of deep repetition.",
      "06-05": "DAILY LAW (JUNE 5): The mind must adapt to reality. Refuse defensive responses that distort truth.",
      "06-06": "DAILY LAW (JUNE 6): Acquire tacit knowledge. Understand the unspoken rules of your environment.",
      "06-07": "DAILY LAW (JUNE 7): Reconnect with your childhood inclinations. They point to your natural strengths.",
      "06-08": "DAILY LAW (JUNE 8): Value feedback over approval. Constructive criticism is the engine of skill acquisition.",
      "06-09": "DAILY LAW (JUNE 9): Build emotional resilience. The path to power is paved with cognitive discipline.",
      "06-10": "DAILY LAW (JUNE 10): Keep a distance from negative influences. Toxic people drain strategic clarity.",
      "06-11": "DAILY LAW (JUNE 11): Cultivate patience. Major strategic victories require temporal cultivation.",
      "06-12": "DAILY LAW (JUNE 12): Trust actions, not words. Human nature reveals itself through history, not promises.",
      "06-13": "DAILY LAW (JUNE 13): Train your focus. Cognitive fragmentation is the ultimate enemy of strategic design.",
      "06-14": "DAILY LAW (JUNE 14): Mastery is not a function of genius or talent. It is a product of time and intense focus.",
      "06-15": "DAILY LAW (JUNE 15): See things as they are, not as you wish them to be. Absolute realism is power.",
      "06-16": "DAILY LAW (JUNE 16): Treat failures as diagnostic feedback, not personal indictments.",
      "06-17": "DAILY LAW (JUNE 17): The supreme law of self-reliance is to create your own opportunities.",
      "06-18": "DAILY LAW (JUNE 18): Master the art of timing. Waiting, speed, and patience are weapons of the strategist.",
      "06-19": "DAILY LAW (JUNE 19): Never show vulnerability to adversaries. Maintain an impenetrable outer demeanor.",
      "06-20": "DAILY LAW (JUNE 20): Control your emotional responses. Anger and pride are vectors of exploitation.",
      "default": "DAILY LAW: Focus entirely on the immediate task. Strategic mastery is born from absolute cognitive isolation."
    },
    'art_of_seduction.json': [
      "THE COQUETTE: The master of delay. Alternating between warmth and coldness keeps the target hooked.",
      "THE DANDY: A figure of romantic ambiguity. They subvert gender expectations to create fascination.",
      "THE CHARISMATIC: Radiating an inner intensity and vision that makes others want to follow blindly.",
      "THE NATURAL: Returning to childhood innocence and spontaneity to disarm the target's defenses.",
      "THE SIREN: Offering an escape from the boredom of daily life through theatrical and sensual presence.",
      "THE RAKE: Offering a dangerous, intense romance that promises absolute, if brief, devotion.",
      "THE IDEAL LOVER: Creating an illusion that matches the target's deepest unfulfilled dreams.",
      "THE CREATIVE: Engaging others through the power of aesthetic fascination and original thought."
    ],
    '50th_law.json': [
      "THE 50TH LAW: FEAR NOTHING. Fear is the ultimate barrier to power. Eliminate it.",
      "FEARLESSNESS DIRECTIVE: When you show no fear, others respect your authority and yield.",
      "TACTICAL INDEPENDENCE: Do not rely on others. Your own self-reliance is your ultimate shield.",
      "OPPORTUNISTIC VISION: See every obstacle as an opportunity to gain power and leverage.",
      "SUPREME BOLDNESS: Enter conflicts with absolute audacity. Hesitation invites destruction.",
      "HUSTLE DIRECTIVE: Work harder and faster than anyone else. Intensity defeats obstacles.",
      "REALISM RULE: Look at the world exactly as it is, not as you wish it to be. Truth is power."
    ],
    'tactical_axioms.json': [
      "The supreme art of war is to subdue the enemy without fighting. - Sun Tzu",
      "In the midst of chaos, there is also opportunity. - Sun Tzu",
      "He who fears being conquered is sure of defeat. - Napoleon Bonaparte",
      "Speed is the essence of war. Take advantage of the enemy's unpreparedness. - Sun Tzu",
      "Plans are nothing; planning is everything. - Dwight D. Eisenhower",
      "If you know the enemy and know yourself, you need not fear the result of a hundred battles. - Sun Tzu",
      "Regard your soldiers as your children, and they will follow you into the deepest valleys. - Sun Tzu",
      "Strategy without tactics is the slowest route to victory. Tactics without strategy is the noise before defeat. - Sun Tzu",
      "Let your plans be dark and impenetrable as night, and when you move, fall like a thunderbolt. - Sun Tzu"
    ]
  };

  for (const [filename, content] of Object.entries(defaults)) {
    const filePath = join(quotesDir, filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
    }
  }
}

// Watch assets directories to update UI immediately when files are added/deleted
function setupWatchers(mainWindow: BrowserWindow) {
  const watchOptions = { persistent: false };
  let devTimeout: NodeJS.Timeout | null = null;
  // let nudityTimeout: NodeJS.Timeout | null = null;
  // let notecardsTimeout: NodeJS.Timeout | null = null;

  const devDir = getDevImagesDir();
  if (fs.existsSync(devDir)) {
    try {
      fs.watch(devDir, watchOptions, () => {
        if (devTimeout) clearTimeout(devTimeout);
        devTimeout = setTimeout(() => {
          if (!mainWindow.isDestroyed()) {
            mainWindow.webContents.send('dev-refresh-asset');
          }
        }, 500);
      });
    } catch (e) {
      console.warn('Failed to watch dev images dir:', e);
    }
  }

  // Companion directory watching is disabled to prevent filesystem reads from triggering infinite refresh loops on Windows.
  // const nudityDir = resolveAIGirlFolderPath('Nudity/assets');
  // if (fs.existsSync(nudityDir)) {
  //   try {
  //     fs.watch(nudityDir, watchOptions, () => {
  //       if (nudityTimeout) clearTimeout(nudityTimeout);
  //       nudityTimeout = setTimeout(() => {
  //         if (!mainWindow.isDestroyed()) {
  //           mainWindow.webContents.send('aigirl-refresh-asset');
  //         }
  //       }, 500);
  //     });
  //   } catch (e) {
  //     console.warn('Failed to watch nudity dir:', e);
  //   }
  // }

  // const notecardsDir = resolveAIGirlFolderPath('NoteCards/Cards');
  // if (fs.existsSync(notecardsDir)) {
  //   try {
  //     fs.watch(notecardsDir, watchOptions, () => {
  //       if (notecardsTimeout) clearTimeout(notecardsTimeout);
  //       notecardsTimeout = setTimeout(() => {
  //         if (!mainWindow.isDestroyed()) {
  //           mainWindow.webContents.send('aigirl-refresh-asset');
  //         }
  //       }, 500);
  //     });
  //   } catch (e) {
  //     console.warn('Failed to watch notecards dir:', e);
  //   }
  // }
}
