/*
 * vcode2bar web - reading barcodes back: images (photos, scans, screenshots, pasted images),
 * invoice PDFs (text layer + rendered pages) and the camera.
 *
 * Barcode decoding: ZXing-C++ via zxing-wasm (vendor/zxing-wasm, MIT). PDFs: PDF.js
 * (vendor/pdfjs, Apache-2.0). Both are loaded only when first needed and served from this site.
 * Like the Python version, every barcode found is validated as a virtual barcode; other barcodes
 * are reported as "ignored", and harder variants (bigger, tilted) are tried until a code turns up.
 *
 * License: PolyForm Noncommercial 1.0.0 - see LICENSE.
 * Required Notice: Copyright (c) 2026 Elie Koivunen (https://github.com/Elie-Koivunen/vcode2bar)
 */
(function (root) {
  "use strict";
  const VC = root.VC;
  const BASE = new URL("../", document.currentScript ? document.currentScript.src : location.href);
  const vendor = (p) => new URL("vendor/" + p, BASE).href;

  let zxingReady = null;
  /** Load the zxing-wasm reader once, with the .wasm served from this site (not a CDN). */
  function zxing() {
    if (!zxingReady) {
      zxingReady = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = vendor("zxing-wasm/zxing-reader.iife.js");
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("could not load the barcode reader"));
        document.head.appendChild(s);
      }).then(() => root.ZXingWASM.prepareZXingModule({
        overrides: { locateFile: (path, prefix) => (path.endsWith(".wasm") ? vendor("zxing-wasm/" + path) : prefix + path) },
        fireImmediately: true,
      })).then(() => root.ZXingWASM);
      zxingReady.catch(() => { zxingReady = null; });
    }
    return zxingReady;
  }

  let pdfjsReady = null;
  function pdfjs() {
    if (!pdfjsReady) {
      pdfjsReady = import(vendor("pdfjs/pdf.min.mjs")).then((m) => {
        m.GlobalWorkerOptions.workerSrc = vendor("pdfjs/pdf.worker.min.mjs");
        return m;
      });
      pdfjsReady.catch(() => { pdfjsReady = null; });
    }
    return pdfjsReady;
  }

  // ------------------------------------------------------------------ image variants
  function toCanvas(src, w, h) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";                  // area-averaging, not pixel skipping
    ctx.drawImage(src, 0, 0, w, h);
    return c;
  }

  // ---- greyscale filters, as the Python reader uses them (autocontrast, median against speckle)
  function grey(c) {
    const d = imageData(c), g = new Uint8ClampedArray(c.width * c.height);
    for (let i = 0, j = 0; j < g.length; i += 4, j++) g[j] = (d.data[i] * 299 + d.data[i + 1] * 587 + d.data[i + 2] * 114) / 1000;
    return { w: c.width, h: c.height, g };
  }

  function fromGrey({ w, h, g }) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    const d = ctx.createImageData(w, h);
    for (let i = 0, j = 0; j < g.length; i += 4, j++) { d.data[i] = d.data[i + 1] = d.data[i + 2] = g[j]; d.data[i + 3] = 255; }
    ctx.putImageData(d, 0, 0);
    return c;
  }

  /** Stretch the histogram, ignoring the darkest/lightest 2 % (PIL's autocontrast(cutoff=2)). */
  function autocontrast(img) {
    const hist = new Uint32Array(256);
    for (const v of img.g) hist[v]++;
    const cut = img.g.length * 0.02;
    let lo = 0, hi = 255, acc = 0;
    while (lo < 255 && (acc += hist[lo]) <= cut) lo++;
    acc = 0;
    while (hi > 0 && (acc += hist[hi]) <= cut) hi--;
    if (hi <= lo) return img;
    const g = new Uint8ClampedArray(img.g.length), k = 255 / (hi - lo);
    for (let i = 0; i < g.length; i++) g[i] = (img.g[i] - lo) * k;
    return { ...img, g };
  }

  /** k x k median (k = 3 or 5): removes dust, scanner speckle and fax noise. */
  function median(img, k) {
    const { w, h } = img, r = k >> 1, g = new Uint8ClampedArray(w * h), win = new Uint8Array(k * k);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let n = 0;
        for (let dy = -r; dy <= r; dy++) {
          const yy = Math.min(h - 1, Math.max(0, y + dy)) * w;
          for (let dx = -r; dx <= r; dx++) win[n++] = img.g[yy + Math.min(w - 1, Math.max(0, x + dx))];
        }
        g[y * w + x] = win.sort()[n >> 1];
      }
    }
    return { ...img, g };
  }

  function rotated(src, deg) {
    const a = deg * Math.PI / 180, cos = Math.abs(Math.cos(a)), sin = Math.abs(Math.sin(a));
    const w = Math.ceil(src.width * cos + src.height * sin), h = Math.ceil(src.width * sin + src.height * cos);
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.translate(w / 2, h / 2);
    ctx.rotate(a);
    ctx.drawImage(src, -src.width / 2, -src.height / 2);
    return c;
  }

  /** Progressively harder versions of the picture (tilted photos need a rotation: a barcode is
   *  read along a line, and at ~7° a single line no longer crosses every bar). */
  function* variants(c) {
    yield c;
    const big = Math.max(c.width, c.height);
    const small = big < 1600;
    // enlarge small pictures to ~2400 px with smooth interpolation: at ~1.4 px per bar module a 2x
    // enlargement still fails, 3x reads (measured on 1/5-size test images)
    const f = Math.min(4, Math.max(2, Math.ceil(2400 / big)));
    const up = (x) => toCanvas(x, x.width * f, x.height * f);
    if (small) yield up(c);
    // the filters cost time on big pictures; photos that big are rarely that blurry or noisy
    if (c.width * c.height <= 6e6) {
      const g = grey(c), ac = fromGrey(autocontrast(g));
      yield ac;
      if (small) yield up(ac);
      for (const k of [3, 5]) {
        if (c.width * c.height > 2e6) break;            // median filtering is slow on big pictures
        const m = fromGrey(autocontrast(median(g, k)));
        yield m;
        if (small) yield up(m);
      }
    }
    for (const deg of [-4, 4, -8, 8, -12, 12, -20, 20, -30, 30]) yield rotated(c, deg);
  }

  const imageData = (c) => c.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, c.width, c.height);

  const OPTIONS = { formats: ["Code128"], tryHarder: true, tryRotate: true, tryInvert: true,
                    tryDownscale: true, maxNumberOfSymbols: 8 };

  /**
   * Decode every Code 128 in a canvas; validate each as a virtual barcode.
   * Returns {source, codes: [vb], rejected: [text], error}.
   */
  async function readCanvas(c, source) {
    const Z = await zxing();
    const res = { source: source || "image", codes: [], rejected: [], error: "" };
    const seen = new Set();
    for (const v of variants(c)) {
      const found = await Z.readBarcodes(imageData(v), OPTIONS);
      for (const r of found) {
        if (!r.isValid || seen.has(r.text)) continue;
        seen.add(r.text);
        try {
          res.codes.push(VC.parse(r.text));
        } catch (e) {
          if (!(e instanceof VC.VCError)) throw e;
          res.rejected.push(`${r.text.slice(0, 60)} (${e.message})`);
        }
      }
      if (res.codes.length) break;
    }
    if (!res.codes.length && !res.rejected.length) res.error = "no barcode found";
    return res;
  }

  /** Read-back check of a rendered barcode: exactly one Code 128, identical to the code (as in Python). */
  async function verifyCanvas(c, code) {
    const Z = await zxing();
    const found = (await Z.readBarcodes(imageData(c), { formats: ["Code128"], tryHarder: true, maxNumberOfSymbols: 4 }))
      .filter((r) => r.isValid);
    return found.length === 1 && found[0].text === code;
  }

  /** Quick single pass for camera frames. */
  async function readFrame(c) {
    const Z = await zxing();
    const found = await Z.readBarcodes(imageData(c), { formats: ["Code128"], tryHarder: true, tryRotate: true,
                                                        maxNumberOfSymbols: 2 });
    for (const r of found) {
      if (!r.isValid) continue;
      try { return VC.parse(r.text); } catch (e) { /* not a bank barcode: keep looking */ }
    }
    return null;
  }

  async function blobToCanvas(blob) {
    const bmp = await createImageBitmap(blob, { imageOrientation: "from-image" });
    try { return toCanvas(bmp, bmp.width, bmp.height); } finally { bmp.close && bmp.close(); }
  }

  const isPdf = (name, bytes) =>
    /\.pdf$/i.test(name || "") || (bytes && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46);

  /** A PDF: the text layer (a printed virtual barcode) and every page rendered at 300 dpi. */
  async function readPdf(bytes, name) {
    const res = { source: name, codes: [], rejected: [], error: "" };
    const found = new Map();
    const lib = await pdfjs();
    const task = lib.getDocument({ data: bytes.slice(), isEvalSupported: false });
    const doc = await task.promise;
    try {
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const tc = await page.getTextContent();
        const text = tc.items.map((it) => (it.str || "") + (it.hasEOL ? "\n" : " ")).join("");
        for (const vb of VC.iterCodes(text)) if (!found.has(vb.raw)) found.set(vb.raw, vb);
        const vp = page.getViewport({ scale: 300 / 72 });
        const c = document.createElement("canvas");
        c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, c.width, c.height);
        // intent "print": PDF.js then renders without requestAnimationFrame, which browsers pause in
        // background tabs - reading must not stall when the user switches tabs meanwhile
        await page.render({ canvasContext: ctx, canvas: c, viewport: vp, intent: "print" }).promise;
        const r = await readCanvas(c, name);
        for (const vb of r.codes) if (!found.has(vb.raw)) found.set(vb.raw, vb);
        res.rejected.push(...r.rejected);
        page.cleanup();
      }
    } finally {
      await task.destroy();                              // PDF.js 6: cleanup lives on the loading task
    }
    res.codes = [...found.values()];
    if (!res.codes.length && !res.rejected.length) res.error = "no virtual barcode found (text or barcode)";
    return res;
  }

  /** A File/Blob: image or PDF. Never throws for bad files: the result carries .error instead. */
  async function readFile(file, name) {
    name = name || file.name || "file";
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (isPdf(name, bytes)) return await readPdf(bytes, name);
      let c;
      try {
        c = await blobToCanvas(file instanceof Blob ? file : new Blob([bytes]));
      } catch (e) {
        return { source: name, codes: [], rejected: [], error: "not a readable image" };
      }
      const r = await readCanvas(c, name);
      return r;
    } catch (e) {
      return { source: name, codes: [], rejected: [], error: String(e && e.message || e) };
    }
  }

  // ------------------------------------------------------------------ camera
  /** Start scanning from the camera into `video`; resolves with the first bank code found. */
  function scanCamera(video, signal) {
    return new Promise(async (resolve, reject) => {
      let stream;
      const stop = () => {
        if (stream) stream.getTracks().forEach((t) => t.stop());
        video.srcObject = null;
      };
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
      } catch (e) {
        reject(e);
        return;
      }
      if (signal) signal.addEventListener("abort", () => { stop(); resolve(null); });
      video.srcObject = stream;
      video.setAttribute("playsinline", "");
      await video.play().catch(() => {});
      await zxing().catch((e) => { stop(); reject(e); });
      const c = document.createElement("canvas");
      const tick = async () => {
        if (signal && signal.aborted) return;
        if (video.videoWidth) {
          c.width = video.videoWidth; c.height = video.videoHeight;
          c.getContext("2d", { willReadFrequently: true }).drawImage(video, 0, 0);
          try {
            const vb = await readFrame(c);
            if (vb) { stop(); resolve(vb); return; }
          } catch (e) { stop(); reject(e); return; }
        }
        setTimeout(tick, 150);
      };
      tick();
    });
  }

  root.VCReader = { zxing, pdfjs, readCanvas, readFile, readPdf, readFrame, verifyCanvas, blobToCanvas, scanCamera,
                    rotated, toCanvas };
})(typeof window !== "undefined" ? window : globalThis);
