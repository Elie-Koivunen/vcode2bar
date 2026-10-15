# Changelog – vcode2bar

Versions follow [semantic versioning](https://semver.org/) and are tagged `vcode2bar-v<version>` in git.
This repository holds the latest version. Earlier versions (1.2.0–1.3.2), their changelog and the
complete earlier history are kept in the
[vibe repository's vcode2bar archive](https://github.com/Elie-Koivunen/vibe/tree/main/vcode2bar/archive).

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
