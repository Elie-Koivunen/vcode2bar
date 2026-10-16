# PyInstaller spec for vcode2bar. Run through packaging/build.py, which passes the paths.
#   Windows: vcode2bar.exe (GUI, no console window) + vcode2bar-cli.exe (command line), one folder
#   Linux:   vcode2bar (command line; without arguments it opens the GUI)
import sys
from pathlib import Path

from PyInstaller.utils.hooks import collect_data_files, collect_dynamic_libs

ROOT = Path(SPECPATH).parent                      # the repository root  # noqa: F821
PKG = ROOT / "packaging"
WINDOWS = sys.platform == "win32"

datas = collect_data_files("barcode")              # python-barcode's font for "digits under the bars"
# PIL._tkinter_finder is imported by name inside PIL.ImageTk when an image is first shown in the
# window - without it the barcode preview stays empty in a packaged build
hiddenimports = ["PIL.ImageTk", "PIL._tkinter_finder", "tkinter", "tkinter.ttk", "tkinter.filedialog",
                 "tkinter.messagebox", "pyzbar.pyzbar", "pypdfium2"]
# pyzbar loads its Windows DLLs (libzbar-64.dll, libiconv.dll) with ctypes from its own folder, so
# PyInstaller does not see them; on Linux the system's libzbar is used
binaries = collect_dynamic_libs("pyzbar") if WINDOWS else []
excludes = ["numpy", "pytest", "setuptools", "pip", "IPython"]


def analysis(script):
    return Analysis([str(PKG / script)], pathex=[str(ROOT)], datas=datas, binaries=binaries,  # noqa: F821
                    hiddenimports=hiddenimports, excludes=excludes, noarchive=False)


cli = analysis("entry_cli.py")
exe_cli = EXE(PYZ(cli.pure), cli.scripts, [], exclude_binaries=True,               # noqa: F821
              name="vcode2bar-cli" if WINDOWS else "vcode2bar", console=True,
              icon=str(PKG / "assets" / "vcode2bar.ico") if WINDOWS else None)
parts = [exe_cli, cli.binaries, cli.datas]

if WINDOWS:
    gui = analysis("entry_gui.py")
    exe_gui = EXE(PYZ(gui.pure), gui.scripts, [], exclude_binaries=True,           # noqa: F821
                  name="vcode2bar", console=False, icon=str(PKG / "assets" / "vcode2bar.ico"))
    parts += [exe_gui, gui.binaries, gui.datas]

COLLECT(*parts, name="vcode2bar", strip=False, upx=False)                          # noqa: F821
