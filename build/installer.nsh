!include nsDialogs.nsh
!include LogicLib.nsh


Var Dialog
Var Label_DevImages
Var Text_DevImages
Var Button_DevImages
Var Label_NoteCards
Var Text_NoteCards
Var Button_NoteCards
Var Label_Database
Var Text_Database
Var Button_Database

Var DevImagesPath
Var NoteCardsPath
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
  ${NSD_CreateLabel} 0 5u 100% 15u "Configure custom folder portals for Strategem 1.0:"
  Pop $0
  SendMessage $0 0x30 $Font_Heavy 1

  # DevImages Folder Selection
  ${NSD_CreateLabel} 0 25u 100% 12u "Developer Portraits Folder (devImages):"
  Pop $Label_DevImages
  SendMessage $Label_DevImages 0x30 $Font_Bold 1
  ${NSD_CreateText} 0 39u 80% 12u "$PROFILE\Strategem\DeveloperImages"
  Pop $Text_DevImages
  ${NSD_CreateButton} 82% 38u 18% 14u "Browse..."
  Pop $Button_DevImages
  GetFunctionAddress $0 OnBrowseDevImages
  nsDialogs::OnClick $Button_DevImages $0

  # NoteCards Folder Selection
  ${NSD_CreateLabel} 0 57u 100% 12u "NoteCards Images Folder (NoteCards):"
  Pop $Label_NoteCards
  SendMessage $Label_NoteCards 0x30 $Font_Bold 1
  ${NSD_CreateText} 0 71u 80% 12u "$PROFILE\Strategem\NoteCards"
  Pop $Text_NoteCards
  ${NSD_CreateButton} 82% 70u 18% 14u "Browse..."
  Pop $Button_NoteCards
  GetFunctionAddress $0 OnBrowseNoteCards
  nsDialogs::OnClick $Button_NoteCards $0

  # Database Folder Selection
  ${NSD_CreateLabel} 0 89u 100% 12u "SQLite Database Folder:"
  Pop $Label_Database
  SendMessage $Label_Database 0x30 $Font_Bold 1
  ${NSD_CreateText} 0 103u 80% 12u "$APPDATA\StrategemData"
  Pop $Text_Database
  ${NSD_CreateButton} 82% 102u 18% 14u "Browse..."
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
  ${NSD_GetText} $Text_Database $DatabasePath

  # Create folders if they don't exist
  CreateDirectory "$DevImagesPath"
  CreateDirectory "$NoteCardsPath"
  CreateDirectory "$DatabasePath"

  # Write registry entries
  WriteRegStr HKCU "Software\Strategem 1.0" "DevImagesPath" "$DevImagesPath"
  WriteRegStr HKCU "Software\Strategem 1.0" "NoteCardsPath" "$NoteCardsPath"
  WriteRegStr HKCU "Software\Strategem 1.0" "DatabasePath" "$DatabasePath"
FunctionEnd

!macro customUnInstall
  # Read registry values using NSIS registers
  ReadRegStr $0 HKCU "Software\Strategem 1.0" "DatabasePath"

  # If registry values are not empty, clean database files
  ${If} $0 != ""
    Delete "$0\stratagem_intel.db"
    Delete "$0\stratagem.db"
    Delete "$0\stratagem_intel.db-journal"
    Delete "$0\stratagem_intel.db-wal"
    Delete "$0\stratagem_intel.db-shm"
    Delete "$0\stratagem.db-journal"
    Delete "$0\stratagem.db-wal"
    Delete "$0\stratagem.db-shm"
    # Remove the database directory itself if empty
    RMDir "$0"
  ${EndIf}

  # Clean the app's default user data folders
  RMDir /r "$APPDATA\Stratagem"
  RMDir /r "$APPDATA\n0-furnace"

  # Clean the task notes folder from user's profile
  RMDir /r "$PROFILE\StratagemNotes"

  # Clean the installation directory completely
  ${If} $INSTDIR != ""
    RMDir /r "$INSTDIR"
  ${EndIf}

  # Clean the registry keys
  DeleteRegKey HKCU "Software\Strategem 1.0"
!macroend

