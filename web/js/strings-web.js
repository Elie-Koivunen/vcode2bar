// UI strings that only the web version needs. Everything shared with the Python version comes from
// strings-core.js (generated from vcode2bar.py). Every language must have every key (tested).
// License: PolyForm Noncommercial 1.0.0 - see LICENSE.
window.VC_STRINGS_WEB = {
  en: {
    tagline: "Finnish virtual barcode ↔ bank barcode – runs entirely in your browser",
    language: "Language",
    help: "Help",
    camera: "Scan with camera",
    camera_title: "Scan a bank barcode",
    camera_hint: "Hold the barcode inside the frame, flat and well lit. It is read automatically.",
    camera_stop: "Stop",
    camera_err: "Camera not available: {e}",
    camera_found: "Scanned with the camera",
    camera_source: "camera",
    drop_hint: "Tip: drop images, PDFs or CSV files anywhere on the page, or paste a screenshot with Ctrl+V.",
    drop_here: "Drop to read",
    reading: "Reading {f}…",
    reader_loading: "Loading the barcode reader…",
    reader_err: "The barcode reader could not be loaded: {e}",
    verify_running: "Read-back check running…",
    verify_unavailable: "Read-back check unavailable: {e}",
    clip_denied: "The browser did not allow reading the clipboard – press Ctrl+V instead.",
    copy_failed: "Copying was not allowed – select the text and copy it yourself.",
    print_blocked: "The print view was blocked as a pop-up. Allow pop-ups for this page, or use Save PDF.",
    file_unsupported: "{f}: not an image, PDF or CSV file",
    unsaved_list: "The list is not saved anywhere – export it before leaving.",
    privacy: "Everything runs in your browser: nothing you type, open or scan is uploaded anywhere.",
    python_version: "Desktop and command-line version (Python)",
    source_code: "Source code and documentation",
    web_version: "Web version {v}",
    bundled_libs: "Includes ZXing-C++ (zxing-wasm, MIT) and PDF.js (Apache-2.0).",
    import_hint: "One payment per row: iban, amount, reference, due (optional name) – or a code column.",
    web_guide_text:
      "1. Paste the 54-digit virtual barcode – or a whole invoice text or e-mail – into the input box. " +
      "The code is found and validated automatically.\n\n" +
      "2. The decoded fields and the barcode appear immediately. An amber due date means the invoice is " +
      "overdue or due today.\n\n" +
      "3. Save the barcode as PNG (600 dpi), SVG or a print-ready A4 PDF, or print it.\n\n" +
      "4. To read an existing barcode: Open image/PDF (photos, scans, screenshots, invoice PDFs), drop files " +
      "onto the page, paste a screenshot with Ctrl+V, or scan it with the camera.\n\n" +
      "5. Collect codes on the List tab and export them to CSV. The Excel format uses ';' and a decimal " +
      "comma so it opens cleanly in Nordic Excel.\n\n" +
      "6. To create a code yourself use the Create tab: enter the IBAN, amount, reference and due date. " +
      "'Add check digit' turns a reference base into a valid Finnish reference, 'Convert to RF' makes an " +
      "RF reference. 'Show barcode' opens the result on the Barcode tab for saving or printing.\n\n" +
      "7. Many invoices at once: Import CSV… on the List tab reads a spreadsheet with one payment per row " +
      "(columns iban, amount, reference, due, and optionally name – or a code column). Rows with errors are " +
      "listed with their line numbers. Exported lists can be imported again.\n\n" +
      "Everything runs in your browser – nothing is uploaded. The barcode follows the Finnish banks' " +
      "specification (Finanssiala, Pankkiviivakoodi-opas v5.3): Code 128 set C, no digits printed under the bars.",
    web_shortcut_rows: [["Ctrl+V", "Paste a code, invoice text or screenshot"], ["Ctrl+O", "Open image/PDF"],
      ["Ctrl+S", "Save PNG"], ["Ctrl+Shift+S", "Save SVG"], ["Ctrl+P", "Print"], ["Esc", "Clear the input"],
      ["F1", "Help"]],
  },
  fi: {
    tagline: "Virtuaaliviivakoodi ↔ pankkiviivakoodi – toimii kokonaan selaimessasi",
    language: "Kieli",
    help: "Ohje",
    camera: "Skannaa kameralla",
    camera_title: "Skannaa pankkiviivakoodi",
    camera_hint: "Pidä viivakoodi kehyksen sisällä suorana ja hyvässä valossa. Se luetaan automaattisesti.",
    camera_stop: "Lopeta",
    camera_err: "Kamera ei ole käytettävissä: {e}",
    camera_found: "Skannattu kameralla",
    camera_source: "kamera",
    drop_hint: "Vinkki: pudota kuvia, PDF- tai CSV-tiedostoja mihin tahansa sivulle tai liitä kuvakaappaus Ctrl+V:llä.",
    drop_here: "Pudota luettavaksi",
    reading: "Luetaan {f}…",
    reader_loading: "Ladataan viivakoodinlukijaa…",
    reader_err: "Viivakoodinlukijaa ei voitu ladata: {e}",
    verify_running: "Takaisinluku käynnissä…",
    verify_unavailable: "Takaisinluku ei käytettävissä: {e}",
    clip_denied: "Selain ei sallinut leikepöydän lukemista – paina Ctrl+V.",
    copy_failed: "Kopiointia ei sallittu – valitse teksti ja kopioi se itse.",
    print_blocked: "Tulostusnäkymä estettiin ponnahdusikkunana. Salli ponnahdusikkunat tälle sivulle tai käytä Tallenna PDF.",
    file_unsupported: "{f}: ei kuva-, PDF- tai CSV-tiedosto",
    unsaved_list: "Listaa ei tallenneta minnekään – vie se ennen poistumista.",
    privacy: "Kaikki toimii selaimessasi: mitään kirjoittamaasi, avaamaasi tai skannaamaasi ei lähetetä minnekään.",
    python_version: "Työpöytä- ja komentoriviversio (Python)",
    source_code: "Lähdekoodi ja ohjeet",
    web_version: "Selainversio {v}",
    bundled_libs: "Sisältää ZXing-C++:n (zxing-wasm, MIT) ja PDF.js:n (Apache-2.0).",
    import_hint: "Yksi maksu riviä kohden: tili, summa, viite, eräpäivä (valinnaisesti nimi) – tai koodi-sarake.",
    web_guide_text:
      "1. Liitä 54-numeroinen virtuaaliviivakoodi – tai koko laskun teksti tai sähköposti – syöttökenttään. " +
      "Koodi etsitään ja tarkistetaan automaattisesti.\n\n" +
      "2. Puretut tiedot ja viivakoodi näkyvät heti. Oranssi eräpäivä tarkoittaa, että lasku on myöhässä tai " +
      "erääntyy tänään.\n\n" +
      "3. Tallenna viivakoodi PNG- (600 dpi), SVG- tai tulostusvalmiina A4-PDF-tiedostona tai tulosta se.\n\n" +
      "4. Olemassa olevan viivakoodin lukeminen: Avaa kuva/PDF (valokuvat, skannaukset, kuvakaappaukset, " +
      "lasku-PDF:t), pudota tiedostoja sivulle, liitä kuvakaappaus Ctrl+V:llä tai skannaa kameralla.\n\n" +
      "5. Kerää koodit Lista-välilehdelle ja vie ne CSV-tiedostoon. Excel-muoto käyttää ';'-erotinta ja " +
      "desimaalipilkkua, joten se aukeaa suoraan suomenkielisessä Excelissä.\n\n" +
      "6. Oman koodin voit luoda Luo-välilehdellä: anna IBAN, summa, viite ja eräpäivä. 'Lisää tarkiste' tekee " +
      "viitteen perusosasta kelvollisen viitteen, 'Muunna RF-viitteeksi' tekee RF-viitteen. 'Näytä viivakoodi' " +
      "avaa tuloksen Viivakoodi-välilehdelle tallennettavaksi tai tulostettavaksi.\n\n" +
      "7. Monta laskua kerralla: Lista-välilehden Tuo CSV… lukee taulukon, jossa on yksi maksu riviä kohden " +
      "(sarakkeet tili, summa, viite, eräpäivä ja valinnaisesti nimi – tai koodi-sarake). Virheelliset rivit " +
      "näytetään rivinumeroineen. Viedyt listat voi tuoda takaisin.\n\n" +
      "Kaikki toimii selaimessasi – mitään ei lähetetä. Viivakoodi noudattaa pankkien määritystä (Finanssiala, " +
      "Pankkiviivakoodi-opas v5.3): Code 128 C-merkistö, ei numeroita viivojen alla.",
    web_shortcut_rows: [["Ctrl+V", "Liitä koodi, laskun teksti tai kuvakaappaus"], ["Ctrl+O", "Avaa kuva/PDF"],
      ["Ctrl+S", "Tallenna PNG"], ["Ctrl+Shift+S", "Tallenna SVG"], ["Ctrl+P", "Tulosta"], ["Esc", "Tyhjennä syöte"],
      ["F1", "Ohje"]],
  },
  sv: {
    tagline: "Finsk virtuell streckkod ↔ bankstreckkod – körs helt i din webbläsare",
    language: "Språk",
    help: "Hjälp",
    camera: "Skanna med kameran",
    camera_title: "Skanna en bankstreckkod",
    camera_hint: "Håll streckkoden inom ramen, rakt och i bra ljus. Den läses automatiskt.",
    camera_stop: "Stoppa",
    camera_err: "Kameran är inte tillgänglig: {e}",
    camera_found: "Skannad med kameran",
    camera_source: "kamera",
    drop_hint: "Tips: släpp bilder, PDF- eller CSV-filer var som helst på sidan, eller klistra in en skärmbild med Ctrl+V.",
    drop_here: "Släpp för att läsa",
    reading: "Läser {f}…",
    reader_loading: "Laddar streckkodsläsaren…",
    reader_err: "Streckkodsläsaren kunde inte laddas: {e}",
    verify_running: "Kontrolläsning pågår…",
    verify_unavailable: "Kontrolläsning inte tillgänglig: {e}",
    clip_denied: "Webbläsaren tillät inte att urklipp lästes – tryck Ctrl+V i stället.",
    copy_failed: "Kopiering tilläts inte – markera texten och kopiera den själv.",
    print_blocked: "Utskriftsvyn blockerades som popup. Tillåt popupfönster för sidan eller använd Spara PDF.",
    file_unsupported: "{f}: inte en bild-, PDF- eller CSV-fil",
    unsaved_list: "Listan sparas inte någonstans – exportera den innan du lämnar sidan.",
    privacy: "Allt körs i din webbläsare: inget du skriver, öppnar eller skannar skickas någonstans.",
    python_version: "Skrivbords- och kommandoradsversion (Python)",
    source_code: "Källkod och dokumentation",
    web_version: "Webbversion {v}",
    bundled_libs: "Innehåller ZXing-C++ (zxing-wasm, MIT) och PDF.js (Apache-2.0).",
    import_hint: "En betalning per rad: konto, belopp, referens, förfallodag (valfritt namn) – eller en kod-kolumn.",
    web_guide_text:
      "1. Klistra in den 54-siffriga virtuella streckkoden – eller hela fakturatexten eller ett e-postmeddelande – " +
      "i inmatningsfältet. Koden hittas och kontrolleras automatiskt.\n\n" +
      "2. De avkodade uppgifterna och streckkoden visas direkt. En orange förfallodag betyder att fakturan är " +
      "försenad eller förfaller i dag.\n\n" +
      "3. Spara streckkoden som PNG (600 dpi), SVG eller en utskriftsklar A4-PDF, eller skriv ut den.\n\n" +
      "4. För att läsa en befintlig streckkod: Öppna bild/PDF (foton, skanningar, skärmbilder, faktura-PDF:er), " +
      "släpp filer på sidan, klistra in en skärmbild med Ctrl+V eller skanna med kameran.\n\n" +
      "5. Samla koder på fliken Lista och exportera dem till CSV. Excel-formatet använder ';' och decimalkomma " +
      "så att det öppnas direkt i nordiska Excel.\n\n" +
      "6. Skapa en egen kod på fliken Skapa: ange IBAN, belopp, referens och förfallodag. 'Lägg till " +
      "kontrollsiffra' gör en referensstomme till en giltig finsk referens, 'Konvertera till RF' skapar en " +
      "RF-referens. 'Visa streckkod' öppnar resultatet på fliken Streckkod för att sparas eller skrivas ut.\n\n" +
      "7. Många fakturor på en gång: Importera CSV… på fliken Lista läser en tabell med en betalning per rad " +
      "(kolumnerna konto, belopp, referens, förfallodag och valfritt namn – eller en kod-kolumn). Rader med fel " +
      "visas med radnummer. Exporterade listor kan importeras igen.\n\n" +
      "Allt körs i din webbläsare – inget laddas upp. Streckkoden följer de finländska bankernas specifikation " +
      "(Finanssiala, Pankkiviivakoodi-opas v5.3): Code 128 teckenuppsättning C, inga siffror under strecken.",
    web_shortcut_rows: [["Ctrl+V", "Klistra in kod, fakturatext eller skärmbild"], ["Ctrl+O", "Öppna bild/PDF"],
      ["Ctrl+S", "Spara PNG"], ["Ctrl+Shift+S", "Spara SVG"], ["Ctrl+P", "Skriv ut"], ["Esc", "Töm inmatningen"],
      ["F1", "Hjälp"]],
  },
  nb: {
    tagline: "Finsk virtuell strekkode ↔ bankstrekkode – kjører helt i nettleseren din",
    language: "Språk",
    help: "Hjelp",
    camera: "Skann med kamera",
    camera_title: "Skann en bankstrekkode",
    camera_hint: "Hold strekkoden innenfor rammen, rett og i godt lys. Den leses automatisk.",
    camera_stop: "Stopp",
    camera_err: "Kameraet er ikke tilgjengelig: {e}",
    camera_found: "Skannet med kamera",
    camera_source: "kamera",
    drop_hint: "Tips: slipp bilder, PDF- eller CSV-filer hvor som helst på siden, eller lim inn et skjermbilde med Ctrl+V.",
    drop_here: "Slipp for å lese",
    reading: "Leser {f}…",
    reader_loading: "Laster strekkodeleseren…",
    reader_err: "Strekkodeleseren kunne ikke lastes: {e}",
    verify_running: "Kontrollesing pågår…",
    verify_unavailable: "Kontrollesing ikke tilgjengelig: {e}",
    clip_denied: "Nettleseren tillot ikke å lese utklippstavlen – trykk Ctrl+V i stedet.",
    copy_failed: "Kopiering ble ikke tillatt – merk teksten og kopier den selv.",
    print_blocked: "Utskriftsvisningen ble blokkert som et popup-vindu. Tillat popup-vinduer for siden, eller bruk Lagre PDF.",
    file_unsupported: "{f}: ikke en bilde-, PDF- eller CSV-fil",
    unsaved_list: "Listen lagres ikke noe sted – eksporter den før du forlater siden.",
    privacy: "Alt kjører i nettleseren din: ingenting du skriver, åpner eller skanner sendes noe sted.",
    python_version: "Skrivebords- og kommandolinjeversjon (Python)",
    source_code: "Kildekode og dokumentasjon",
    web_version: "Nettversjon {v}",
    bundled_libs: "Inneholder ZXing-C++ (zxing-wasm, MIT) og PDF.js (Apache-2.0).",
    import_hint: "Én betaling per rad: konto, beløp, referanse, forfallsdato (eventuelt navn) – eller en kode-kolonne.",
    web_guide_text:
      "1. Lim inn den 54-sifrede virtuelle strekkoden – eller hele fakturateksten eller en e-post – i " +
      "inndatafeltet. Koden finnes og kontrolleres automatisk.\n\n" +
      "2. De dekodede opplysningene og strekkoden vises med en gang. En oransje forfallsdato betyr at fakturaen " +
      "er forfalt eller forfaller i dag.\n\n" +
      "3. Lagre strekkoden som PNG (600 dpi), SVG eller en utskriftsklar A4-PDF, eller skriv den ut.\n\n" +
      "4. For å lese en eksisterende strekkode: Åpne bilde/PDF (bilder, skanninger, skjermbilder, faktura-PDF-er), " +
      "slipp filer på siden, lim inn et skjermbilde med Ctrl+V eller skann med kameraet.\n\n" +
      "5. Samle koder i fanen Liste og eksporter dem til CSV. Excel-formatet bruker ';' og desimalkomma, slik at " +
      "det åpnes rett i nordisk Excel.\n\n" +
      "6. Lag en egen kode i fanen Opprett: oppgi IBAN, beløp, referanse og forfallsdato. 'Legg til " +
      "kontrollsiffer' gjør en referansestamme til en gyldig finsk referanse, 'Konverter til RF' lager en " +
      "RF-referanse. 'Vis strekkode' åpner resultatet i fanen Strekkode for lagring eller utskrift.\n\n" +
      "7. Mange fakturaer samtidig: Importer CSV… i fanen Liste leser en tabell med én betaling per rad " +
      "(kolonnene konto, beløp, referanse, forfallsdato og eventuelt navn – eller en kode-kolonne). Rader med " +
      "feil vises med linjenummer. Eksporterte lister kan importeres igjen.\n\n" +
      "Alt kjører i nettleseren din – ingenting lastes opp. Strekkoden følger de finske bankenes spesifikasjon " +
      "(Finanssiala, Pankkiviivakoodi-opas v5.3): Code 128 tegnsett C, ingen sifre under strekene.",
    web_shortcut_rows: [["Ctrl+V", "Lim inn kode, fakturatekst eller skjermbilde"], ["Ctrl+O", "Åpne bilde/PDF"],
      ["Ctrl+S", "Lagre PNG"], ["Ctrl+Shift+S", "Lagre SVG"], ["Ctrl+P", "Skriv ut"], ["Esc", "Tøm inndata"],
      ["F1", "Hjelp"]],
  },
};
// One merged table per language: shared strings first, web strings on top.
window.VC_STRINGS = Object.fromEntries(Object.keys(window.VC_STRINGS_CORE || {}).map(
  (l) => [l, Object.assign({}, window.VC_STRINGS_CORE[l], window.VC_STRINGS_WEB[l])]));
