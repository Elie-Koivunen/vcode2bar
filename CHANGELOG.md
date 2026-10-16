# Changelog – vcode2bar

Versions follow [semantic versioning](https://semver.org/) and are tagged `vcode2bar-v<version>` in git.
This repository holds the latest version. Earlier versions (1.2.0–1.4.0), their changelog and the
complete earlier history are kept in the
[vibe repository's vcode2bar archive](https://github.com/Elie-Koivunen/vibe/tree/main/vcode2bar/archive).

## 1.5.0 – 2026-10-16

Installers and portable packages for Windows and Linux, and the licensing and notices that go with them.

### Added
- **Release packages for Windows and Linux (x86-64)** on the GitHub Releases page. Python isn't needed.
  - **Windows installer** (`…-windows-x64-setup.exe`, Inno Setup): installs for the current user
    without administrator rights, or for all users. It adds a Start-menu entry, an optional desktop
    icon and, optionally, the command-line tool on PATH, and has an uninstaller.
    - It checks for the Microsoft Visual C++ 2013 runtime that the barcode reader needs. If it's
      missing, it offers to download Microsoft's official installer, checked against a pinned SHA-256
      checksum, and install it. Silent installs use `/VERYSILENT /CURRENTUSER`, plus
      `/INSTALLVCREDIST=1` for the runtime.
  - **Windows portable** zip, with `vcode2bar.exe` (the window) and `vcode2bar-cli.exe` (the command
    line).
  - **Linux installer** (`…-linux-x64-setup.sh`): checks for the ZBar library and offers to install
    it with apt, dnf, zypper or pacman, then installs per user (`~/.local`) or system-wide (as root),
    with a menu entry and icon.
    - Options: `--yes`, `--prefix`, `--no-prerequisites`, `--prerequisites-only`, `--uninstall`.
  - **Linux portable** tar.gz.
  - **Checksums and sources:** `SHA256SUMS.txt`, plus the source code of the LGPL libraries in the
    Windows packages.
- **`project.ini`:** the product name, owner, copyright, website, contact and licence details live in
  one file. The About window, `--about`, the web page, the package readme and the Windows installer
  read them from there; none of it is written into the code.
- **Third-party notices:** `THIRD-PARTY-NOTICES.txt` lists every component the packages and the web
  version include, with its licence and source. It also has the trademark and non-affiliation notices.
  - Each package carries the full licence texts in a `licenses/` folder.
  - The program shows the notices under the new *Help → Third-party licences* window and with
    `--licenses`; the web version shows them in Help and links them from the footer.
- **`--about`** prints the version, licence, copyright, website and contact.
- **`packaging/`:** the build script (it smoke-tests every package and runs the full self-test inside
  the built program), the PyInstaller spec, both installers, the pinned build tools and third-party
  files, and the release routine (`packaging/README.md`).
- **The `release` workflow:** builds and tests both platforms, runs the Linux installer on Debian 12,
  Ubuntu 24.04, Fedora, openSUSE Tumbleweed and Arch Linux, checks the LGPL sources, and publishes
  the release when a `vcode2bar-v*` tag is pushed.
- The window uses the vcode2bar icon when it's available (packaged builds).

### Changed
- The About window and the licence texts describe only the current licence terms. The licence,
  copyright and contact lines come from `project.ini` instead of the translated texts.
- The web footer and Help take the licence, copyright and links from `project.ini`.

### Fixed
- **A test that depended on the computer.** On WSL, the GUI test for *Paste image* read the real
  Windows clipboard, so its result depended on what was copied at the time. It now tests the regular
  path with a stub; the WSL path keeps its own stubbed test.

## 1.4.0 – 2026-10-11

The web version, and a new license.

### Added
- **Web version** at **https://elie-koivunen.github.io/vcode2bar/web/**, documented in
  [docs/WEB.md](docs/WEB.md). It runs entirely in the browser, on a computer or a phone, with
  nothing to install.
  - **Same features as the GUI:** paste a code or invoice text, decoded fields with copy buttons,
    barcode preview with an automatic read-back check, and PNG (600 dpi with a `pHYs` chunk), SVG
    (sized in mm) and A4 PDF output plus printing. The Create form has *Add check digit* and
    *Convert to RF*. There's the list, CSV export (Excel-Nordic / standard) and batch-CSV import,
    four languages, and help.
  - **Reading** from photos, scans, screenshots and invoice PDFs (text layer and rendered pages), by
    file picker, **drag & drop** or **Ctrl+V**.
  - **New: camera scanning** on phones and laptops.
  - **New:** `#code` links open a code directly, and the page warns before you leave with an
    unexported list.
  - **Privacy is enforced:** a Content Security Policy with `connect-src 'self'` stops the page from
    connecting anywhere else. There are no analytics, cookies or third-party CDNs. Only the
    language and CSV format are stored, in the browser.
  - **Built on the Python version:** the texts, the Code 128 table and the test vectors are
    generated from `vcode2bar.py` (`web/tools/gen_fixtures.py`). The validation is a line-by-line
    port that's tested against Python's own results, including exact error messages and CSV bytes.
  - **Bundled, unmodified libraries:** zxing-wasm 3.1.5 (MIT; ZXing-C++) and PDF.js 6.4.299
    (Apache-2.0), with their licenses and checksums in `web/vendor/`. No build step and no npm at
    runtime.
  - **Tests:** a test page with about 1,730 checks, including the real page in a frame, file reading
    and camera scanning through a synthetic video stream. It runs headless via
    `web/tools/run_browser_tests.py`; there's also `web/tools/serve.py` for local use.
  - **CI:** the new `.github/workflows/web.yml` checks that the generated files match
    `vcode2bar.py`, runs the tests in headless Chrome, and only then publishes to GitHub Pages. The
    Python self-test workflow now skips web-only changes.

### Changed
- **License: PolyForm Noncommercial 1.0.0** (was MIT). The full text is in [LICENSE](LICENSE),
  headed by the `Required Notice` copyright line. `pyproject.toml` uses the SPDX id
  `PolyForm-Noncommercial-1.0.0` and the classifier "Free for non-commercial use". The program's
  header and the *About* window state the license in all four languages, and the README has a
  short summary. Versions 1.2.0–1.3.2 keep the MIT license they were released under.
