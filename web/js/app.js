/*
 * vcode2bar web - the page: Barcode / Create / List tabs, files, camera, clipboard, help, languages.
 * Behaviour follows the Python GUI (vcode2bar.py, class App) wherever a browser allows it.
 *
 * License: PolyForm Noncommercial 1.0.0 - see LICENSE.
 * Required Notice: Copyright (c) 2026 Elie Koivunen (https://github.com/Elie-Koivunen/vcode2bar)
 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const S = window.VC_STRINGS, VERSION = window.VC_VERSION;
  const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  // ------------------------------------------------------------------ settings (this browser only)
  const store = {
    get(k, d) { try { const v = localStorage.getItem("vcode2bar." + k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("vcode2bar." + k, v); } catch (e) { /* private mode etc. */ } },
  };
  function initialLanguage() {
    const saved = store.get("lang", "");
    if (S[saved]) return saved;
    for (const l of navigator.languages || [navigator.language || "en"]) {
      const p = String(l).toLowerCase().slice(0, 2);
      if (p === "fi" || p === "sv") return p;
      if (p === "nb" || p === "nn" || p === "no") return "nb";
      if (p === "en") return "en";
    }
    return "en";
  }

  const state = {
    lang: initialLanguage(),
    vb: null,                 // the valid code on the Barcode tab
    loadedFrom: new Map(),    // raw code -> where it was read from
    records: [],              // [{vb, source}] for the List tab
    selected: new Set(),
    formCode: null,
    csvFmt: store.get("csv_fmt", "excel") === "std" ? "std" : "excel",
    verifyToken: 0,
  };

  const t = (k) => (S[state.lang] && S[state.lang][k] !== undefined ? S[state.lang][k] : S.en[k]);
  const fmt = (k, vars) => String(t(k)).replace(/\{(\w+)\}/g, (_, n) => (vars && n in vars ? vars[n] : `{${n}}`));
  const accel = (k) => (IS_MAC ? k.replace("Ctrl", "Cmd") : k);

  // ------------------------------------------------------------------ small helpers
  function setStatus(el, text, cls) { el.textContent = text; el.className = "status " + (cls || ""); }
  function message(text, el) { (el || $("msg")).textContent = text; }
  function notice(title, text) {
    $("notice-title").textContent = title;
    $("notice-text").textContent = text;
    if (!$("dlg-notice").open) $("dlg-notice").showModal();
  }
  function download(data, name, type) {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  async function copyText(text, el) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand && document.execCommand("copy");
      ta.remove();
      if (!ok) { message(t("copy_failed"), el); return; }
    }
    message(fmt("copied", { w: text }), el);
  }
  const defaultName = (vb) =>
    `viivakoodi_${vb.reference.replace(/\W/g, "").slice(0, 24)}_${vb.due || "no-due"}`;
  const refText = (vb) => (/^[A-Za-z0-9]+$/.test(vb.reference) ? VC.fmtRef(vb.reference) : t("rf_nonnum"));
  const amountText = (vb) => VC.fmtAmount(vb.cents, t("amount_open"));

  // ------------------------------------------------------------------ language
  function applyLang() {
    document.documentElement.lang = state.lang === "nb" ? "nb" : state.lang;
    document.title = t("title");
    for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
    $("lang").value = state.lang;
    const fmtSel = $("csv-fmt");
    fmtSel.options[0].textContent = t("fmt_excel");
    fmtSel.options[1].textContent = t("fmt_std");
    fmtSel.value = state.csvFmt;
    $("foot-version").textContent = fmt("web_version", { v: VERSION });
    $("f-due").placeholder = t("h_due").split(",")[0];
    refreshList();
    update();
    formChanged();
    if ($("dlg-help").open) fillHelp();
  }

  // ------------------------------------------------------------------ tabs
  const TABS = { main: ["tab-main", "panel-main"], create: ["tab-create", "panel-create"], list: ["tab-list", "panel-list"] };
  function showTab(name) {
    for (const [k, [tab, panel]] of Object.entries(TABS)) {
      $(tab).setAttribute("aria-selected", String(k === name));
      $(panel).hidden = k !== name;
    }
    if (name === "create") $("f-iban").focus();
  }

  // ------------------------------------------------------------------ Barcode tab
  function update() {
    const raw = $("input").value;
    const digits = raw.replace(/[\s-]/g, "");
    const nDigits = raw.replace(/\D/g, "").length;
    $("count").textContent = fmt("digits", { n: nDigits });
    state.vb = null;
    if (!raw.trim()) {
      setStatus($("status"), t("empty"), "idle");
    } else {
      const code = /^\d+$/.test(digits) && digits.length === 54 ? digits : VC.extractCode(raw);
      try {
        state.vb = VC.parse(code || digits);
        let s = t("ok");
        if (state.loadedFrom.has(state.vb.raw)) s += fmt("from_src", { s: state.loadedFrom.get(state.vb.raw) });
        setStatus($("status"), s, "ok");
      } catch (e) {
        if (!(e instanceof VC.VCError)) throw e;
        setStatus($("status"), /^\d+$/.test(digits) ? "✗ " + e.message : t("notfound"), "bad");
      }
    }
    if (state.vb && nDigits !== 54) $("count").textContent = t("found");
    fillDetails();
    renderPreview();
    for (const id of ["btn-png", "btn-svg", "btn-pdf", "btn-print", "btn-add", "btn-csv1"]) $(id).disabled = !state.vb;
  }

  function fillDetails() {
    const dl = $("details");
    dl.textContent = "";
    const vb = state.vb;
    if (!vb) return;
    const rows = [
      ["version", `${vb.version} (${vb.version === 5 ? "RF" : "FI"})`, null],
      ["account", VC.fmtIban(vb.iban), vb.iban, true],
      ["amount", amountText(vb), `${Math.floor(vb.cents / 100)},${String(vb.cents % 100).padStart(2, "0")}`],
      ["reference", refText(vb), vb.reference, true],
      ["due", null, null],
      ["code", vb.raw, vb.raw, true],
    ];
    for (const [key, value, copy, mono] of rows) {
      const dt = document.createElement("dt");
      dt.textContent = t(key) + ":";
      const dd = document.createElement("dd");
      if (mono) dd.className = "mono";
      if (key === "due") {
        if (vb.due) {
          const d = VC.daysOverdue(vb.due);
          dd.textContent = VC.fmtDue(vb.due) + (d > 0 ? fmt("overdue", { d }) : d === 0 ? t("today") : "");
          if (d >= 0) dd.className = "warn";
        } else dd.textContent = t("none");
      } else dd.textContent = value;
      dl.append(dt, dd);
      if (copy !== null) {
        const b = document.createElement("button");
        b.type = "button"; b.className = "small copy"; b.textContent = t("copy");
        b.addEventListener("click", () => copyText(copy));
        dl.append(b);
      } else {
        const sp = document.createElement("span");
        sp.className = "nocopy";
        dl.append(sp);
      }
    }
  }

  function renderPreview() {
    const fig = $("preview"), verify = $("verify");
    const token = ++state.verifyToken;
    if (!state.vb) { fig.innerHTML = ""; verify.textContent = ""; return; }
    const code = state.vb.raw, withText = $("show-text").checked;
    try {
      fig.innerHTML = VCRender.svg(code, withText).replace(/^<\?xml[^>]*>\s*/, "");
    } catch (e) {
      fig.innerHTML = "";
      verify.textContent = fmt("render_err", { e: `${e.name}: ${e.message}` });
      verify.className = "verify bad";
      return;
    }
    verify.textContent = t("verify_running");
    verify.className = "verify muted";
    setTimeout(async () => {                             // after the page has painted
      if (token !== state.verifyToken) return;
      try {
        const ok = await VCReader.verifyCanvas(VCRender.canvas(code, withText, 600), code);
        if (token !== state.verifyToken) return;
        verify.textContent = ok ? t("verify_ok") : t("verify_fail");
        verify.className = "verify " + (ok ? "ok" : "bad");
      } catch (e) {
        if (token !== state.verifyToken) return;
        verify.textContent = fmt("verify_unavailable", { e: e.message || e });
        verify.className = "verify warn";
      }
    }, 30);
  }

  function setInput(s) {
    $("input").value = s;
    update();
  }

  async function savePng() {
    if (!state.vb) { message(t("nothing")); return; }
    const bytes = await VCRender.png(state.vb.raw, $("show-text").checked);
    download(new Blob([bytes], { type: "image/png" }), defaultName(state.vb) + ".png");
    message(fmt("saved", { p: defaultName(state.vb) + ".png" }));
  }
  function saveSvg() {
    if (!state.vb) { message(t("nothing")); return; }
    download(VCRender.svg(state.vb.raw, $("show-text").checked), defaultName(state.vb) + ".svg", "image/svg+xml");
    message(fmt("saved", { p: defaultName(state.vb) + ".svg" }));
  }
  function pdfBytes(vb) {
    return VCRender.pdf(vb.raw,
      { head: t("pdf_head"), account: t("account"), amount: t("amount"), reference: t("reference"), due: t("due"), note: t("pdf_note") },
      { account: VC.fmtIban(vb.iban), amount: amountText(vb), reference: refText(vb), due: vb.due ? VC.fmtDue(vb.due) : t("none") });
  }
  function savePdf() {
    if (!state.vb) { message(t("nothing")); return; }
    download(new Blob([pdfBytes(state.vb)], { type: "application/pdf" }), defaultName(state.vb) + ".pdf");
    message(fmt("saved", { p: defaultName(state.vb) + ".pdf" }));
  }
  /** Like the Python version: open the A4 PDF in the browser's PDF viewer, and print from there. */
  function printPdf() {
    if (!state.vb) return;
    const url = URL.createObjectURL(new Blob([pdfBytes(state.vb)], { type: "application/pdf" }));
    const w = window.open(url, "_blank");
    if (!w) message(t("print_blocked"));
    setTimeout(() => URL.revokeObjectURL(url), 120000);
  }

  // ------------------------------------------------------------------ reading files, clipboard, camera
  function handleResults(results) {
    let first = null;
    for (const r of results) {
      for (const vb of r.codes) {
        state.loadedFrom.set(vb.raw, r.source);
        addRecord(vb, r.source, true);
        first = first || vb;
      }
    }
    if (first) setInput(first.raw);
    const summary = (r) => r.error ? `${r.source}: ${r.error}`
      : `${r.source}: ${r.codes.length} code(s)` + (r.rejected.length ? `, ${r.rejected.length} other barcode(s) ignored` : "");
    const lines = results.map(summary);
    message(lines.join(" | "));
    if (!first || results.some((r) => r.error)) {
      const detail = [];
      for (const r of results) detail.push(summary(r), ...r.rejected.slice(0, 3).map((x) => "   ignored: " + x));
      notice(t("read_title"), detail.join("\n"));
    }
    return results;
  }

  async function readFiles(files) {
    files = [...files];
    const csv = files.filter((f) => /\.(csv|txt)$/i.test(f.name) || f.type === "text/csv");
    const media = files.filter((f) => !csv.includes(f) && (/^image\//.test(f.type) || /\.pdf$/i.test(f.name) ||
      f.type === "application/pdf" || /\.(png|jpe?g|bmp|gif|tiff?|webp|heic|avif)$/i.test(f.name)));
    const other = files.filter((f) => !csv.includes(f) && !media.includes(f));
    for (const f of csv) await importCsv(f);
    if (other.length) notice(t("read_title"), other.map((f) => fmt("file_unsupported", { f: f.name })).join("\n"));
    if (!media.length) return [];
    showTab("main");
    const results = [];
    document.body.style.cursor = "progress";
    try {
      for (const f of media) {
        message(fmt("reading", { f: f.name }));
        results.push(await VCReader.readFile(f, f.name));
      }
    } catch (e) {
      notice(t("read_title"), fmt("reader_err", { e: e.message || e }));
      return [];
    } finally {
      document.body.style.cursor = "";
    }
    return handleResults(results);
  }

  async function pasteText() {
    try {
      setInput(await navigator.clipboard.readText());
    } catch (e) {
      message(t("clip_denied"));
      $("input").focus();
    }
  }

  async function pasteImage() {
    try {
      const items = await navigator.clipboard.read();
      for (const it of items) {
        const type = it.types.find((x) => x.startsWith("image/"));
        if (type) {
          const blob = await it.getType(type);
          return readFiles([new File([blob], "clipboard", { type })]);
        }
      }
      message(t("no_img"));
    } catch (e) {
      message(t("clip_denied"));
    }
    return null;
  }

  let cameraAbort = null;
  async function openCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      notice(t("camera_title"), fmt("camera_err", { e: "this browser has no camera access (it needs https)" }));
      return;
    }
    const dlg = $("dlg-camera");
    cameraAbort = new AbortController();
    dlg.showModal();
    try {
      const vb = await VCReader.scanCamera($("video"), cameraAbort.signal);
      if (dlg.open) dlg.close();
      if (vb) {
        const src = t("camera_source");
        state.loadedFrom.set(vb.raw, src);
        addRecord(vb, src, true);
        showTab("main");
        setInput(vb.raw);
        message(t("camera_found"));
      }
    } catch (e) {
      if (dlg.open) dlg.close();
      notice(t("camera_title"), fmt("camera_err", { e: e.message || e.name || e }));
    }
  }

  // ------------------------------------------------------------------ List tab
  function addRecord(vb, source, quiet) {
    if (state.records.some((r) => r.vb.raw === vb.raw)) {
      if (!quiet) message(t("dup"));
      return false;
    }
    state.records.push({ vb, source });
    refreshList();
    if (!quiet) message(fmt("added", { n: state.records.length }));
    return true;
  }

  function refreshList() {
    $("tab-list").textContent = fmt("tab_list", { n: state.records.length });
    const tb = $("table").tBodies[0];
    tb.textContent = "";
    state.records.forEach(({ vb, source }, i) => {
      const tr = document.createElement("tr");
      if (state.selected.has(i)) tr.className = "selected";
      const cells = [
        ["sel", null], ["", source], ["iban", VC.fmtIban(vb.iban)], ["num", amountText(vb)],
        ["ref", refText(vb)], ["", vb.due ? VC.fmtDue(vb.due) : ""], ["code", vb.raw],
      ];
      for (const [cls, text] of cells) {
        const td = document.createElement("td");
        if (cls) td.className = cls;
        if (cls === "sel") {
          const cb = document.createElement("input");
          cb.type = "checkbox"; cb.checked = state.selected.has(i);
          cb.setAttribute("aria-label", vb.raw);
          cb.addEventListener("change", () => { cb.checked ? state.selected.add(i) : state.selected.delete(i); refreshList(); });
          td.appendChild(cb);
        } else td.textContent = text;
        tr.appendChild(td);
      }
      tr.addEventListener("dblclick", () => { state.selected = new Set([i]); listToEditor(); });
      tb.appendChild(tr);
    });
    $("list-empty").hidden = state.records.length > 0;
    $("sel-all").checked = state.records.length > 0 && state.selected.size === state.records.length;
    for (const id of ["btn-edit", "btn-remove"]) $(id).disabled = state.selected.size === 0;
    $("btn-clearlist").disabled = $("btn-export").disabled = state.records.length === 0;
  }

  function listToEditor() {
    const i = [...state.selected].sort((a, b) => a - b)[0];
    if (i === undefined) return;
    showTab("main");
    setInput(state.records[i].vb.raw);
  }

  function exportCsv(rows, name) {
    if (!rows.length) { message(t("list_empty"), $("lmsg")); return null; }
    const excel = state.csvFmt === "excel";
    const text = VC.writeCsv(rows.map(({ vb, source }) => VC.toRecord(vb, source)), excel);
    download(new Blob([(excel ? "﻿" : "") + text], { type: "text/csv;charset=utf-8" }), name + ".csv");
    const m = fmt("exported", { n: rows.length, p: name + ".csv" });
    message(m, $("lmsg")); message(m);
    return text;
  }

  async function importCsv(file) {
    showTab("list");
    let rows;
    try {
      rows = VC.readBatchCsv(new Uint8Array(await file.arrayBuffer()), file.name);
    } catch (e) {
      notice(t("read_title"), `${file.name}: ${e.message}`);
      return [];
    }
    let added = 0;
    for (const r of rows) if (r.vb && addRecord(r.vb, r.source, true)) added++;
    const bad = rows.filter((r) => r.error);
    const m = fmt("imported", { n: added, f: file.name });
    message(m, $("lmsg"));
    if (bad.length) {
      const lines = [m, "", fmt("import_skipped", { n: bad.length }),
        ...bad.slice(0, 12).map((r) => `  ${t("line")} ${r.line} (${r.field}): ${r.error}`)];
      if (bad.length > 12) lines.push(`  … +${bad.length - 12}`);
      notice(t("read_title"), lines.join("\n"));
    }
    return rows;
  }

  // ------------------------------------------------------------------ Create tab
  const FORM = ["iban", "amount", "reference", "due"];
  const CHECKS = { iban: VC.normalizeIban, amount: VC.parseAmount, reference: VC.normalizeReference, due: VC.parseDue };
  const HINTS = { iban: null, amount: "h_amount", reference: "h_ref", due: "h_due" };
  const fv = (k) => $("f-" + k).value.trim();

  function formChanged() {
    const errors = {};
    for (const k of FORM) {
      if (!fv(k)) continue;
      try { CHECKS[k](fv(k)); } catch (e) { if (e instanceof VC.VCError) errors[k] = t("err_" + k); else throw e; }
    }
    for (const k of FORM) {
      const h = $("h-" + k);
      h.textContent = errors[k] || (HINTS[k] ? t(HINTS[k]) : "");
      h.className = "hint" + (errors[k] ? " bad" : "");
      $("f-" + k).setAttribute("aria-invalid", String(!!errors[k]));
    }
    state.formCode = null;
    const st = $("fstatus");
    if (Object.keys(errors).length) setStatus(st, "✗ " + Object.values(errors)[0], "bad");
    else if (!(fv("iban") && fv("reference"))) setStatus(st, t("form_wait"), "idle");
    else {
      try {
        state.formCode = VC.buildCode(fv("iban"), fv("amount"), fv("reference"), fv("due"));
        setStatus(st, t("form_ok"), "ok");
      } catch (e) {
        setStatus(st, "✗ " + e.message, "bad");
      }
    }
    $("f-result").value = state.formCode || "";
    $("fpreview").innerHTML = state.formCode ? VCRender.svg(state.formCode, false).replace(/^<\?xml[^>]*>\s*/, "") : "";
    for (const id of ["btn-fcopy", "btn-fshow", "btn-fadd"]) $(id).disabled = !state.formCode;
  }

  function formAddCheck() {
    try {
      $("f-reference").value = VC.fiReference($("f-reference").value);
      formChanged();
    } catch (e) {
      setStatus($("fstatus"), "✗ " + t("err_base"), "bad");
    }
  }
  function formToRf() {
    try {
      const norm = VC.normalizeReference($("f-reference").value);
      if (!norm.startsWith("RF")) {
        const rf = VC.rfReference(norm);
        $("f-reference").value = rf.match(/.{1,4}/g).join(" ");
      }
      formChanged();
    } catch (e) {
      setStatus($("fstatus"), "✗ " + t("err_reference"), "bad");
    }
  }

  // ------------------------------------------------------------------ help
  function fillHelp() {
    const guide = $("help-guide");
    guide.textContent = "";
    for (const para of String(t("web_guide_text")).split("\n\n")) {
      const p = document.createElement("p"); p.textContent = para; guide.appendChild(p);
    }
    const table = (el, rows) => {
      el.textContent = "";
      for (const [a, b] of rows) {
        const tr = el.insertRow();
        tr.insertCell().textContent = a;
        tr.insertCell().textContent = b;
      }
    };
    table($("help-keys"), t("web_shortcut_rows").map(([k, v]) => [accel(k), v]));
    table($("help-format"), t("format_rows"));
    $("help-format-note").textContent = t("format_note");
    const ex = "460143230002086030000500000000000000000000040905260908";
    $("help-format-example").textContent =
      `${ex[0]} ${ex.slice(1, 17)} ${ex.slice(17, 23)} ${ex.slice(23, 25)} ${ex.slice(25, 28)} ${ex.slice(28, 48)} ${ex.slice(48)}`;
    const about = $("help-about");
    about.textContent = "";
    for (const line of [fmt("web_version", { v: VERSION }), ...String(t("about_text")).split("\n").filter(Boolean),
                        t("privacy"), t("third_party")]) {
      const p = document.createElement("p"); p.textContent = line; about.appendChild(p);
    }
    const p = document.createElement("p");
    const a = document.createElement("a");
    a.href = "https://github.com/Elie-Koivunen/vcode2bar"; a.rel = "noopener"; a.textContent = "github.com/Elie-Koivunen/vcode2bar";
    p.append(t("source_code") + ": ", a);
    about.appendChild(p);
  }
  function openHelp() { fillHelp(); if (!$("dlg-help").open) $("dlg-help").showModal(); }

  // ------------------------------------------------------------------ wiring
  function init() {
    const langSel = $("lang");
    for (const [code, name] of Object.entries(window.VC_LANGUAGES)) langSel.add(new Option(name, code));
    langSel.addEventListener("change", () => { state.lang = langSel.value; store.set("lang", state.lang); applyLang(); });
    $("btn-help").addEventListener("click", openHelp);

    for (const name of Object.keys(TABS)) $(TABS[name][0]).addEventListener("click", () => showTab(name));
    document.querySelector(".tabs").addEventListener("keydown", (e) => {   // arrow keys between tabs
      const order = Object.keys(TABS), cur = order.findIndex((n) => $(TABS[n][0]).getAttribute("aria-selected") === "true");
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (d) { const n = order[(cur + d + order.length) % order.length]; showTab(n); $(TABS[n][0]).focus(); }
    });

    let timer = null;
    $("input").addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(update, 150); });
    $("show-text").addEventListener("change", renderPreview);
    $("btn-paste").addEventListener("click", pasteText);
    $("btn-open").addEventListener("click", () => $("file").click());
    $("file").addEventListener("change", async (e) => { const f = [...e.target.files]; e.target.value = ""; await readFiles(f); });
    $("btn-paste-img").addEventListener("click", pasteImage);
    $("btn-camera").addEventListener("click", openCamera);
    $("dlg-camera").addEventListener("close", () => { if (cameraAbort) cameraAbort.abort(); });
    $("btn-clear").addEventListener("click", () => { setInput(""); $("input").focus(); });
    $("btn-png").addEventListener("click", savePng);
    $("btn-svg").addEventListener("click", saveSvg);
    $("btn-pdf").addEventListener("click", savePdf);
    $("btn-print").addEventListener("click", printPdf);
    $("btn-add").addEventListener("click", () => state.vb && addRecord(state.vb, state.loadedFrom.get(state.vb.raw) || t("manual")));
    $("btn-csv1").addEventListener("click", () => state.vb &&
      exportCsv([{ vb: state.vb, source: state.loadedFrom.get(state.vb.raw) || t("manual") }], defaultName(state.vb)));

    for (const k of FORM) $("f-" + k).addEventListener("input", formChanged);
    $("btn-check").addEventListener("click", formAddCheck);
    $("btn-rf").addEventListener("click", formToRf);
    $("btn-fcopy").addEventListener("click", () => state.formCode && copyText(state.formCode, $("fstatus")));
    $("btn-fshow").addEventListener("click", () => {
      if (!state.formCode) return;
      state.loadedFrom.set(state.formCode, t("tab_create"));
      showTab("main");
      setInput(state.formCode);
    });
    $("btn-fadd").addEventListener("click", () => state.formCode && addRecord(VC.parse(state.formCode), t("tab_create")));
    $("btn-fclear").addEventListener("click", () => { for (const k of FORM) $("f-" + k).value = ""; formChanged(); $("f-iban").focus(); });

    $("sel-all").addEventListener("change", (e) => {
      state.selected = e.target.checked ? new Set(state.records.map((_, i) => i)) : new Set();
      refreshList();
    });
    $("btn-edit").addEventListener("click", listToEditor);
    $("btn-remove").addEventListener("click", () => {
      state.records = state.records.filter((_, i) => !state.selected.has(i));
      state.selected.clear(); refreshList();
    });
    $("btn-clearlist").addEventListener("click", () => { state.records = []; state.selected.clear(); refreshList(); });
    $("csv-fmt").addEventListener("change", (e) => { state.csvFmt = e.target.value; store.set("csv_fmt", state.csvFmt); });
    $("btn-export").addEventListener("click", () => exportCsv(state.records, "viivakoodit"));
    $("btn-import").addEventListener("click", () => $("csvfile").click());
    $("csvfile").addEventListener("change", async (e) => { const f = e.target.files[0]; e.target.value = ""; if (f) await importCsv(f); });

    // paste anywhere: images are read, text goes into the input box (unless typing into another field)
    document.addEventListener("paste", (e) => {
      const dt = e.clipboardData;
      if (!dt) return;
      const files = [...dt.files].filter((f) => f.type.startsWith("image/") || f.type === "application/pdf");
      if (files.length) { e.preventDefault(); readFiles(files); return; }
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      const text = dt.getData("text");
      if (text) { e.preventDefault(); showTab("main"); setInput(text); }
    });

    // drag and drop anywhere
    let depth = 0;
    const hasFiles = (e) => e.dataTransfer && [...e.dataTransfer.types].includes("Files");
    document.addEventListener("dragenter", (e) => { if (hasFiles(e)) { depth++; $("drop").hidden = false; } });
    document.addEventListener("dragleave", (e) => { if (hasFiles(e) && --depth <= 0) { depth = 0; $("drop").hidden = true; } });
    document.addEventListener("dragover", (e) => { if (hasFiles(e)) e.preventDefault(); });
    document.addEventListener("drop", (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault(); depth = 0; $("drop").hidden = true;
      readFiles(e.dataTransfer.files);
    });

    // keyboard shortcuts (as far as browsers let a page use them)
    document.addEventListener("keydown", (e) => {
      const mod = IS_MAC ? e.metaKey : e.ctrlKey;
      const k = e.key.toLowerCase();
      if (e.key === "F1") { e.preventDefault(); openHelp(); return; }
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) { setInput(""); return; }
      if (!mod || e.altKey) return;
      if (k === "o") { e.preventDefault(); $("file").click(); }
      else if (k === "s" && e.shiftKey) { e.preventDefault(); saveSvg(); }
      else if (k === "s") { e.preventDefault(); savePng(); }
      else if (k === "p") { e.preventDefault(); printPdf(); }
    });

    window.addEventListener("beforeunload", (e) => {
      if (state.records.length) { e.preventDefault(); e.returnValue = t("unsaved_list"); }
    });

    // a code in the address (…/web/#460143…) opens straight away, also when changed later
    const fromHash = () => {
      const hash = decodeURIComponent(location.hash.slice(1));
      if (hash && VC.extractCode(hash)) { showTab("main"); setInput(hash); }
    };
    window.addEventListener("hashchange", fromHash);
    applyLang();
    fromHash();
    showTab("main");
    $("input").focus();
    window.vcode2barApp = { state, setInput, update, readFiles, importCsv, addRecord, showTab, formChanged, exportCsv, pdfBytes };
  }

  init();
})();
