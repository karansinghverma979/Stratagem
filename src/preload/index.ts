import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {}

// Secure strictly typed functions using ipcRenderer.invoke to talk to SQLite handlers
const stratagemAPI = {
  fetchSectorMissions: () => ipcRenderer.invoke('db-fetch-missions'),
  insertMission: (mission: { title: string; temporal_boundary: string; threat_level: string; status: string }) => 
    ipcRenderer.invoke('db-insert-mission', mission),
  updateMissionStatus: (id: number, status: string) => ipcRenderer.invoke('db-update-mission-status', { id, status }),
  updateMissionThreatLevel: (id: number, threatLevel: string) => ipcRenderer.invoke('db-update-mission-threat-level', { id, threatLevel }),
  rescheduleMission: (id: number, newDeadline: string) => ipcRenderer.invoke('db-reschedule-mission', { id, newDeadline }),
  purgeDatabase: () => ipcRenderer.invoke('db-purge-database'),
  deleteMission: (id: number) => ipcRenderer.invoke('db-delete-mission', id),
  getConfig: () => ipcRenderer.invoke('db-get-config'),
  setConfig: (key: string, value: any) => ipcRenderer.invoke('db-set-config', { key, value }),
  getDatabasePath: () => ipcRenderer.invoke('db-get-path'),
  getDatabaseSize: () => ipcRenderer.invoke('db-get-size'),
  validateDatabaseSource: () => ipcRenderer.invoke('db-validate-database'),
  importDatabaseFromPath: (path: string, mode: string) => ipcRenderer.invoke('db-import-path', { path, mode }),
  checkNoteExists: (id: number) => ipcRenderer.invoke('note-exists', id),
  readNote: (id: number, title: string) => ipcRenderer.invoke('note-read', { id, title }),
  writeNote: (id: number, content: string) => ipcRenderer.invoke('note-write', { id, content }),
  appendNoteLog: (id: number, actionName: string, description: string) => ipcRenderer.invoke('note-append-log', { id, actionName, description }),
  updateMissionDetails: (id: number, title: string, classifications: string, threatLevel: string, deadline: string, status: string) =>
    ipcRenderer.invoke('db-update-mission-details', { id, title, classifications, threatLevel, deadline, status }),
  getAuditLog: (id: number) => ipcRenderer.invoke('db-get-audit-log', id),
  updateResolutionComment: (id: number, comment: string) => ipcRenderer.invoke('db-update-resolution-comment', { id, comment }),
  getMissionById: (id: number) => ipcRenderer.invoke('db-get-mission-by-id', id),
  runDiagnostics: () => ipcRenderer.invoke('db-run-diagnostics'),
  verifyCore: () => ipcRenderer.invoke('boot-verify-core'),
  verifyBridge: () => ipcRenderer.invoke('boot-verify-bridge'),
  verifySqlite: () => ipcRenderer.invoke('boot-verify-sqlite'),
  verifyHandshake: () => ipcRenderer.invoke('boot-verify-handshake'),
  writeBootLog: (content: string) => ipcRenderer.invoke('boot-write-log', content),
  openBootLog: () => ipcRenderer.invoke('boot-open-log'),
  checkDbFileExisted: () => ipcRenderer.invoke('boot-db-file-existed'),
  seedDatabase: () => ipcRenderer.invoke('boot-seed-database'),
  intelReadQuotes: (filename: string) => ipcRenderer.invoke('intel-read-quotes', filename),
  intelOpenFile: (filename: string) => ipcRenderer.invoke('intel-open-file', filename),
  intelWriteQuotes: (filename: string, content: string) => ipcRenderer.invoke('intel-write-quotes', { filename, content }),
  scanAppPaths: () => ipcRenderer.invoke('app-scan-paths'),
  aigirlScanImages: () => ipcRenderer.invoke('aigirl-scan-images'),
  aigirlGetImage: (fileName: string) => ipcRenderer.invoke('aigirl-get-image', fileName),
  aigirlScanEffects: () => ipcRenderer.invoke('aigirl-scan-effects'),
  aigirlGetEffect: (fileName: string) => ipcRenderer.invoke('aigirl-get-effect', fileName),
  aigirlScanFolderFiles: (folderName: string) => ipcRenderer.invoke('aigirl-scan-folder-files', folderName),
  aigirlDeleteFile: (folderName: string, fileName: string) => ipcRenderer.invoke('aigirl-delete-file', { folderName, fileName }),
  aigirlUploadFile: (folderName: string) => ipcRenderer.invoke('aigirl-upload-file', folderName),
  aigirlGetFileData: (folderName: string, fileName: string) => ipcRenderer.invoke('aigirl-get-file-data', { folderName, fileName }),
  devScanImages: () => ipcRenderer.invoke('dev-scan-images'),
  devDeleteImage: (fileName: string) => ipcRenderer.invoke('dev-delete-image', fileName),
  devUploadImage: () => ipcRenderer.invoke('dev-upload-image'),
  devGetImageData: (fileName: string) => ipcRenderer.invoke('dev-get-image-data', fileName),
  checkNudeBypass: () => ipcRenderer.invoke('app-check-nude-bypass'),
  isPackaged: () => ipcRenderer.invoke('app-is-packaged')
}

const osAPI = {
  closeWindow: () => ipcRenderer.send('window-close'),
  toggleMaximize: () => ipcRenderer.send('window-toggle-maximize'),
  exportDatabase: () => ipcRenderer.invoke('dialog:exportDB'),
  importDatabase: () => ipcRenderer.invoke('dialog:importDB'),
  openInExplorer: (path: string) => ipcRenderer.invoke('os-open-in-explorer', path),
  exportDatabaseJSON: () => ipcRenderer.invoke('dialog:exportJSON'),
  setAlwaysOnTop: (flag: boolean) => ipcRenderer.send('window-set-always-on-top', flag),
  setKiosk: (flag: boolean) => ipcRenderer.send('window-set-kiosk', flag),
  onResizeAttempt: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('window-resize-attempt', listener)
    return () => {
      ipcRenderer.removeListener('window-resize-attempt', listener)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('stratagemAPI', stratagemAPI)
    contextBridge.exposeInMainWorld('osAPI', osAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.stratagemAPI = stratagemAPI
  // @ts-ignore (define in dts)
  window.osAPI = osAPI
}

// Listen to ipcRenderer assets change events and trigger CustomEvents in the renderer process
ipcRenderer.on('dev-refresh-asset', () => {
  window.dispatchEvent(new CustomEvent('dev-refresh-asset'))
})

ipcRenderer.on('aigirl-refresh-asset', () => {
  window.dispatchEvent(new CustomEvent('aigirl-refresh-asset'))
})
