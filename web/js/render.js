/*
 * vcode2bar web - rendering: SVG, 600 dpi PNG (with a pHYs chunk, so it prints at the right size)
 * and the A4 PDF page, all to the bank barcode specification:
 *   Code 128 set C, module 0.30 mm (332 modules = 99.6 mm of bars), bars 12 mm high,
 *   20 mm quiet zones left and right, no digits under the bars (optional, off by default).
 * The PDF is written directly (vector bars, standard Helvetica, a real text layer), no library.
 *
 * License: PolyForm Noncommercial 1.0.0 - see LICENSE.
 * Required Notice: Copyright (c) 2026 Elie Koivunen (https://github.com/Elie-Koivunen/vcode2bar)
 */
(function (root) {
  "use strict";
  const VC = root.VC;

  const SPEC = { module: 0.30, height: 12.0, quiet: 20.0, margin: 1.0, textGap: 1.5, textSize: 2.8, dpi: 600 };

  /** Bars as [startModule, widthInModules] runs. */
  function barRuns(code) {
    const m = VC.code128Modules(code);
    const runs = [];
    for (let i = 0; i < m.length;) {
      if (m[i] === "1") {
        let j = i;
        while (j < m.length && m[j] === "1") j++;
        runs.push([i, j - i]);
        i = j;
      } else i++;
    }
    return { runs, modules: m.length };
  }

  /** Overall size in mm. */
  function geometry(code, withText) {
    const { runs, modules } = barRuns(code);
    const barsW = modules * SPEC.module;
    const width = barsW + 2 * SPEC.quiet;
    const height = SPEC.margin * 2 + SPEC.height + (withText ? SPEC.textGap + SPEC.textSize + 0.6 : 0);
    return { runs, modules, barsW, width, height };
  }

  const r3 = (x) => Math.round(x * 1000) / 1000;

  /** Vector SVG, sized in millimetres (prints at the specified size). */
  function svg(code, withText) {
    const g = geometry(code, withText);
    const rects = g.runs.map(([s, w]) =>
      `<rect x="${r3(SPEC.quiet + s * SPEC.module)}" y="${SPEC.margin}" width="${r3(w * SPEC.module)}" height="${SPEC.height}"/>`
    ).join("");
    const text = withText
      ? `<text x="${r3(g.width / 2)}" y="${r3(SPEC.margin + SPEC.height + SPEC.textGap + SPEC.textSize)}" ` +
        `font-family="DejaVu Sans Mono, Consolas, monospace" font-size="${SPEC.textSize}" text-anchor="middle">${code}</text>`
      : "";
    return `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<svg xmlns="http://www.w3.org/2000/svg" width="${r3(g.width)}mm" height="${r3(g.height)}mm" ` +
      `viewBox="0 0 ${r3(g.width)} ${r3(g.height)}" shape-rendering="crispEdges">` +
      `<title>Bank barcode ${code}</title>` +
      `<rect width="100%" height="100%" fill="#fff"/><g fill="#000">${rects}</g>${text}</svg>\n`;
  }

  /** Raster canvas at `dpi`. Bar edges are snapped to whole pixels: no grey, anti-aliased edges. */
  function canvas(code, withText, dpi) {
    dpi = dpi || SPEC.dpi;
    const g = geometry(code, withText);
    const px = (mm) => Math.round(mm / 25.4 * dpi);
    const c = document.createElement("canvas");
    c.width = px(g.width);
    c.height = px(g.height);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#000";
    const y0 = px(SPEC.margin), y1 = px(SPEC.margin + SPEC.height);
    for (const [s, w] of g.runs) {
      const x0 = px(SPEC.quiet + s * SPEC.module), x1 = px(SPEC.quiet + (s + w) * SPEC.module);
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
    if (withText) {
      ctx.font = `${px(SPEC.textSize)}px "DejaVu Sans Mono", Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(code, c.width / 2, px(SPEC.margin + SPEC.height + SPEC.textGap + SPEC.textSize));
    }
    return c;
  }

  // ------------------------------------------------------------------ PNG with a pHYs (dpi) chunk
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  /** Insert (or replace) the pHYs chunk right after IHDR. */
  function setPngDpi(bytes, dpi) {
    const ppm = Math.round(dpi / 0.0254);
    const chunk = new Uint8Array(21);
    const dv = new DataView(chunk.buffer);
    dv.setUint32(0, 9);
    chunk.set([0x70, 0x48, 0x59, 0x73], 4);              // "pHYs"
    dv.setUint32(8, ppm);
    dv.setUint32(12, ppm);
    chunk[16] = 1;                                         // unit: metre
    dv.setUint32(17, crc32(chunk.subarray(4, 17)));
    // walk chunks; drop an existing pHYs
    const parts = [bytes.subarray(0, 8)];
    let pos = 8;
    const src = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    while (pos < bytes.length) {
      const len = src.getUint32(pos);
      const type = String.fromCharCode(...bytes.subarray(pos + 4, pos + 8));
      const end = pos + 12 + len;
      if (type !== "pHYs") parts.push(bytes.subarray(pos, end));
      if (type === "IHDR") parts.push(chunk);
      pos = end;
    }
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let o = 0;
    for (const p of parts) { out.set(p, o); o += p.length; }
    return out;
  }

  /** PNG bytes at 600 dpi (the canvas is created for the purpose). */
  async function png(code, withText) {
    const c = canvas(code, withText, SPEC.dpi);
    const blob = await new Promise((res) => c.toBlob(res, "image/png"));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return setPngDpi(bytes, SPEC.dpi);
  }

  // ------------------------------------------------------------------ PDF (A4)
  // Windows-1252 (WinAnsiEncoding) for the standard Helvetica font: covers ä ö å ø æ € and –.
  const CP1252_EXTRA = { "€": 0x80, "‚": 0x82, "„": 0x84, "…": 0x85, "–": 0x96, "—": 0x97, "‘": 0x91,
                         "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "™": 0x99, "Š": 0x8a, "š": 0x9a,
                         "Ž": 0x8e, "ž": 0x9e, "Œ": 0x8c, "œ": 0x9c, "Ÿ": 0x9f };

  function pdfString(s) {
    let out = "(";
    for (const ch of String(s)) {
      let b = ch.codePointAt(0);
      if (CP1252_EXTRA[ch] !== undefined) b = CP1252_EXTRA[ch];
      else if (b > 0xff || (b >= 0x80 && b < 0xa0)) b = 0x3f;           // '?'
      if (b === 0x28 || b === 0x29 || b === 0x5c) out += "\\" + String.fromCharCode(b);
      else if (b < 0x20 || b > 0x7e) out += "\\" + b.toString(8).padStart(3, "0");
      else out += String.fromCharCode(b);
    }
    return out + ")";
  }

  /**
   * The A4 payment page, laid out like the Python version: heading, account, amount, reference and
   * due date, the 54 digits in small print, then the full-size barcode (not directly under text) and
   * a footnote. labels = {head, account, amount, reference, due, note}; values formatted by the caller.
   */
  function pdf(code, labels, values) {
    const mmPt = (mm) => mm * 72 / 25.4;
    const W = 595.28, H = 841.89;                        // A4 in points
    const top = (mm) => r3(H - mmPt(mm));                // y from the top edge, as in the Python layout
    let cs = "";
    const text = (font, size, xMm, yTopMm, s, grey) => {
      cs += `BT /${font} ${r3(size)} Tf ${grey} g ${r3(mmPt(xMm))} ${top(yTopMm)} Td ${pdfString(s)} Tj ET\n`;
    };
    // Python sizes are pixel heights in mm (6 / 4.2 / 3.2 / 2.8); in points, cap height ~0.72 x size
    const big = mmPt(6) * 0.92, mid = mmPt(4.2) * 0.92, small = mmPt(3.2) * 0.92, tiny = mmPt(2.8) * 0.92;
    let y = 25;
    text("F2", big, 25, y + 5, labels.head, "0");
    y += 12;
    for (const [k, v] of [[labels.account, values.account], [labels.amount, values.amount],
                          [labels.reference, values.reference], [labels.due, values.due]]) {
      text("F1", mid, 25, y + 3.6, k, "0.27");
      text("F1", mid, 75, y + 3.6, v, "0");
      y += 7.5;
    }
    text("F3", small, 25, y + 2 + 2.8, code, "0.27");
    // barcode: quiet zones included, centred, its top at y + 15 mm (as in the Python page)
    const g = geometry(code, false);
    const x0 = (210 - g.width) / 2 + SPEC.quiet;
    const barTop = y + 15 + SPEC.margin;
    cs += "0 g\n";
    for (const [s, w] of g.runs) {
      cs += `${r3(mmPt(x0 + s * SPEC.module))} ${r3(H - mmPt(barTop + SPEC.height))} ` +
            `${r3(mmPt(w * SPEC.module))} ${r3(mmPt(SPEC.height))} re\n`;
    }
    cs += "f\n";
    text("F1", tiny, 25, 280 + 2.3, labels.note, "0.53");

    const enc = new TextEncoder();
    const objs = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << ` +
        "/F1 4 0 R /F2 5 0 R /F3 6 0 R >> >> /Contents 7 0 R >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>",
      null,                                              // content stream, below
      `<< /Title ${pdfString("Bank barcode " + code)} /Producer (vcode2bar web) /Creator (vcode2bar) >>`,
    ];
    const csBytes = latin1(cs);
    const chunks = [];
    let len = 0;
    const push = (u8) => { chunks.push(u8); len += u8.length; };
    push(enc.encode("%PDF-1.4\n"));
    push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));   // binary marker comment
    const offsets = [];
    objs.forEach((o, i) => {
      offsets.push(len);
      if (o === null) {
        push(enc.encode(`${i + 1} 0 obj\n<< /Length ${csBytes.length} >>\nstream\n`));
        push(csBytes);
        push(enc.encode("\nendstream\nendobj\n"));
      } else {
        push(latin1(`${i + 1} 0 obj\n${o}\nendobj\n`));
      }
    });
    const xref = len;
    let tail = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    for (const off of offsets) tail += `${String(off).padStart(10, "0")} 00000 n \n`;
    tail += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info ${objs.length} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    push(enc.encode(tail));
    const out = new Uint8Array(len);
    let p = 0;
    for (const c of chunks) { out.set(c, p); p += c.length; }
    return out;
  }

  function latin1(s) {
    const u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 0xff;
    return u;
  }

  root.VCRender = { SPEC, barRuns, geometry, svg, canvas, png, setPngDpi, crc32, pdf, pdfString };
})(typeof window !== "undefined" ? window : globalThis);
