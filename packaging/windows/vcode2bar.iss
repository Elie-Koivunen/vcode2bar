; vcode2bar - Windows installer (Inno Setup 6.1 or newer). Built by packaging/build.py, which passes:
;   /DAppVersion=1.5.0 /DSourceDir=<PyInstaller output folder> /DOutputDir=<folder> /DRepoDir=<repository>
;   /DAppName /DAppPublisher /DAppURL /DAppWebURL /DAppContact   (read from project.ini - not written here)
;
; Silent installs:  setup.exe /VERYSILENT /CURRENTUSER [/DIR=...] [/TASKS="desktopicon,addtopath"]
;                   add /INSTALLVCREDIST=1 to also download and install the Microsoft VC++ 2013 runtime
;                   if it is missing (only interactive installs ask).

#ifndef AppVersion
  #error AppVersion must be defined (run packaging/build.py)
#endif

; The Microsoft Visual C++ 2013 Redistributable (x64), needed by the bundled ZBar library.
; Official download (aka.ms/highdpimfc2013x64enu), version 12.0.40664, Microsoft-signed; SHA-256 pinned.
#define VCRedistURL "https://download.visualstudio.microsoft.com/download/pr/10912041/cee5d6bca2ddbcd039da727bf4acb48a/vcredist_x64.exe"
#define VCRedistSHA256 "a4bba7701e355ae29c403431f871a537897c363e215cafe706615e270984f17c"

[Setup]
AppId={{6F1C8A52-3D7E-4B0A-9C21-5E4B7A2D9F13}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppContact}
AppUpdatesURL={#AppURL}/releases
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog commandline
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
MinVersion=10.0
LicenseFile={#RepoDir}\LICENSE
SetupIconFile={#RepoDir}\packaging\assets\vcode2bar.ico
UninstallDisplayIcon={app}\vcode2bar.exe
UninstallDisplayName={#AppName} {#AppVersion}
OutputDir={#OutputDir}
OutputBaseFilename=vcode2bar-{#AppVersion}-windows-x64-setup
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ChangesEnvironment=yes
VersionInfoVersion={#AppVersion}
VersionInfoProductName={#AppName}
VersionInfoProductVersion={#AppVersion}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "finnish"; MessagesFile: "compiler:Languages\Finnish.isl"
Name: "norwegian"; MessagesFile: "compiler:Languages\Norwegian.isl"
#if FileExists(AddBackslash(CompilerPath) + "Languages\Swedish.isl")
Name: "swedish"; MessagesFile: "compiler:Languages\Swedish.isl"
#endif

[CustomMessages]
english.VCTitle=Microsoft Visual C++ 2013 runtime
english.VCDesc=Needed to read barcodes from photos, scans and PDFs
english.VCText=vcode2bar's barcode reader needs the Microsoft Visual C++ 2013 Redistributable (x64), which is not installed on this PC. Everything else works without it.%n%nSetup can download Microsoft's official installer (about 7 MB from microsoft.com, checked by its checksum) and install it. Windows will ask for administrator permission.
english.VCOption=Download and install the Microsoft Visual C++ 2013 runtime now
english.VCFailed=The Microsoft Visual C++ 2013 runtime could not be installed (%1). vcode2bar works without it, except reading barcodes from images and PDFs. You can install it later from microsoft.com.
english.DesktopIcon=Create a desktop shortcut
english.AddToPath=Add the command-line tool (vcode2bar-cli) to PATH
english.WebVersion=vcode2bar web version
english.Notices=Third-party licences
finnish.VCTitle=Microsoft Visual C++ 2013 -ajonaikaiskirjasto
finnish.VCDesc=Tarvitaan viivakoodien lukemiseen kuvista ja PDF-tiedostoista
finnish.VCText=vcode2barin viivakoodinlukija tarvitsee Microsoft Visual C++ 2013 Redistributable (x64) -paketin, jota tässä tietokoneessa ei ole. Kaikki muu toimii ilman sitä.%n%nAsennusohjelma voi ladata Microsoftin virallisen asennusohjelman (noin 7 Mt, microsoft.com, tarkistussummalla varmennettu) ja asentaa sen. Windows pyytää järjestelmänvalvojan lupaa.
finnish.VCOption=Lataa ja asenna Microsoft Visual C++ 2013 -ajonaikaiskirjasto nyt
finnish.VCFailed=Microsoft Visual C++ 2013 -ajonaikaiskirjastoa ei voitu asentaa (%1). vcode2bar toimii ilman sitä, paitsi viivakoodien luku kuvista ja PDF-tiedostoista. Voit asentaa sen myöhemmin osoitteesta microsoft.com.
finnish.DesktopIcon=Luo pikakuvake työpöydälle
finnish.AddToPath=Lisää komentorivityökalu (vcode2bar-cli) PATH-polkuun
finnish.WebVersion=vcode2bar selainversio
finnish.Notices=Kolmansien osapuolten lisenssit
norwegian.VCTitle=Microsoft Visual C++ 2013-kjøretid
norwegian.VCDesc=Trengs for å lese strekkoder fra bilder, skanninger og PDF-er
norwegian.VCText=Strekkodeleseren i vcode2bar trenger Microsoft Visual C++ 2013 Redistributable (x64), som ikke er installert på denne PC-en. Alt annet fungerer uten den.%n%nInstallasjonen kan laste ned Microsofts offisielle installasjonsprogram (omtrent 7 MB fra microsoft.com, kontrollert med sjekksum) og installere det. Windows ber om administratortillatelse.
norwegian.VCOption=Last ned og installer Microsoft Visual C++ 2013-kjøretiden nå
norwegian.VCFailed=Microsoft Visual C++ 2013-kjøretiden kunne ikke installeres (%1). vcode2bar fungerer uten den, bortsett fra lesing av strekkoder fra bilder og PDF-er. Du kan installere den senere fra microsoft.com.
norwegian.DesktopIcon=Lag snarvei på skrivebordet
norwegian.AddToPath=Legg kommandolinjeverktøyet (vcode2bar-cli) til i PATH
norwegian.WebVersion=vcode2bar nettversjon
norwegian.Notices=Tredjepartslisenser
#if FileExists(AddBackslash(CompilerPath) + "Languages\Swedish.isl")
swedish.VCTitle=Microsoft Visual C++ 2013-körtid
swedish.VCDesc=Behövs för att läsa streckkoder från bilder, skanningar och PDF-filer
swedish.VCText=Streckkodsläsaren i vcode2bar behöver Microsoft Visual C++ 2013 Redistributable (x64), som inte är installerat på den här datorn. Allt annat fungerar utan den.%n%nInstallationsprogrammet kan ladda ned Microsofts officiella installationsprogram (cirka 7 MB från microsoft.com, kontrollerat med kontrollsumma) och installera det. Windows ber om administratörsbehörighet.
swedish.VCOption=Ladda ned och installera Microsoft Visual C++ 2013-körtiden nu
swedish.VCFailed=Microsoft Visual C++ 2013-körtiden kunde inte installeras (%1). vcode2bar fungerar utan den, förutom läsning av streckkoder från bilder och PDF-filer. Du kan installera den senare från microsoft.com.
swedish.DesktopIcon=Skapa genväg på skrivbordet
swedish.AddToPath=Lägg till kommandoradsverktyget (vcode2bar-cli) i PATH
swedish.WebVersion=vcode2bar webbversion
swedish.Notices=Tredjepartslicenser
#endif

[Tasks]
Name: "desktopicon"; Description: "{cm:DesktopIcon}"; Flags: unchecked
Name: "addtopath"; Description: "{cm:AddToPath}"; Flags: unchecked

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\vcode2bar.exe"; WorkingDir: "{userdocs}"
Name: "{group}\{cm:Notices}"; Filename: "{app}\THIRD-PARTY-NOTICES.txt"
Name: "{group}\{cm:WebVersion}"; Filename: "{#AppWebURL}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\vcode2bar.exe"; WorkingDir: "{userdocs}"; Tasks: desktopicon

[Run]
Filename: "{app}\vcode2bar.exe"; Description: "{cm:LaunchProgram,{#AppName}}"; Flags: nowait postinstall skipifsilent

[Code]
var
  VCPage: TInputOptionWizardPage;

function VCRuntimeInstalled: Boolean;
var
  Installed: Cardinal;
begin
  Result := FileExists(ExpandConstant('{sys}\msvcr120.dll'));
  if (not Result) and RegQueryDWordValue(HKLM64, 'SOFTWARE\Microsoft\VisualStudio\12.0\VC\Runtimes\x64', 'Installed', Installed) then
    Result := Installed = 1;
end;

function WantVCRuntime: Boolean;
begin
  if WizardSilent then
    Result := ExpandConstant('{param:INSTALLVCREDIST|0}') = '1'
  else
    Result := (VCPage <> nil) and VCPage.Values[0];
end;

procedure InitializeWizard;
begin
  if not VCRuntimeInstalled then begin
    VCPage := CreateInputOptionPage(wpSelectTasks, CustomMessage('VCTitle'), CustomMessage('VCDesc'),
                                    CustomMessage('VCText'), False, False);
    VCPage.Add(CustomMessage('VCOption'));
    VCPage.Values[0] := True;
  end;
end;

procedure InstallVCRuntime;
var
  ResultCode: Integer;
  FileName: String;
begin
  try
    // Inno Setup checks the SHA-256 and stops with an error if the file differs.
    DownloadTemporaryFile('{#VCRedistURL}', 'vcredist_x64.exe', '{#VCRedistSHA256}', nil);
    FileName := ExpandConstant('{tmp}\vcredist_x64.exe');
    if not ShellExec('runas', FileName, '/install /quiet /norestart', '', SW_SHOW, ewWaitUntilTerminated, ResultCode) then
      RaiseException(SysErrorMessage(ResultCode))
    else if (ResultCode <> 0) and (ResultCode <> 1638) and (ResultCode <> 3010) then
      RaiseException('exit code ' + IntToStr(ResultCode));
  except
    Log('VC++ runtime: ' + GetExceptionMessage);
    if not WizardSilent then
      MsgBox(FmtMessage(CustomMessage('VCFailed'), [GetExceptionMessage]), mbInformation, MB_OK);
  end;
end;

// ---- PATH (only when the "addtopath" task is chosen; removed again on uninstall)
const
  EnvKey = 'Environment';

procedure AddToUserPath(Dir: String);
var
  Paths: String;
begin
  if not RegQueryStringValue(HKCU, EnvKey, 'Path', Paths) then Paths := '';
  if Pos(';' + Uppercase(Dir) + ';', ';' + Uppercase(Paths) + ';') > 0 then exit;
  if (Paths <> '') and (Copy(Paths, Length(Paths), 1) <> ';') then Paths := Paths + ';';
  RegWriteExpandStringValue(HKCU, EnvKey, 'Path', Paths + Dir);
end;

procedure RemoveFromUserPath(Dir: String);
var
  Paths: String;
  P: Integer;
begin
  if not RegQueryStringValue(HKCU, EnvKey, 'Path', Paths) then exit;
  Paths := ';' + Paths + ';';
  P := Pos(';' + Uppercase(Dir) + ';', Uppercase(Paths));
  if P = 0 then exit;
  Delete(Paths, P, Length(Dir) + 1);
  Paths := Copy(Paths, 2, Length(Paths) - 2);
  RegWriteExpandStringValue(HKCU, EnvKey, 'Path', Paths);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then begin
    if WizardIsTaskSelected('addtopath') then AddToUserPath(ExpandConstant('{app}'));
    if (not VCRuntimeInstalled) and WantVCRuntime then InstallVCRuntime;
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usPostUninstall then RemoveFromUserPath(ExpandConstant('{app}'));
end;
