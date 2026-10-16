# vcode2bar – release packages

Every release publishes, for **Windows** and **Linux** (x86-64), a portable package and an installer
that checks the prerequisites and offers to install missing ones, plus checksums and the source code
of the LGPL libraries in the Windows packages.

| Package | Made by | Notes |
|---|---|---|
| `vcode2bar-<v>-windows-x64-setup.exe` | Inno Setup 6 (`windows/vcode2bar.iss`) | per-user by default; Start menu, optional desktop icon and PATH; offers the Microsoft VC++ 2013 runtime; uninstaller |
| `vcode2bar-<v>-windows-x64-portable.zip` | `build.py` | unzip and run |
| `vcode2bar-<v>-linux-x64-setup.sh` | `linux/setup-header.sh` + tar.gz payload | checks ZBar, offers apt/dnf/zypper/pacman; `~/.local` or `/usr/local`; menu entry; `--uninstall` |
| `vcode2bar-<v>-linux-x64-portable.tar.gz` | `build.py` | unpack and run |
| `SHA256SUMS.txt` | release workflow | all assets |
| `zbar-0.10.tar.bz2`, `libiconv-1.14.tar.gz` | release workflow | LGPL sources, pinned in `third-party-sources.txt` |

## Files

```text
packaging/
├── build.py                 builds, smoke-tests and packages for the current platform
├── vcode2bar.spec           PyInstaller: vcode2bar.exe (GUI) + vcode2bar-cli.exe on Windows, vcode2bar on Linux
├── entry_gui.py / entry_cli.py
├── requirements.txt         exact versions of the bundled libraries and of PyInstaller
├── third-party-sources.txt  pinned checksums: LGPL sources, the Windows ZBar DLLs, the VC++ runtime
├── windows/vcode2bar.iss    the Windows installer
├── linux/setup-header.sh    the Linux installer script (the program is appended as a payload)
├── licenses/                licence texts that no Python package ships (Tcl/Tk, LGPL-2.1, Inno Setup)
├── assets/                  vcode2bar.ico / vcode2bar.png (made by make_icon.py)
└── make_icon.py
```

What goes into every package, next to the program: `LICENSE`, `THIRD-PARTY-NOTICES.txt`,
`project.ini`, `README.txt` (written from `project.ini`), the icon, and a `licenses/` folder with the
full licence text of every bundled component (collected from the installed packages at build time).

## Licensing rules for the packages

- **Project details live in `project.ini`** (name, owner, copyright, website, web app, contact,
  licence). The program, the web page, `README.txt` and the Windows installer's publisher/URLs read
  them from there. Change them only there.
- **The licence wording describes the current terms only.**
- **Third-party components:** every bundled component is listed in `THIRD-PARTY-NOTICES.txt` with its
  licence, and its full licence text is in the package's `licenses/` folder. A new or updated
  dependency must be added there before release.
- **LGPL libraries (Windows ZBar and libiconv):** shipped as separate, replaceable DLLs, unmodified
  from pyzbar's Windows package; `build.py` stops if they differ from the pinned checksums; their
  exact sources are attached to every release.
- **Nothing GPL is bundled.** On Linux, ZBar comes from the distribution's own package.
- **Prerequisites are downloaded only from their official sources** (microsoft.com for the VC++
  runtime) and checked against pinned SHA-256 checksums before they run.
- **Trademarks:** names of other products are used only to describe compatibility; the
  non-affiliation notice is in `THIRD-PARTY-NOTICES.txt`.

## Building locally

```bash
python -m pip install -r packaging/requirements.txt
python packaging/build.py --out /tmp/vcode2bar-build --selftest      # Linux (needs libzbar and a display)
python packaging\build.py --out %TEMP%\vcode2bar-build --selftest     # Windows (needs Inno Setup 6)
```

`build.py` stops with a message if any step fails. It checks the built program: `--version`,
`--about`, `--licenses`, `--deps`, a real render with read-back, reading a PDF, and with `--selftest`
the whole built-in test suite. On Linux it also installs and uninstalls the setup script once.

## Releasing

1. Archive the outgoing version in the vibe repository (`vcode2bar/archive/v<old>/`, see
   [docs/DEVELOPMENT.md](../docs/DEVELOPMENT.md#releasing-a-new-version-archive-policy)).
2. Bump `__version__` in `vcode2bar.py`, add the CHANGELOG section (it becomes the release notes),
   regenerate the web data (`python web/tools/gen_fixtures.py`), run the tests.
3. Optionally run the **release** workflow by hand (Actions tab) first: it builds and tests every
   package without publishing; the packages are kept as artifacts for 14 days.
4. Commit, push, check that CI is green, then tag and push the tag:
   `git tag -a vcode2bar-v<v> -m "vcode2bar <v>"` and `git push origin vcode2bar-v<v>`.
5. The release workflow builds and tests on Windows and Linux, runs the Linux installer on Debian 12,
   Ubuntu 24.04, Fedora, openSUSE Tumbleweed and Arch Linux, checks the LGPL sources, and publishes the
   GitHub Release with all files and `SHA256SUMS.txt`. Nothing is published if any test fails.

## Updating a bundled component

1. Change the pin in `requirements.txt` (or the URL and checksum in `third-party-sources.txt`).
2. Check its licence and update `THIRD-PARTY-NOTICES.txt`.
3. For pyzbar: if the Windows DLLs change, update their checksums and the attached sources.
4. Run the release workflow by hand and check every job.
