# Bundled third-party libraries

The web version serves these files itself, so it needs no CDN and sends nothing to third parties.
They keep their own licenses, which are included in each folder. vcode2bar's own PolyForm
Noncommercial license doesn't apply to them.

| Folder | Library | Version | License | Files (unmodified from the npm package) | Used for |
|---|---|---|---|---|---|
| `zxing-wasm/` | [zxing-wasm](https://github.com/Sec-ant/zxing-wasm) (ZXing-C++ compiled to WebAssembly) | 3.1.5 | MIT | `dist/iife/reader/index.js` → `zxing-reader.iife.js`, `dist/reader/zxing_reader.wasm` | reading barcodes from photos, scans, PDFs and the camera |
| `pdfjs/` | [PDF.js](https://github.com/mozilla/pdf.js) (`pdfjs-dist`) | 6.4.299 | Apache-2.0 | `build/pdf.min.mjs`, `build/pdf.worker.min.mjs` | reading invoice PDFs (text layer and page images) |

The npm integrity hashes (sha512) were checked when downloading:

- zxing-wasm 3.1.5: `sha512-jmxXvTCR/qZxMz2XwR6V+nL2BlDTD1aux7ZWSH9BV77TG9u4k0VyHba/NCCHBHJ60Wg6VV0QL/SMlJczKhJI4w==`
- pdfjs-dist 6.4.299: `sha512-AVl138zALtfaAPvADulE0PZThbYzCBS79nL4pOSL/6Sm/4AH5A21BD9VHt97OlCuzJuCpmeZtAtkinisF4Vb1g==`

To update, download the new package tarballs from registry.npmjs.org, check their integrity,
copy the same files, update this table, and run the web tests (`web/tests/`).
