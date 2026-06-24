import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    stratagemAPI: {
      fetchSectorMissions: () => Promise<any[]>
      insertMission: (mission: { title: string; temporal_boundary: string; threat_level: string; status: string }) => Promise<any>
      updateMissionStatus: (id: number, status: string) => Promise<any>
      updateMissionThreatLevel: (id: number, threatLevel: string) => Promise<any>
      rescheduleMission: (id: number, newDeadline: string) => Promise<any>
      deleteMission: (id: number) => Promise<any>
      purgeDatabase: () => Promise<any>
      getConfig: () => Promise<any>
      setConfig: (key: string, value: any) => Promise<any>
      getDatabasePath: () => Promise<string>
      getDatabaseSize: () => Promise<string>
      validateDatabaseSource: () => Promise<any>
      importDatabaseFromPath: (path: string, mode: string) => Promise<any>
      checkNoteExists: (id: number) => Promise<boolean>
      readNote: (id: number, title: string) => Promise<string>
      writeNote: (id: number, content: string) => Promise<any>
      appendNoteLog: (id: number, actionName: string, description: string) => Promise<any>
      updateMissionDetails: (id: number, title: string, classifications: string, threatLevel: string, deadline: string, status: string) => Promise<any>
      runDiagnostics: () => Promise<any>
      verifyCore: () => Promise<any>
      verifyBridge: () => Promise<any>
      verifySqlite: () => Promise<any>
      verifyHandshake: () => Promise<any>
      intelReadQuotes: (filename: string) => Promise<{ success: boolean; data?: any; error?: string }>
      intelOpenFile: (filename: string) => Promise<{ success: boolean; filePath?: string; error?: string }>
      intelWriteQuotes: (filename: string, content: string) => Promise<{ success: boolean; error?: string }>
      scanAppPaths: () => Promise<{ success: boolean; tree: any[]; error?: string }>
      aigirlScanImages: () => Promise<{ success: boolean; images?: string[]; path?: string; error?: string }>
      aigirlGetImage: (fileName: string) => Promise<{ success: boolean; data?: string; error?: string }>
      aigirlScanEffects: () => Promise<{ success: boolean; effects?: string[]; path?: string; error?: string }>
      aigirlGetEffect: (fileName: string) => Promise<{ success: boolean; data?: string; error?: string }>
      aigirlScanFolderFiles: (folderName: string) => Promise<{ success: boolean; files?: string[]; path?: string; error?: string }>
      aigirlDeleteFile: (folderName: string, fileName: string) => Promise<{ success: boolean; error?: string }>
      aigirlUploadFile: (folderName: string) => Promise<{ success: boolean; uploadedCount?: number; error?: string }>
      aigirlGetFileData: (folderName: string, fileName: string) => Promise<{ success: boolean; data?: string; error?: string }>
      devScanImages: () => Promise<{ success: boolean; files?: string[]; path?: string; error?: string }>
      devUploadImage: () => Promise<{ success: boolean; uploadedCount?: number; error?: string }>
      devDeleteImage: (fileName: string) => Promise<{ success: boolean; error?: string }>
      devGetImageData: (fileName: string) => Promise<{ success: boolean; data?: string; error?: string }>
      checkNudeBypass: () => Promise<boolean>
      isPackaged: () => Promise<boolean>
    }
    osAPI: {
      closeWindow: () => void
      toggleMaximize: () => void
      exportDatabase: () => Promise<any>
      importDatabase: () => Promise<any>
      openInExplorer: (path: string) => Promise<any>
      exportDatabaseJSON: () => Promise<any>
      onResizeAttempt: (callback: () => void) => void
    }
  }
}
