/*
 * vcode2bar web - core logic (no DOM): parse / validate / build virtual barcodes, Code 128 set C,
 * finding codes in text, CSV export and batch-CSV import.
 *
 * A line-by-line port of the Python version (vcode2bar.py), including its error messages; the test
 * page (web/tests/) checks it against vectors produced by the Python code itself.
 * Amounts are integer cents throughout, never floating point.
 *
 * License: PolyForm Noncommercial 1.0.0 - see LICENSE.
 * Required Notice: Copyright (c) 2026 Elie Koivunen (https://github.com/Elie-Koivunen/vcode2bar)
 */
(function (root) {
  "use strict";

  class VCError extends Error {
    /** field: "code" for a whole-code error, else iban / amount / reference / due */
    constructor(message, field) {
      super(message);
      this.name = "VCError";
      this.field = field || "code";
    }
  }

  // ------------------------------------------------------------------ checksums
  /** "FI79..." -> digits for mod 97 (A=10 ... Z=35), as Python's int(c, 36). */
  function toNumeric(s) {
    let out = "";
    for (const c of s) out += /\d/.test(c) ? c : String(parseInt(c, 36));
    return out;
  }

  function mod97(digits) {
    let r = 0;
    for (let i = 0; i < digits.length; i += 7) r = Number(String(r) + digits.slice(i, i + 7)) % 97;
    return r;
  }

  function ibanOk(iban) {
    return mod97(toNumeric(iban.slice(4) + iban.slice(0, 4))) === 1;
  }

  /** Finnish reference check digit, weights 7-3-1 from the right. */
  function fiCheckDigit(base) {
    const w = [7, 3, 1];
    let s = 0;
    const rev = [...base].reverse();
    rev.forEach((d, i) => { s += Number(d) * w[i % 3]; });
    return (10 - (s % 10)) % 10;
  }

  function rfOk(rf) {
    return mod97(toNumeric(rf.slice(4) + rf.slice(0, 4))) === 1;
  }

  // ------------------------------------------------------------------ dates
  function isValidDate(y, m, d) {
    if (m < 1 || m > 12 || d < 1) return false;
    const dim = [31, (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return d <= dim[m - 1];
  }

  const pad = (n, w) => String(n).padStart(w, "0");
  const isoDate = (y, m, d) => `${pad(y, 4)}-${pad(m, 2)}-${pad(d, 2)}`;

  // ------------------------------------------------------------------ parse
  const RF_NON_NUMERIC = "(RF-viite ei numeerinen - katso lasku)";

  /** Validate and decode a 54-digit virtual barcode. Throws VCError. */
  function parse(code) {
    const s = String(code).replace(/[\s-]/g, "");
    if (!/^\d+$/.test(s)) throw new VCError("Code must contain digits only.");
    if (s.length !== 54) throw new VCError(`Code must be 54 digits, got ${s.length}.`);
    const version = Number(s[0]);
    if (version !== 4 && version !== 5) {
      throw new VCError(`Unsupported version ${version} (only 4 and 5 are valid).`);
    }
    const iban = "FI" + s.slice(1, 17);
    if (!ibanOk(iban)) throw new VCError(`IBAN checksum failed: ${iban}`);
    const cents = Number(s.slice(17, 23)) * 100 + Number(s.slice(23, 25));
    let reference;
    if (version === 4) {
      if (s.slice(25, 28) !== "000") throw new VCError("Reserved field (pos 26-28) must be 000 in version 4.");
      const ref = s.slice(28, 48).replace(/^0+/, "");
      if (!(ref.length >= 4 && ref.length <= 20)) throw new VCError("Reference must be 4-20 digits.");
      if (fiCheckDigit(ref.slice(0, -1)) !== Number(ref.slice(-1))) {
        throw new VCError(`Reference check digit failed: ${ref}`);
      }
      reference = ref;
    } else {
      const check = s.slice(25, 27);
      const body = s.slice(27, 48).replace(/^0+/, "");
      if (check === "00" && !body) {
        reference = RF_NON_NUMERIC;    // spec: zeros when the RF reference contains letters
      } else {
        if (!body) throw new VCError("RF reference body is empty.");
        reference = `RF${check}${body}`;
        if (!rfOk(reference)) throw new VCError(`RF reference checksum failed: ${reference}`);
      }
    }
    const d = s.slice(48, 54);
    let due = null;
    if (d !== "000000") {
      const y = 2000 + Number(d.slice(0, 2)), m = Number(d.slice(2, 4)), dd = Number(d.slice(4, 6));
      if (!isValidDate(y, m, dd)) throw new VCError(`Invalid due date field: ${d}`);
      due = isoDate(y, m, dd);
    }
    return { raw: s, version, iban, cents, reference, due };
  }

  // ------------------------------------------------------------------ building codes
  const MAX_CENTS = 99999999;

  /** "1 234,56" / "1234.56" / "12,5 €" / "" (open amount) -> integer cents. */
  function parseAmount(text) {
    let s = typeof text === "number" ? String(text)
      : String(text == null ? "" : text).replace(/[\s €]|EUR/gi, "");
    if (s === "") return 0;
    if (s.includes(",") && s.includes(".")) {          // the last separator is the decimal one
      const decSep = s.lastIndexOf(",") > s.lastIndexOf(".") ? "," : ".";
      s = s.split(decSep === "," ? "." : ",").join("");
    }
    s = s.split(",").join(".");
    const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(s);
    if (!m) throw new VCError(`Invalid amount: '${text}' (use e.g. 1234,56; max 2 decimals)`, "amount");
    const intPart = m[1].replace(/^0+(?=\d)/, "");
    if (intPart.length > 6) throw new VCError(`Amount ${s} exceeds the barcode maximum 999999.99`, "amount");
    const cents = Number(intPart) * 100 + Number((m[2] || "").padEnd(2, "0"));
    if (cents > MAX_CENTS) throw new VCError(`Amount ${s} exceeds the barcode maximum 999999.99`, "amount");
    return cents;
  }

  // strptime-compatible patterns (%d and %m take 1-2 digits, %Y 4, %y 2: 69-99 -> 19xx, 00-68 -> 20xx)
  const DUE_FORMATS = [
    [/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, (m) => [+m[3], +m[2], +m[1]]],
    [/^(\d{4})-(\d{1,2})-(\d{1,2})$/, (m) => [+m[1], +m[2], +m[3]]],
    [/^(\d{1,2})\.(\d{1,2})\.(\d{2})$/, (m) => [(+m[3] < 69 ? 2000 : 1900) + +m[3], +m[2], +m[1]]],
    [/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, (m) => [+m[3], +m[2], +m[1]]],
  ];

  /** '' -> null; dd.mm.yyyy, d.m.yyyy, yyyy-mm-dd, dd.mm.yy, dd/mm/yyyy -> "YYYY-MM-DD". */
  function parseDue(text) {
    const s = String(text == null ? "" : text).trim();
    if (!s) return null;
    let found = null;
    for (const [re, pick] of DUE_FORMATS) {
      const m = re.exec(s);
      if (!m) continue;
      const [y, mo, d] = pick(m);
      if (isValidDate(y, mo, d)) { found = [y, mo, d]; break; }
    }
    if (!found) throw new VCError(`Invalid due date: '${text}' (use dd.mm.yyyy)`, "due");
    if (found[0] < 2000 || found[0] > 2099) throw new VCError("Due date must be between 2000 and 2099", "due");
    return isoDate(...found);
  }

  /** Append the Finnish check digit (weights 7-3-1) to a 3-19 digit base. */
  function fiReference(base) {
    const b = String(base).replace(/\s/g, "").replace(/^0+/, "");
    if (!/^\d{3,19}$/.test(b)) throw new VCError("Reference base must be 3-19 digits", "reference");
    return b + String(fiCheckDigit(b));
  }

  /** ISO 11649 creditor reference: 'RF' + 2 check digits + body. */
  function rfReference(body) {
    const b = String(body).replace(/\s/g, "").toUpperCase();
    if (b.startsWith("RF")) throw new VCError("Already an RF reference", "reference");
    if (!/^[0-9A-Z]{1,21}$/.test(b)) throw new VCError("RF body must be 1-21 letters/digits", "reference");
    const chk = 98 - mod97(toNumeric(b + "RF00"));
    return `RF${pad(chk, 2)}${b}`;
  }

  function normalizeIban(iban) {
    const s = String(iban == null ? "" : iban).replace(/[\s-]/g, "").toUpperCase();
    if (!/^FI\d{16}$/.test(s)) {
      throw new VCError("Account must be a Finnish IBAN: FI + 16 digits " +
                        "(bank barcodes only exist for Finnish accounts)", "iban");
    }
    if (!ibanOk(s)) throw new VCError(`IBAN checksum failed: ${s}`, "iban");
    return s;
  }

  function normalizeReference(ref) {
    let s = String(ref == null ? "" : ref).replace(/[\s-]/g, "").toUpperCase();
    if (!s) throw new VCError("Reference is required", "reference");
    if (s.startsWith("RF")) {
      const body = s.slice(4).replace(/^0+/, "") || "0";
      if (!/^RF\d\d\d+$/.test(s)) throw new VCError("RF reference must be numeric to fit in a bank barcode", "reference");
      if (body.length > 21) throw new VCError("RF reference body is longer than 21 digits", "reference");
      if (!rfOk(s)) throw new VCError(`RF reference checksum failed: ${s}`, "reference");
      return `RF${s.slice(2, 4)}${body}`;
    }
    s = s.replace(/^0+/, "");
    if (!/^\d{4,20}$/.test(s)) {
      throw new VCError("Finnish reference must be 4-20 digits including the check digit", "reference");
    }
    if (fiCheckDigit(s.slice(0, -1)) !== Number(s.slice(-1))) {
      throw new VCError(`Reference check digit is wrong: ${s} (for base ${s.slice(0, -1)} it is ` +
                        `${fiCheckDigit(s.slice(0, -1))})`, "reference");
    }
    return s;
  }

  /** Payment details -> 54-digit code (v4 for Finnish, v5 for RF references). Throws VCError(field). */
  function buildCode(iban, amount, reference, due) {
    const ib = normalizeIban(iban);
    const cents = parseAmount(amount);
    const ref = normalizeReference(reference);
    const d = parseDue(due);
    const dd = d ? d.slice(2, 4) + d.slice(5, 7) + d.slice(8, 10) : "000000";
    const money = pad(Math.floor(cents / 100), 6) + pad(cents % 100, 2);
    const code = ref.startsWith("RF")
      ? `5${ib.slice(2)}${money}${ref.slice(2, 4)}${ref.slice(4).padStart(21, "0")}${dd}`
      : `4${ib.slice(2)}${money}000${ref.padStart(20, "0")}${dd}`;
    const vb = parse(code);                              // defensive round trip, as in Python
    if (vb.iban !== ib || vb.cents !== cents || vb.reference !== ref || vb.due !== d) {
      throw new Error("round-trip mismatch");
    }
    return code;
  }

  // ------------------------------------------------------------------ Code 128 set C
  /** Symbol values: START C (105), 27 digit pairs, checksum. */
  function code128Values(code) {
    const vals = [105];
    for (let i = 0; i < code.length; i += 2) vals.push(Number(code.slice(i, i + 2)));
    let sum = 105;
    for (let i = 1; i < vals.length; i++) sum += i * vals[i];
    vals.push(sum % 103);
    return vals;
  }

  /** The bar pattern: '1' = bar module, '0' = space module (332 modules for 54 digits). */
  function code128Modules(code) {
    if (!/^\d+$/.test(code) || code.length % 2) throw new VCError("Code 128 set C needs an even number of digits");
    const table = root.VC_CODE128;
    return code128Values(code).map((v) => table.codes[v]).join("") + table.stop;
  }

  /** Spec "Tarkiste 2": (105 + sum(weight_i * pair_i)) mod 103. */
  function code128Checksum(code) {
    const v = code128Values(code);
    return v[v.length - 1];
  }

  // ------------------------------------------------------------------ finding codes in text
  // Lookahead => overlapping matches: a stray digit before the code can't swallow it.
  const CODE_RE = /(?<!\d)(?=([45](?:[\s-]*\d){53})(?!\d))/g;

  /** Every valid code in free text (deduplicated, in order). */
  function iterCodes(text) {
    const seen = new Set(), out = [];
    for (const m of String(text).matchAll(CODE_RE)) {
      const cand = m[1].replace(/[\s-]/g, "");
      if (seen.has(cand)) continue;
      seen.add(cand);
      try { out.push(parse(cand)); } catch (e) { if (!(e instanceof VCError)) throw e; }
    }
    return out;
  }

  function extractCode(text) {
    const all = iterCodes(text);
    return all.length ? all[0].raw : null;
  }

  // ------------------------------------------------------------------ display formatting
  function fmtIban(iban) {
    return iban.match(/.{1,4}/g).join(" ");
  }

  /** "1 234,56 €"; 0 -> the 'open amount' text of the language. */
  function fmtAmount(cents, openText) {
    if (cents === 0) return openText;
    const euros = String(Math.floor(cents / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return `${euros},${pad(cents % 100, 2)} €`;
  }

  function fmtRef(reference) {
    if (reference.startsWith("RF")) return reference.match(/.{1,4}/g).join(" ");
    const out = [];
    let r = reference;
    while (r) { out.unshift(r.slice(-5)); r = r.slice(0, -5); }
    return out.join(" ");
  }

  const fmtDue = (iso) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "");

  /** Days past the due date (0 = due today, negative = not yet due), or null without a due date. */
  function daysOverdue(iso, today) {
    if (!iso) return null;
    const t = today || new Date();
    const a = Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
    const b = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate());
    return Math.round((b - a) / 86400000);
  }

  // ------------------------------------------------------------------ CSV export
  const CSV_FIELDS = ["source", "code", "version", "reference_type", "iban", "amount_eur",
                      "reference", "due_date", "days_overdue", "decoded_at"];

  function localIsoSeconds(d) {
    return `${isoDate(d.getFullYear(), d.getMonth() + 1, d.getDate())}T` +
           `${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}:${pad(d.getSeconds(), 2)}`;
  }

  /** Same fields as the Python version's CSV/JSON output. */
  function toRecord(vb, source, today, now) {
    const overdue = daysOverdue(vb.due, today);
    return {
      source: source || "",
      code: vb.raw,
      version: vb.version,
      reference_type: vb.version === 5 ? "RF" : "FI",
      iban: vb.iban,
      amount_eur: `${Math.floor(vb.cents / 100)}.${pad(vb.cents % 100, 2)}`,
      reference: vb.reference,
      due_date: vb.due || "",
      days_overdue: overdue === null ? "" : Math.max(overdue, 0),
      decoded_at: localIsoSeconds(now || new Date()),
    };
  }

  /** Neutralise spreadsheet formula injection (e.g. a file name starting with '='). */
  function csvSafe(v) {
    const s = String(v);
    return ["=", "+", "-", "@", "\t", "\r"].includes(s.slice(0, 1)) ? "'" + s : s;
  }

  /** Python csv.writer, QUOTE_MINIMAL, lineterminator \r\n. */
  function csvLine(values, delim) {
    return values.map((v) => {
      const s = String(v);
      return (s.includes(delim) || s.includes('"') || s.includes("\r") || s.includes("\n"))
        ? '"' + s.split('"').join('""') + '"' : s;
    }).join(delim) + "\r\n";
  }

  /** Records -> CSV text. excel: ';', decimal comma, codes as ="..." text (the caller adds the BOM). */
  function writeCsv(records, excel) {
    const delim = excel ? ";" : ",";
    let out = csvLine(CSV_FIELDS, delim);
    for (const r of records) {
      const row = CSV_FIELDS.map((k) => csvSafe(r[k] === undefined ? "" : r[k]));
      if (excel) {
        row[CSV_FIELDS.indexOf("amount_eur")] = row[CSV_FIELDS.indexOf("amount_eur")].split(".").join(",");
        row[CSV_FIELDS.indexOf("code")] = `="${r.code}"`;
      }
      out += csvLine(row, delim);
    }
    return out;
  }

  // ------------------------------------------------------------------ batch CSV import
  // Accepted header names, compared after folding case, accents and punctuation. First match wins.
  const BATCH_COLUMNS = {
    code: ["code", "virtualbarcode", "virtuaaliviivakoodi", "virtuellstreckkod", "virtuellstrekkode"],
    iban: ["iban", "account", "tili", "tilinumero", "konto", "kontonummer"],
    amount: ["amount", "amounteur", "sum", "summa", "belopp", "belop"],
    reference: ["reference", "ref", "viite", "viitenumero", "referens", "referanse"],
    due: ["due", "duedate", "erapaiva", "forfallodag", "forfallodatum", "forfallsdato"],
    source: ["source", "name", "label", "invoice", "nimi", "lasku", "namn", "faktura", "navn"],
  };

  /** The Python version's ascii_safe(): Nordic letters and € to ASCII. */
  function asciiSafe(s) {
    const map = { "€": "EUR", "ä": "a", "Ä": "A", "ö": "o", "Ö": "O", "å": "a", "Å": "A", "ø": "o", "Ø": "O",
                  "æ": "ae", "Æ": "AE", "–": "-", "⚠": "!" };
    return String(s).replace(/[€äÄöÖåÅøØæÆ–⚠]/g, (c) => map[c]);
  }

  const headerKey = (h) => asciiSafe(h.trim()).toLowerCase().replace(/[^a-z0-9]/g, "");

  /** Bytes -> text: UTF-8 (BOM stripped), else Windows-1252 (older Excel). */
  function decodeText(bytes) {
    try {
      return new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes);
    } catch (e) {
      return new TextDecoder("windows-1252").decode(bytes);
    }
  }

  /** Physical lines as io.StringIO(text, newline="") yields them (\r\n, \n or \r kept at the end). */
  function physicalLines(text) {
    return text.match(/[^\r\n]*(?:\r\n|\r|\n)|[^\r\n]+$/g) || [];
  }

  /** A port of CPython's csv.reader (excel dialect, non-strict). Yields {row, lineNum}. */
  function* csvReader(text, delim) {
    const lines = physicalLines(text);
    let li = 0, lineNum = 0;
    while (li < lines.length) {
      const fields = [];
      let field = "", state = "START_RECORD", started = false;
      const save = () => { fields.push(field); field = ""; };
      for (;;) {
        if (li >= lines.length) {                       // EOF inside a record
          if (field.length || state === "IN_QUOTED_FIELD") save();
          break;
        }
        const line = lines[li++];
        lineNum++;
        started = true;
        for (const c of line) {
          switch (state) {
            case "START_RECORD":
              if (c === "\n" || c === "\r") { state = "EAT_CRNL"; break; }
              state = "START_FIELD";
              // falls through
            case "START_FIELD":
              if (c === "\n" || c === "\r") { save(); state = "EAT_CRNL"; }
              else if (c === '"') state = "IN_QUOTED_FIELD";
              else if (c === delim) save();
              else { field += c; state = "IN_FIELD"; }
              break;
            case "IN_FIELD":
              if (c === "\n" || c === "\r") { save(); state = "EAT_CRNL"; }
              else if (c === delim) { save(); state = "START_FIELD"; }
              else field += c;
              break;
            case "IN_QUOTED_FIELD":
              if (c === '"') state = "QUOTE_IN_QUOTED_FIELD";
              else field += c;
              break;
            case "QUOTE_IN_QUOTED_FIELD":
              if (c === '"') { field += c; state = "IN_QUOTED_FIELD"; }
              else if (c === delim) { save(); state = "START_FIELD"; }
              else if (c === "\n" || c === "\r") { save(); state = "EAT_CRNL"; }
              else { field += c; state = "IN_FIELD"; }
              break;
            case "EAT_CRNL":
              break;
          }
        }
        // end of the physical line
        if (state === "IN_FIELD" || state === "START_FIELD" || state === "QUOTE_IN_QUOTED_FIELD") {
          save(); state = "START_RECORD";
        } else if (state === "EAT_CRNL") {
          state = "START_RECORD";
        }
        if (state === "START_RECORD") break;            // record complete
      }
      if (started) yield { row: fields, lineNum };
    }
  }

  /**
   * A batch CSV (one payment per row) -> [{line, source, vb, error, field}].
   * Either a 'code' column or 'iban' + 'reference' (+ optional amount, due, source/name) columns.
   * Throws VCError if the file has no usable header.
   */
  function readBatchCsv(bytes, fileName) {
    let text = decodeText(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const first = text.replace(/^\s+/, "").split("\n", 1)[0];
    const count = (ch) => first.split(ch).length - 1;
    let delim = ",";
    if ([",", ";", "\t"].some((ch) => first.includes(ch))) {
      delim = [",", ";", "\t"].reduce((best, ch) => (count(ch) > count(best) ? ch : best), ",");
    }
    const reader = csvReader(text, delim);
    const head = reader.next();
    const header = head.done ? null : head.value.row;
    if (!header || !header.length) throw new VCError("the CSV file is empty");
    const keys = header.map(headerKey);
    const cols = {};
    for (const [fld, names] of Object.entries(BATCH_COLUMNS)) {
      keys.forEach((k, i) => {
        if (names.includes(k) && !(fld in cols) && !Object.values(cols).includes(i)) cols[fld] = i;
      });
    }
    if (!("code" in cols) && !("iban" in cols && "reference" in cols)) {
      throw new VCError("the CSV needs a 'code' column, or 'iban' and 'reference' columns " +
                        "(optional: amount, due, source) - found: " + header.join(", "));
    }
    const out = [];
    for (const { row, lineNum } of reader) {
      if (!row.some((c) => c.trim())) continue;
      const get = (fld) => (cols[fld] !== undefined && cols[fld] < row.length ? row[cols[fld]].trim() : "");
      const r = { line: lineNum, source: get("source") || `${fileName}:${lineNum}`, vb: null, error: "", field: "" };
      try {
        const code = get("code").replace(/^[="' ]+|[="' ]+$/g, "");   // Excel text form ="..."
        r.vb = code ? parse(code) : parse(buildCode(get("iban"), get("amount"), get("reference"), get("due")));
      } catch (e) {
        if (!(e instanceof VCError)) throw e;
        r.error = e.message;
        r.field = e.field;
      }
      out.push(r);
    }
    return out;
  }

  root.VC = {
    VCError, parse, parseAmount, parseDue, fiReference, rfReference, normalizeIban, normalizeReference,
    buildCode, code128Modules, code128Checksum, iterCodes, extractCode, fmtIban, fmtAmount, fmtRef, fmtDue,
    daysOverdue, CSV_FIELDS, toRecord, writeCsv, csvSafe, readBatchCsv, decodeText, asciiSafe,
    BATCH_COLUMNS, RF_NON_NUMERIC, _internal: { ibanOk, rfOk, fiCheckDigit, mod97, toNumeric, csvReader },
  };
})(typeof window !== "undefined" ? window : globalThis);
