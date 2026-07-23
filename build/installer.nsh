!include nsDialogs.nsh
!include LogicLib.nsh

Var Dialog
Var Label_DevImages
Var Text_DevImages
Var Button_DevImages
Var Label_NoteCards
Var Text_NoteCards
Var Button_NoteCards
Var Label_Notes
Var Text_Notes
Var Button_Notes
Var Label_Database
Var Text_Database
Var Button_Database

Var DevImagesPath
Var NoteCardsPath
Var NotesPath
Var DatabasePath

Var Font_Heavy
Var Font_Bold

Page custom CustomPageCreate CustomPageLeave

Function CustomPageCreate
  # Create modern, bold fonts for headings and labels
  CreateFont $Font_Heavy "Segoe UI" 11 700
  CreateFont $Font_Bold "Segoe UI" 9 700

  nsDialogs::Create 1018
  Pop $Dialog

  ${If} $Dialog == error
    Abort
  ${EndIf}

  # Title Label
  ${NSD_CreateLabel} 0 2u 100% 12u "Configure custom folder portals for Stratagem 2.0:"
  Pop $0
  SendMessage $0 0x30 $Font_Heavy 1

  # DevImages Folder Selection
  ${NSD_CreateLabel} 0 15u 100% 10u "Dev Images Folder (devImages):"
  Pop $Label_DevImages
  SendMessage $Label_DevImages 0x30 $Font_Bold 1
  ${NSD_CreateText} 0 26u 80% 12u "$PROFILE\Stratagem\DeveloperImages"
  Pop $Text_DevImages
  ${NSD_CreateButton} 82% 25u 18% 13u "Browse..."
  Pop $Button_DevImages
  GetFunctionAddress $0 OnBrowseDevImages
  nsDialogs::OnClick $Button_DevImages $0

  # NoteCards Folder Selection
  ${NSD_CreateLabel} 0 40u 100% 10u "Note Cards Folder (NoteCards):"
  Pop $Label_NoteCards
  SendMessage $Label_NoteCards 0x30 $Font_Bold 1
  ${NSD_CreateText} 0 51u 80% 12u "$PROFILE\Stratagem\NoteCards"
  Pop $Text_NoteCards
  ${NSD_CreateButton} 82% 50u 18% 13u "Browse..."
  Pop $Button_NoteCards
  GetFunctionAddress $0 OnBrowseNoteCards
  nsDialogs::OnClick $Button_NoteCards $0

  # Notes Folder Selection
  ${NSD_CreateLabel} 0 65u 100% 10u "Strategies Folder (Obsidian Vault):"
  Pop $Label_Notes
  SendMessage $Label_Notes 0x30 $Font_Bold 1
  ${NSD_CreateText} 0 76u 80% 12u "$PROFILE\Obsidian\Strategies"
  Pop $Text_Notes
  ${NSD_CreateButton} 82% 75u 18% 13u "Browse..."
  Pop $Button_Notes
  GetFunctionAddress $0 OnBrowseNotes
  nsDialogs::OnClick $Button_Notes $0

  # Database Folder Selection
  ${NSD_CreateLabel} 0 90u 100% 10u "SQLite Database Folder:"
  Pop $Label_Database
  SendMessage $Label_Database 0x30 $Font_Bold 1
  ${NSD_CreateText} 0 101u 80% 12u "$APPDATA\StratagemData"
  Pop $Text_Database
  ${NSD_CreateButton} 82% 100u 18% 13u "Browse..."
  Pop $Button_Database
  GetFunctionAddress $0 OnBrowseDatabase
  nsDialogs::OnClick $Button_Database $0

  nsDialogs::Show
FunctionEnd

Function OnBrowseDevImages
  Pop $0
  ${NSD_GetText} $Text_DevImages $0
  nsDialogs::SelectFolderDialog "Select Developer Portraits Folder" "$0"
  Pop $1
  ${If} $1 != "error"
    ${NSD_SetText} $Text_DevImages $1
  ${EndIf}
FunctionEnd

Function OnBrowseNoteCards
  Pop $0
  ${NSD_GetText} $Text_NoteCards $0
  nsDialogs::SelectFolderDialog "Select NoteCards Folder" "$0"
  Pop $1
  ${If} $1 != "error"
    ${NSD_SetText} $Text_NoteCards $1
  ${EndIf}
FunctionEnd

Function OnBrowseNotes
  Pop $0
  ${NSD_GetText} $Text_Notes $0
  nsDialogs::SelectFolderDialog "Select Obsidian Strategies Vault Folder" "$0"
  Pop $1
  ${If} $1 != "error"
    ${NSD_SetText} $Text_Notes $1
  ${EndIf}
FunctionEnd

Function OnBrowseDatabase
  Pop $0
  ${NSD_GetText} $Text_Database $0
  nsDialogs::SelectFolderDialog "Select SQLite Database Folder" "$0"
  Pop $1
  ${If} $1 != "error"
    ${NSD_SetText} $Text_Database $1
  ${EndIf}
FunctionEnd

Function CustomPageLeave
  ${NSD_GetText} $Text_DevImages $DevImagesPath
  ${NSD_GetText} $Text_NoteCards $NoteCardsPath
  ${NSD_GetText} $Text_Notes $NotesPath
  ${NSD_GetText} $Text_Database $DatabasePath

  # Create folders if they don't exist
  CreateDirectory "$DevImagesPath"
  CreateDirectory "$NoteCardsPath"
  CreateDirectory "$NotesPath"
  CreateDirectory "$DatabasePath"

  # Write registry entries under correct Stratagem 2.0 key
  WriteRegStr HKCU "Software\Stratagem 2.0" "DevImagesPath" "$DevImagesPath"
  WriteRegStr HKCU "Software\Stratagem 2.0" "NoteCardsPath" "$NoteCardsPath"
  WriteRegStr HKCU "Software\Stratagem 2.0" "NotesPath" "$NotesPath"
  WriteRegStr HKCU "Software\Stratagem 2.0" "DatabasePath" "$DatabasePath"
FunctionEnd

!macro customUnInstall
  # Read registry values
  Var /GLOBAL DbPathVal
  Var /GLOBAL NotesPathVal
  Var /GLOBAL BackupDir

  ReadRegStr $DbPathVal HKCU "Software\Stratagem 2.0" "DatabasePath"
  ReadRegStr $NotesPathVal HKCU "Software\Stratagem 2.0" "NotesPath"

  # Default values if registry values are empty
  ${If} $DbPathVal == ""
    StrCpy $DbPathVal "$APPDATA\StratagemData"
  ${EndIf}
  ${If} $NotesPathVal == ""
    StrCpy $NotesPathVal "$PROFILE\Obsidian\Strategies"
  ${EndIf}

  # Define backup directory in user's Downloads folder
  StrCpy $BackupDir "$PROFILE\Downloads\StratagemBackup"

  # Run the silent Electron database, quotes, and neural uplink backup before deleting any files
  ${If} $INSTDIR != ""
    ExecWait '"$INSTDIR\Stratagem.exe" --uninstall-backup "$BackupDir"'
  ${EndIf}

  # Clean database files if registry path is valid
  ${If} $DbPathVal != ""
    Delete "$DbPathVal\stratagem_intel.db"
    Delete "$DbPathVal\stratagem.db"
    Delete "$DbPathVal\stratagem_intel.db-journal"
    Delete "$DbPathVal\stratagem_intel.db-wal"
    Delete "$DbPathVal\stratagem_intel.db-shm"
    Delete "$DbPathVal\stratagem.db-journal"
    Delete "$DbPathVal\stratagem.db-wal"
    Delete "$DbPathVal\stratagem.db-shm"
    RMDir "$DbPathVal"
  ${EndIf}

  # Clean the app's default user data folders
  RMDir /r "$APPDATA\Stratagem"
  RMDir /r "$APPDATA\n0-furnace"

  # DO NOT delete or RMDir the Strategies folder, devImages folder, or NoteCards folder
  # to preserve user notes, images, and cards on uninstall.

  # Clean the installation directory completely
  ${If} $INSTDIR != ""
    RMDir /r "$INSTDIR"
  ${EndIf}

  # Clean the registry keys
  DeleteRegKey HKCU "Software\Stratagem 2.0"
!macroend
