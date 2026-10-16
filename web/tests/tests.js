/*
 * vcode2bar web - test page. Checks the JavaScript against vectors.json, which the Python version
 * produced (web/tools/gen_fixtures.py), plus rendering, read-back, PDF and file-reading tests.
 * Open web/tests/ in a browser (served over http), or run web/tools/run_browser_tests.py.
 * Results: the page body, document.title ("PASS ..." / "FAIL ..."), and - when the URL has
 * ?report=1 - a JSON POST to /__report for the test runner.
 */
(async function () {
  "use strict";
  const out = document.getElementById("log");
  const results = { pass: 0, fail: 0, failures: [], groups: [] };
  let group = "";
  const log = (s, cls) => {
    const div = document.createElement("div");
    if (cls) div.className = cls;
    div.textContent = s;
    out.appendChild(div);
  };
  function check(name, ok, detail) {
    if (ok) { results.pass++; return true; }
    results.fail++;
    const msg = `${group}: ${name}` + (detail !== undefined ? ` -- ${typeof detail === "string" ? detail : JSON.stringify(detail)}` : "");
    results.failures.push(msg);
    log("FAIL " + msg, "fail");
    return false;
  }
  const eq = (name, got, want) => check(name, JSON.stringify(got) === JSON.stringify(want), { got, want });
  function throwsField(name, fn, field) {
    try { fn(); } catch (e) {
      if (!(e instanceof VC.VCError)) return check(name, false, "threw " + e);
      return field ? check(name, e.field === field, { got: e.field, want: field }) : check(name, true);
    }
    return check(name, false, "did not throw");
  }
  async function section(name, fn) {
    group = name;
    const before = results.pass + results.fail, failBefore = results.fail, t0 = performance.now();
    try { await fn(); } catch (e) { check("unexpected exception", false, String(e && e.stack || e)); }
    const n = results.pass + results.fail - before;
    const ms = Math.round(performance.now() - t0);
    results.groups.push({ name, checks: n, failed: results.fail - failBefore, ms });
    const line = `${results.fail - failBefore ? "FAIL" : "PASS"} ${name}: ${n} checks (${ms} ms)`;
    log(line, results.fail - failBefore ? "fail" : "pass");
    progress(line);
  }
  const REPORT = new URLSearchParams(location.search).has("report");
  function progress(line) {                         // live progress for the test runner (headless runs)
    if (REPORT) fetch("/__progress", { method: "POST", body: line }).catch(() => {});
  }

  const V = await (await fetch("vectors.json")).json();
  log(`vectors from ${V.generated_from}; ${navigator.userAgent}`);
  const today = new Date(2026, 9, 11);

  await section("parse: official, third-party and random codes", () => {
    for (const e of V.valid) {
      const vb = VC.parse(e.code);
      eq(`${e.source} ${e.code} fields`, [vb.version, vb.iban, vb.cents, vb.reference, vb.due],
         [e.version, e.iban, e.cents, e.reference, e.due]);
      check(`${e.code} modules = python-barcode`, VC.code128Modules(e.code) === e.modules,
            { got: VC.code128Modules(e.code).length, want: e.modules.length });
      eq(`${e.code} checksum`, VC.code128Checksum(e.code), e.checksum);
    }
    V.official_printed_checksums.forEach((chk, i) => eq(`official ${i + 1} printed checksum`, VC.code128Checksum(V.valid[i].code), chk));
    for (const s of V.spaced) eq(`spaces/dashes ${s.input}`, VC.parse(s.input).raw, s.code);
  });

  await section("parse: invalid codes give the Python error", () => {
    for (const n of V.invalid) {
      try { VC.parse(n.code); check(n.name, false, "accepted"); }
      catch (e) { eq(n.name, e.message, n.message); }
    }
  });

  await section("build: payment details -> code (inverse of parse)", () => {
    for (const b of V.build) eq(`${b.iban} ${b.amount} ${b.reference} ${b.due}`, VC.buildCode(b.iban, b.amount, b.reference, b.due), b.code);
    for (const b of V.build_errors) throwsField(`bad ${b.field}: ${b[b.field]}`, () => VC.buildCode(b.iban, b.amount, b.reference, b.due), b.field);
  });

  await section("reference helpers, amounts and dates", () => {
    for (const r of V.fi_reference) eq(`fiReference(${r.base})`, VC.fiReference(r.base), r.ref);
    for (const b of V.fi_reference_errors) throwsField(`fiReference(${b})`, () => VC.fiReference(b), "reference");
    for (const r of V.rf_reference) eq(`rfReference(${r.body})`, VC.rfReference(r.body), r.ref);
    for (const a of V.amounts) eq(`amount '${a.text}'`, VC.parseAmount(a.text), a.cents);
    for (const a of V.amount_errors) throwsField(`amount '${a}'`, () => VC.parseAmount(a), "amount");
    for (const d of V.dues) eq(`due '${d.text}'`, VC.parseDue(d.text), d.due);
    for (const d of V.due_errors) throwsField(`due '${d}'`, () => VC.parseDue(d), "due");
  });

  await section("finding codes in text", () => {
    for (const x of V.extract) eq(JSON.stringify(x.text).slice(0, 50), VC.iterCodes(x.text).map((v) => v.raw), x.codes);
  });

  await section("formatting", () => {
    for (const f of V.format) {
      const vb = VC.parse(f.code);
      eq(`iban ${f.code}`, VC.fmtIban(vb.iban), f.iban);
      eq(`reference ${f.code}`, VC.fmtRef(vb.reference), f.reference);
      for (const [lang, want] of Object.entries(f.amount)) {
        eq(`amount ${lang} ${f.code}`, VC.fmtAmount(vb.cents, VC_STRINGS_CORE[lang].amount_open), want);
      }
    }
  });

  await section("CSV export = Python's csv module", () => {
    const rows = V.csv_export.rows;
    rows.forEach((r) => {
      const rec = VC.toRecord(VC.parse(r.code), r.source, today, new Date(2026, 9, 11, 12, 0, 0));
      for (const k of VC.CSV_FIELDS) eq(`${r.code} ${k}`, String(rec[k]), String(r[k]));
    });
    eq("standard CSV text", VC.writeCsv(rows, false), V.csv_export.standard);
    eq("Excel CSV text", VC.writeCsv(rows, true), V.csv_export.excel);
  });

  await section("batch CSV import = Python's read_batch_csv", () => {
    for (const b of V.batch) {
      const bytes = Uint8Array.from(atob(b.bytes_b64), (c) => c.charCodeAt(0));
      if (b.error) {
        try { VC.readBatchCsv(bytes, b.name); check(b.name, false, "accepted"); }
        catch (e) { eq(b.name, e.message, b.error); }
        continue;
      }
      const got = VC.readBatchCsv(bytes, b.name).map((r) => ({ line: r.line, source: r.source, code: r.vb ? r.vb.raw : null, field: r.field || null }));
      eq(b.name, got, b.rows);
    }
    eq("batch columns", VC.BATCH_COLUMNS, V.batch_columns);
  });

  await section("strings: every language has every key", () => {
    const S = window.VC_STRINGS || {};
    const langs = Object.keys(VC_LANGUAGES);
    for (const src of [["core", VC_STRINGS_CORE], ["web", window.VC_STRINGS_WEB]]) {
      if (!src[1]) continue;
      const keys = Object.keys(src[1].en).sort();
      for (const l of langs) eq(`${src[0]} ${l}`, Object.keys(src[1][l]).sort(), keys);
    }
    check("merged strings loaded", !window.VC_STRINGS_WEB || Object.keys(S).length === langs.length);
  });

  await section("rendering: SVG, PNG (600 dpi), sizes", async () => {
    for (const e of V.valid.slice(0, 20)) {
      const g = VCRender.geometry(e.code, false);
      eq(`${e.code} 332 modules`, g.modules, 332);
      check(`${e.code} bars 99.6 mm`, Math.abs(g.barsW - 99.6) < 1e-9, g.barsW);
      const s = VCRender.svg(e.code, false);
      eq(`svg rect count ${e.code}`, (s.match(/<rect /g) || []).length - 1, g.runs.length);
      check("svg size in mm", s.includes('width="139.6mm"'), s.slice(0, 200));
    }
    const bytes = await VCRender.png(V.valid[0].code, false);
    const dv = new DataView(bytes.buffer);
    eq("png signature", Array.from(bytes.slice(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
    eq("png width = 139.6 mm at 600 dpi", dv.getUint32(16), Math.round(139.6 / 25.4 * 600));
    const phys = String.fromCharCode(...bytes.slice(37, 41));
    eq("pHYs right after IHDR", phys, "pHYs");
    eq("pHYs = 600 dpi", dv.getUint32(41), Math.round(600 / 0.0254));
    eq("pHYs crc", dv.getUint32(50), VCRender.crc32(bytes.slice(37, 50)));
  });

  await section("read-back: rendered images decode to the same code", async () => {
    const pick = [V.valid[0], V.valid[9], ...V.valid.slice(20, 50)];
    for (const e of pick) {
      const r = await VCReader.readCanvas(VCRender.canvas(e.code, false, 600), "clean");
      eq(`clean ${e.code}`, r.codes.map((x) => x.raw), [e.code]);
    }
    const r = await VCReader.readCanvas(VCRender.canvas(V.valid[0].code, true, 600), "with text");
    eq("with digits under the bars", r.codes.map((x) => x.raw), [V.valid[0].code]);
  });

  await section("reading degraded images (rotated, tilted, small, noisy, JPEG)", async () => {
    const rnd = (() => { let s = 12345; return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648; })();
    const degrade = {
      rot90: (c) => VCReader.rotated(c, 90),
      rot180: (c) => VCReader.rotated(c, 180),
      tilt12: (c) => VCReader.rotated(c, 12),
      tilt_m25: (c) => VCReader.rotated(c, -25),
      small: (c) => VCReader.toCanvas(c, Math.round(c.width / 5), Math.round(c.height / 5)),
      noise: (c) => {
        const s = VCReader.toCanvas(c, Math.round(c.width / 3), Math.round(c.height / 3));
        const ctx = s.getContext("2d"), d = ctx.getImageData(0, 0, s.width, s.height);
        for (let i = 0; i < d.data.length / 4 / 12; i++) {
          const p = Math.floor(rnd() * d.data.length / 4) * 4, v = rnd() < 0.5 ? 0 : 255;
          d.data[p] = d.data[p + 1] = d.data[p + 2] = v;
        }
        ctx.putImageData(d, 0, 0);
        return s;
      },
      jpeg: async (c) => {
        const s = VCReader.toCanvas(c, Math.round(c.width / 3), Math.round(c.height / 3));
        const blob = await new Promise((res) => s.toBlob(res, "image/jpeg", 0.4));
        return VCReader.blobToCanvas(blob);
      },
    };
    for (const e of [V.valid[0], V.valid[9], V.valid[100], V.valid[200]]) {
      const base = VCRender.canvas(e.code, false, 600);
      for (const [kind, fn] of Object.entries(degrade)) {
        const r = await VCReader.readCanvas(await fn(base), kind);
        eq(`${kind} ${e.code}`, r.codes.map((x) => x.raw), [e.code]);
      }
    }
    // two codes in one picture
    const a = VCRender.canvas(V.valid[0].code, false, 600), b = VCRender.canvas(V.valid[9].code, false, 600);
    const both = document.createElement("canvas");
    both.width = a.width; both.height = a.height + b.height + 200;
    const ctx = both.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, both.width, both.height);
    ctx.drawImage(a, 0, 0); ctx.drawImage(b, 0, a.height + 200);
    const r = await VCReader.readCanvas(both, "two");
    eq("two codes in one image", r.codes.map((x) => x.raw).sort(), [V.valid[0].code, V.valid[9].code].sort());
    const blank = VCReader.toCanvas(document.createElement("canvas"), 800, 300);
    eq("blank image", (await VCReader.readCanvas(blank, "blank")).error, "no barcode found");
  });

  await section("PDF page: written here, read back with PDF.js (text layer + barcode)", async () => {
    const e = V.valid[9], vb = VC.parse(e.code), L = VC_STRINGS_CORE.fi;
    const bytes = VCRender.pdf(e.code,
      { head: L.pdf_head, account: L.account, amount: L.amount, reference: L.reference, due: L.due, note: L.pdf_note },
      { account: VC.fmtIban(vb.iban), amount: VC.fmtAmount(vb.cents, L.amount_open), reference: VC.fmtRef(vb.reference), due: VC.fmtDue(vb.due) });
    eq("starts %PDF", String.fromCharCode(...bytes.slice(0, 5)), "%PDF-");
    const lib = await VCReader.pdfjs();
    const task = lib.getDocument({ data: bytes.slice() });
    const doc = await task.promise;
    eq("one page", doc.numPages, 1);
    const page = await doc.getPage(1);
    const vp = page.getViewport({ scale: 1 });
    eq("A4 width (pt)", Math.round(vp.width), 595);
    eq("A4 height (pt)", Math.round(vp.height), 842);
    const text = (await page.getTextContent()).items.map((i) => i.str).join(" ");
    check("text layer has the code", text.includes(e.code), text);
    check("text layer has Nordic letters and €", text.includes("Eräpäivä") && text.includes("€"), text);
    await task.destroy();
    const r = await VCReader.readPdf(bytes, "own.pdf");
    eq("own PDF reads back", r.codes.map((x) => x.raw), [e.code]);
  });

  await section("files made by the Python version", async () => {
    for (const f of V.files) {
      const blob = await (await fetch("fixtures/" + f.file)).blob();
      const r = await VCReader.readFile(new File([blob], f.file), f.file);
      eq(`${f.file} codes`, r.codes.map((x) => x.raw).sort(), [...f.codes].sort());
      if (f.rejected_contains) check(`${f.file} rejected`, r.rejected.some((x) => x.includes(f.rejected_contains)), r.rejected);
      if (f.error) eq(`${f.file} error`, r.error, f.error);
      if (f.error_any) check(`${f.file} has an error`, !!r.error, r);
    }
  });

  await section("the page itself (index.html in a frame): input, tabs, languages, form, list, camera", async () => {
    const frame = document.createElement("iframe");
    frame.style.cssText = "width:1000px;height:800px;border:1px solid #ccc";
    frame.src = "../index.html";
    document.body.appendChild(frame);
    await new Promise((res) => frame.addEventListener("load", res, { once: true }));
    const W = frame.contentWindow, D = W.document, A = W.vcode2barApp;
    const $ = (id) => D.getElementById(id);
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const until = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(50); } return fn(); };
    const step = (s) => progress("  ui step: " + s);
    check("app loaded", !!A);
    const sel = $("lang"); sel.value = "en"; sel.dispatchEvent(new W.Event("change"));
    const c0 = V.valid[0].code, c9 = V.valid[9].code;
    step("1 a whole invoice text: code found, fields, preview, read-back check"); // 1 a whole invoice text: code found, fields, preview, read-back check
    A.setInput("Invoice 1043\nCode: " + c0.match(/.{1,4}/g).join(" ") + "\nThanks");
    eq("status", $("status").textContent, VC_STRINGS.en.ok);
    eq("counter says found", $("count").textContent, VC_STRINGS.en.found);
    eq("account shown", $("details").querySelectorAll("dd")[1].textContent, "FI79 4405 2020 0360 82");
    eq("amount shown", $("details").querySelectorAll("dd")[2].textContent, "4 883,15 €");
    check("overdue in amber", $("details").querySelectorAll("dd")[4].className === "warn");
    check("preview svg", !!$("preview").querySelector("svg"));
    check("save buttons enabled", !$("btn-png").disabled && !$("btn-pdf").disabled);
    check("read-back check passes", await until(() => $("verify").textContent === VC_STRINGS.en.verify_ok, 20000), $("verify").textContent);
    step("2 invalid input explains why, buttons disabled (same messages as the Python GUI)"); // 2 invalid input explains why, buttons disabled (same messages as the Python GUI)
    for (const [bad, frag] of [[c0.slice(0, 40), "54 digits"], [c0.slice(0, 5) + (c0[5] === "9" ? "8" : "9") + c0.slice(6), "IBAN"],
                               ["hello world", VC_STRINGS.en.notfound], ["", VC_STRINGS.en.empty]]) {
      A.setInput(bad);
      check(`invalid '${bad.slice(0, 12)}' -> ${frag}`, $("status").textContent.includes(frag) && $("btn-png").disabled, $("status").textContent);
    }
    step("3 every language: tabs, buttons, title"); // 3 every language: tabs, buttons, title
    for (const lang of Object.keys(VC_LANGUAGES)) {
      sel.value = lang; sel.dispatchEvent(new W.Event("change"));
      eq(`${lang} barcode tab`, $("tab-main").textContent, VC_STRINGS[lang].tab_main);
      eq(`${lang} save png`, $("btn-png").textContent, VC_STRINGS[lang].save_png);
      eq(`${lang} title`, D.title, VC_STRINGS[lang].title);
      eq(`${lang} list tab`, $("tab-list").textContent, VC_STRINGS[lang].tab_list.replace("{n}", "0"));
    }
    sel.value = "en"; sel.dispatchEvent(new W.Event("change"));
    step("4 Create tab: live build, check digit, RF, field errors"); // 4 Create tab: live build, check digit, RF, field errors
    $("tab-create").click();
    const set = (k, v) => { $("f-" + k).value = v; $("f-" + k).dispatchEvent(new W.Event("input")); };
    set("iban", "FI79 4405 2020 0360 82"); set("amount", "4883,15"); set("reference", "86851625961989"); set("due", "12.06.2010");
    check("missing check digit is flagged", $("h-reference").className.includes("bad"));
    $("btn-check").click();
    eq("check digit added -> official invoice 1", $("f-result").value, c0);
    $("btn-rf").click();
    eq("converted to RF -> official v5 invoice 1", $("f-result").value, c9);
    set("iban", "FI79 4405 2020 0360 83");
    eq("bad IBAN message", $("h-iban").textContent, VC_STRINGS.en.err_iban);
    check("no code while a field is wrong", $("f-result").value === "" && $("btn-fshow").disabled);
    set("iban", "FI7944052020036082");
    $("btn-fshow").click();
    check("Show barcode -> Barcode tab", !$("panel-main").hidden && A.state.vb && A.state.vb.raw === c9);
    check("source is Create", $("status").textContent.includes(VC_STRINGS.en.tab_create));
    step("5 list: import CSV (one bad row reported), duplicates skipped"); // 5 list: import CSV (one bad row reported), duplicates skipped
    const csvBytes = Uint8Array.from(atob(V.batch[0].bytes_b64), (c) => c.charCodeAt(0));
    await A.importCsv(new W.File([csvBytes], "english.csv", { type: "text/csv" }));
    eq("imported rows", A.state.records.map((r) => r.source), ["A-1", "A-2"]);
    check("bad rows listed with line numbers", $("notice-text").textContent.includes("line 5 (amount)"), $("notice-text").textContent);
    $("dlg-notice").close();
    await A.importCsv(new W.File([csvBytes], "english.csv", { type: "text/csv" }));
    eq("no duplicates", A.state.records.length, 2);
    $("dlg-notice").close();
    eq("list tab count", $("tab-list").textContent, "List (2)");
    step("6 files through the page: a Python-made rotated JPEG"); // 6 files through the page: a Python-made rotated JPEG
    const jpg = await (await fetch("fixtures/py_rot90.jpg")).blob();
    await A.readFiles([new W.File([jpg], "photo.jpg", { type: "image/jpeg" })]);
    check("photo read, shown with its source", A.state.vb && A.state.vb.raw === c0 && $("status").textContent.includes("photo.jpg"), $("status").textContent);
    step("7 pasting text anywhere on the page"); // 7 pasting text anywhere on the page
    const dt = new W.DataTransfer(); dt.setData("text/plain", "Pay " + c9);
    D.body.dispatchEvent(new W.ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
    check("paste on the page fills the input", A.state.vb && A.state.vb.raw === c9);
    step("8 camera: a synthetic video stream of a rendered barcode stands in for the camera"); // 8 camera: a synthetic video stream of a rendered barcode stands in for the camera
    const cam = VCRender.canvas(V.valid[100].code, false, 300);
    const stage = D.createElement("canvas"); stage.width = 1280; stage.height = 720;
    const sctx = stage.getContext("2d");
    const paint = () => { sctx.fillStyle = "#fff"; sctx.fillRect(0, 0, 1280, 720); sctx.drawImage(cam, 50, 300, 1180, 1180 * cam.height / cam.width); };
    paint();
    const painter = setInterval(paint, 100);
    W.navigator.mediaDevices.getUserMedia = async () => stage.captureStream(10);
    $("btn-camera").click();
    const got = await until(() => A.state.vb && A.state.vb.raw === V.valid[100].code, 20000);
    clearInterval(painter);
    check("camera scan finds the code", got, A.state.vb && A.state.vb.raw);
    check("camera dialog closes", !$("dlg-camera").open);
    check("camera source in the list", A.state.records.some((r) => r.source === VC_STRINGS.en.camera_source));
    step("9 leaving with a non-empty list asks first (the list isn't saved anywhere)"); // 9 leaving with a non-empty list asks first (the list isn't saved anywhere)
    const ev = new W.Event("beforeunload", { cancelable: true });
    W.dispatchEvent(ev);
    check("leaving with a list asks first", ev.defaultPrevented);
    $("btn-clearlist").click();
    const ev2 = new W.Event("beforeunload", { cancelable: true });
    W.dispatchEvent(ev2);
    check("an empty list leaves quietly", !ev2.defaultPrevented);
    step("11 licence and contact come from project.ini; Help shows the third-party notices");
    await A.projectLoaded;
    const ini = await (await fetch("../project.ini")).text();
    const licName = /^name\s*=\s*(.+)$/m.exec(ini.split("[license]")[1])[1].trim();
    const contact = /^contact\s*=\s*(.+)$/m.exec(ini)[1].trim();
    check("footer shows the licence from project.ini", $("foot-license").textContent.includes(licName), $("foot-license").textContent);
    check("About lines from project.ini", A.aboutLines().some((x) => x.includes(contact)) && A.aboutLines().some((x) => x.includes(licName)));
    check("footer links from project.ini", $("link-source").href.startsWith("https://github.com/"));
    A.openHelp();
    check("Help lists the third-party notices", await until(() => $("help-notices").textContent.includes("zxing-wasm"), 5000));
    $("dlg-help").close();
    step("10 a code in the page address opens directly"); // 10 a code in the page address opens directly
    A.setInput("");
    W.location.hash = c0;                            // same page, new #code: no reload, hashchange
    check("#code change on an open page", await until(() => A.state.vb && A.state.vb.raw === c0, 5000));
    frame.src = "../index.html?fresh=1#" + c9;       // a fresh page load with a #code
    await new Promise((res) => frame.addEventListener("load", res, { once: true }));
    check("#code link", frame.contentWindow.vcode2barApp.state.vb && frame.contentWindow.vcode2barApp.state.vb.raw === c9);
    frame.remove();
  });

  const total = results.pass + results.fail;
  const summary = results.fail ? `FAIL - ${results.fail} of ${total} checks failed` : `ALL PASS - ${total} checks`;
  log(summary, results.fail ? "fail summary" : "pass summary");
  document.title = summary;
  document.body.dataset.done = results.fail ? "fail" : "pass";
  if (new URLSearchParams(location.search).has("report")) {
    await fetch("/__report", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary, ...results, userAgent: navigator.userAgent }) }).catch(() => {});
  }
})();
