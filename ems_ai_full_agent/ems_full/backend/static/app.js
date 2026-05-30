const BACKEND_URL = "http://localhost:5000";

let bomData           = [];
let bomStats          = {};
let bomIssues         = [];
let bomTotalCost      = 0;
let bomCostPerBoard   = 0;
let smtData           = null;
let lastFilePath      = "";
let agentEmailText    = "";

// ==========================================
// i18n — English / German
// ==========================================
let currentLang = localStorage.getItem("ems_lang") || "en";

const T = {
    en: {
        // Header
        app_title:          "EMS AI Quotation System",
        new_file:           "↩ New File",

        // Tabs
        tab_bom:            "BOM",
        tab_issues:         "Issues",
        tab_smt:            "SMT Check",
        tab_quote:          "Quotation",
        tab_ai:             "AI Assistant",
        tab_agent:          "Full Agent",

        // BOM stats
        stat_total:         "TOTAL LINES",
        stat_active:        "ACTIVE",
        stat_dnp:           "DNP",
        stat_issues:        "ISSUES",

        // BOM toolbar
        fetch_prices:       "🔍 Fetch Live Prices",
        check_smt:          "⚙ Check SMT",
        search_placeholder: "Search components...",
        all_mount_types:    "All Mount Types",
        all_rows:           "All Rows",

        // BOM table headers
        th_ref:             "REF",
        th_desc:            "DESCRIPTION",
        th_mpn:             "MPN",
        th_mfr:             "MFR",
        th_pkg:             "PACKAGE",
        th_qty:             "QTY",
        th_unit:            "UNIT €",
        th_perboard:        "PER BOARD",
        th_ext:             "EXT TOTAL",
        th_supplier:        "SUPPLIER",
        th_stock:           "STOCK",
        th_all_sup:         "ALL SUPPLIERS",
        th_status:          "STATUS",
        th_ai:              "AI",

        // Price states
        btn_override:       "✏ override",
        btn_rfq:            "📋 RFQ",
        btn_clear:          "✕ clear",
        btn_enter_price:    "✍ enter price",
        btn_mark_rfq:       "📋 mark RFQ",
        awaiting_quote:     "📋 Awaiting quote",
        manual_label:       "✍ MANUAL",
        manual_price_note:  "Price entered manually",
        rfq_waiting:        "Awaiting supplier quotation",

        // Summary bar
        price_coverage:     "Price coverage:",
        auto_label:         "✓ Auto",
        manual_label2:      "✍ Manual",
        rfq_label:          "📋 RFQ",
        unpriced_label:     "❌ Unpriced",
        total_per_board:    "Total/board:",
        incomplete:         "(incomplete)",
        complete:           "✓ complete",
        parts_excluded:     "parts excluded",

        // Quotation page
        quote_settings:     "💰 Quotation Settings",
        customer_name:      "CUSTOMER NAME",
        project_name:       "PROJECT NAME",
        quote_ref:          "QUOTATION REF",
        board_qty:          "BOARD QUANTITY",
        asm_cost:           "ASSEMBLY COST / BOARD (€)",
        margin_pct:         "MARGIN (%)",
        cost_breakdown:     "Cost Breakdown",
        item_col:           "ITEM",
        per_board_col:      "PER BOARD",
        bom_comp_cost:      "Component cost (BOM)",
        assembly_cost:      "Assembly cost",
        subtotal:           "Subtotal",
        sell_price:         "💰 SELL PRICE",
        export_section:     "📊 Export",
        dl_excel:           "📊 Download Excel",
        dl_pdf:             "📄 Download PDF",
        ai_email_draft:     "📧 AI Email Draft",
        email_placeholder:  "Generate a professional email to send to your customer.",
        gen_email_btn:      "✉ Generate Email",
        copy_email:         "📋 Copy Email",
        ai_quote_desc:      "🤖 AI Quote Description",
        gen_desc_btn:       "Generate Description",

        // Issues
        no_issues:          "✅ No issues found.",

        // SMT
        smt_overall:        "Overall Assessment",
        smt_low:            "LOW RISK",
        smt_medium:         "MEDIUM RISK",
        smt_high:           "HIGH RISK",
        smt_missing:        "MISSING PKG",

        // AI Assistant
        ai_placeholder:     "Ask anything about your BOM...",
        ai_ask_btn:         "Ask AI",
        ai_suggestions:     "Suggestions:",

        // Upload screen
        upload_title:       "Upload your BOM file",
        upload_subtitle:    "Drag & drop or click to select",
        upload_formats:     "Supports .xlsx, .xls, .pdf",

        // Warnings
        quot_incomplete:    "⚠ Quotation incomplete",
        quot_complete:      "✅ Quotation complete — all active parts priced",
        excluded_from_total:"parts excluded from total",
        awaiting_rfq:       "📋 Awaiting RFQ",
        no_price_found:     "❌ No price found on any supplier",
        go_to_bom:          "BOM tab",
        enter_manual_note:  "Enter prices manually in the",
        verify_manual:      "Verify these prices before sending to customer.",

        // Agent
        agent_run:          "🚀 Run Full Agent",
        agent_running:      "⏳ Agent running...",
        agent_progress:     "Agent Progress",
        agent_results:      "Agent Results",
        agent_quote_sum:    "Quote Summary",
        agent_smt_sum:      "SMT Summary",
        agent_email_draft:  "AI Email Draft",
        copy_btn:           "📋 Copy",
        bom_cost_board:     "BOM Cost/Board",
        sell_per_board:     "Sell Price/Board",
        total_value:        "Total Value",

        // Status badges
        badge_ok:           "✓",
        badge_dnp:          "DNP",
        badge_no_price:     "No Price",
        badge_alt:          "💜 Alt",
        badge_rfq:          "📋 RFQ",
        badge_manual:       "✍ Manual",

        // Misc
        ask_ai_btn:         "Ask AI",
        out_of_stock:       "OUT",
        moq_warn:           "⚠ MOQ",
        cheaper_oos:        "💜 cheaper OOS",
        fetching:           "⏳ Fetching prices...",
        parts_priced:       "parts priced for qty ×",
        no_components:      "No components found",
    },

    de: {
        // Header
        app_title:          "EMS KI-Angebotssystem",
        new_file:           "↩ Neue Datei",

        // Tabs
        tab_bom:            "Stückliste",
        tab_issues:         "Probleme",
        tab_smt:            "SMT-Prüfung",
        tab_quote:          "Angebot",
        tab_ai:             "KI-Assistent",
        tab_agent:          "Vollständiger Agent",

        // BOM stats
        stat_total:         "GESAMT",
        stat_active:        "AKTIV",
        stat_dnp:           "DNB",
        stat_issues:        "PROBLEME",

        // BOM toolbar
        fetch_prices:       "🔍 Livepreise abrufen",
        check_smt:          "⚙ SMT prüfen",
        search_placeholder: "Bauteile suchen...",
        all_mount_types:    "Alle Montagetypen",
        all_rows:           "Alle Zeilen",

        // BOM table headers
        th_ref:             "REF",
        th_desc:            "BESCHREIBUNG",
        th_mpn:             "MPN",
        th_mfr:             "HERSTELLER",
        th_pkg:             "GEHÄUSE",
        th_qty:             "MENGE",
        th_unit:            "EINZELPREIS €",
        th_perboard:        "PRO PLATINE",
        th_ext:             "GESAMT",
        th_supplier:        "LIEFERANT",
        th_stock:           "LAGERBESTAND",
        th_all_sup:         "ALLE LIEFERANTEN",
        th_status:          "STATUS",
        th_ai:              "KI",

        // Price states
        btn_override:       "✏ Überschreiben",
        btn_rfq:            "📋 Anfrage",
        btn_clear:          "✕ Löschen",
        btn_enter_price:    "✍ Preis eingeben",
        btn_mark_rfq:       "📋 Als Anfrage markieren",
        awaiting_quote:     "📋 Angebot ausstehend",
        manual_label:       "✍ MANUELL",
        manual_price_note:  "Manuell eingegebener Preis",
        rfq_waiting:        "Warte auf Lieferantenangebot",

        // Summary bar
        price_coverage:     "Preisabdeckung:",
        auto_label:         "✓ Automatisch",
        manual_label2:      "✍ Manuell",
        rfq_label:          "📋 Anfrage",
        unpriced_label:     "❌ Kein Preis",
        total_per_board:    "Gesamt/Platine:",
        incomplete:         "(unvollständig)",
        complete:           "✓ vollständig",
        parts_excluded:     "Teile ausgeschlossen",

        // Quotation page
        quote_settings:     "💰 Angebotseinstellungen",
        customer_name:      "KUNDENNAME",
        project_name:       "PROJEKTNAME",
        quote_ref:          "ANGEBOTSNUMMER",
        board_qty:          "PLATINENANZAHL",
        asm_cost:           "MONTAGEKOSTEN / PLATINE (€)",
        margin_pct:         "MARGE (%)",
        cost_breakdown:     "Kostenaufstellung",
        item_col:           "POSITION",
        per_board_col:      "PRO PLATINE",
        bom_comp_cost:      "Bauteilkosten (Stückliste)",
        assembly_cost:      "Montagekosten",
        subtotal:           "Zwischensumme",
        sell_price:         "💰 VERKAUFSPREIS",
        export_section:     "📊 Export",
        dl_excel:           "📊 Excel herunterladen",
        dl_pdf:             "📄 PDF herunterladen",
        ai_email_draft:     "📧 KI-E-Mail-Entwurf",
        email_placeholder:  "Erstellen Sie eine professionelle E-Mail für Ihren Kunden.",
        gen_email_btn:      "✉ E-Mail erstellen",
        copy_email:         "📋 E-Mail kopieren",
        ai_quote_desc:      "🤖 KI-Angebotsbeschreibung",
        gen_desc_btn:       "Beschreibung erstellen",

        // Issues
        no_issues:          "✅ Keine Probleme gefunden.",

        // SMT
        smt_overall:        "Gesamtbewertung",
        smt_low:            "GERINGES RISIKO",
        smt_medium:         "MITTLERES RISIKO",
        smt_high:           "HOHES RISIKO",
        smt_missing:        "FEHLENDES GEHÄUSE",

        // AI Assistant
        ai_placeholder:     "Fragen Sie alles über Ihre Stückliste...",
        ai_ask_btn:         "KI fragen",
        ai_suggestions:     "Vorschläge:",

        // Upload screen
        upload_title:       "Stückliste hochladen",
        upload_subtitle:    "Drag & Drop oder klicken",
        upload_formats:     "Unterstützt .xlsx, .xls, .pdf",

        // Warnings
        quot_incomplete:    "⚠ Angebot unvollständig",
        quot_complete:      "✅ Angebot vollständig — alle aktiven Teile bepreist",
        excluded_from_total:"Teile vom Gesamtpreis ausgeschlossen",
        awaiting_rfq:       "📋 Anfrage ausstehend",
        no_price_found:     "❌ Kein Preis bei Lieferanten gefunden",
        go_to_bom:          "Stückliste",
        enter_manual_note:  "Preise manuell eingeben in der",
        verify_manual:      "Preise vor dem Senden an den Kunden überprüfen.",

        // Agent
        agent_run:          "🚀 Vollständigen Agenten starten",
        agent_running:      "⏳ Agent läuft...",
        agent_progress:     "Agentfortschritt",
        agent_results:      "Agentergebnisse",
        agent_quote_sum:    "Angebotsübersicht",
        agent_smt_sum:      "SMT-Übersicht",
        agent_email_draft:  "KI-E-Mail-Entwurf",
        copy_btn:           "📋 Kopieren",
        bom_cost_board:     "Bauteilkosten/Platine",
        sell_per_board:     "Verkaufspreis/Platine",
        total_value:        "Gesamtwert",

        // Status badges
        badge_ok:           "✓",
        badge_dnp:          "DNB",
        badge_no_price:     "Kein Preis",
        badge_alt:          "💜 Alt",
        badge_rfq:          "📋 Anfrage",
        badge_manual:       "✍ Manuell",

        // Misc
        ask_ai_btn:         "KI fragen",
        out_of_stock:       "NICHT AUF LAGER",
        moq_warn:           "⚠ MBM",   // Mindestbestellmenge
        cheaper_oos:        "💜 günstiger nicht vorrätig",
        fetching:           "⏳ Preise werden abgerufen...",
        parts_priced:       "Teile bepreist für Menge ×",
        no_components:      "Keine Bauteile gefunden",
    }
};

// Get translation for current language
function t(key) {
    return (T[currentLang] && T[currentLang][key]) || T["en"][key] || key;
}

// Apply language to all data-i18n elements in the DOM
function applyLang() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key  = el.getAttribute("data-i18n");
        const attr = el.getAttribute("data-i18n-attr");
        if (attr) {
            el.setAttribute(attr, t(key));
        } else {
            el.textContent = t(key);
        }
    });

    // Update toggle button to show the OTHER language
    const btn = document.getElementById("lang-toggle");
    if (btn) {
        btn.textContent = currentLang === "en" ? "🇩🇪 Deutsch" : "🇬🇧 English";
        btn.title = currentLang === "en" ? "Auf Deutsch wechseln" : "Switch to English";
    }

    // Update html lang attribute
    document.documentElement.lang = currentLang;

    // Update placeholders manually (select elements don't use textContent)
    const searchBox = document.getElementById("search-box");
    if (searchBox) searchBox.placeholder = t("search_placeholder");
    const aiInput = document.getElementById("ai-input");
    if (aiInput) aiInput.placeholder = t("ai_placeholder");

    // Re-render dynamic content in new language
    if (bomData.length > 0) {
        renderBOMTable();
        renderIssues();
        updateQuotation();
        if (smtData) renderSMTTab();
    }

    localStorage.setItem("ems_lang", currentLang);
}

function toggleLang() {
    currentLang = currentLang === "en" ? "de" : "en";
    applyLang();
}

// ── INIT ──
document.addEventListener("DOMContentLoaded", () => {
    applyLang();   // apply saved language preference on load

    document.getElementById("file-input")
        .addEventListener("change", (e) => {
            if (e.target.files[0]) uploadBOM(e.target.files[0]);
        });

    const dz = document.getElementById("drop-zone");
    dz.addEventListener("dragover",  (e) => { e.preventDefault(); dz.classList.add("drag-over"); });
    dz.addEventListener("dragleave", ()  => dz.classList.remove("drag-over"));
    dz.addEventListener("drop", (e) => {
        e.preventDefault();
        dz.classList.remove("drag-over");
        if (e.dataTransfer.files[0]) uploadBOM(e.dataTransfer.files[0]);
    });

    document.getElementById("search-box")  .addEventListener("input",  renderBOMTable);
    document.getElementById("mount-filter").addEventListener("change", renderBOMTable);
    document.getElementById("dnp-filter")  .addEventListener("change", renderBOMTable);
    document.getElementById("ai-input")    .addEventListener("keydown", (e) => { if (e.key === "Enter") askAI(); });
});


// ── UPLOAD BOM ──
async function uploadBOM(file) {
    const formData = new FormData();
    formData.append("file", file);

    try {
        const res  = await fetch(`${BACKEND_URL}/upload-bom`, { method: "POST", body: formData });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Upload failed"); }
        const data = await res.json();

        bomData           = data.bom;
        bomStats          = data.stats;
        bomIssues         = data.issues;
        bomTotalCost      = data.total_cost        || 0;
        bomCostPerBoard   = data.bom_cost_per_board || 0;
        lastFilePath      = `uploads/${file.name}`;

        document.getElementById("upload-screen").classList.add("hidden");
        document.getElementById("app-screen").classList.remove("hidden");
        document.getElementById("header-file").textContent = file.name;

        renderStats();
        renderBOMTable();
        renderIssues();
        renderAIComponentList();
        updateQuotation();

    } catch (err) { alert("Upload error: " + err.message); }
}


// ── STATS ──
function renderStats() {
    document.getElementById("stat-total").textContent  = bomStats.total_lines  || 0;
    document.getElementById("stat-active").textContent = bomStats.active_lines || 0;
    document.getElementById("stat-dnp").textContent    = bomStats.dnp_lines    || 0;
    document.getElementById("stat-issues").textContent = bomStats.issue_count  || 0;
}


// ==========================================
// PRICE STATE HELPERS
// Each row can be in one of 4 states:
//   "auto"   — priced from supplier API
//   "manual" — user typed a price
//   "rfq"    — flagged as Request For Quote
//   "unpriced" — no price, no action taken
// ==========================================

function getPriceState(row) {
    // If manually set by user, trust it
    if (row.price_state === "manual") return "manual";
    if (row.price_state === "rfq")    return "rfq";
    // If has a real price, it's auto regardless of what backend said
    if (row.unit_price)  return "auto";
    return "unpriced";
}

// Called when user types a manual price into the inline input
function setManualPrice(idx, value) {
    const row   = bomData[idx];
    const price = parseFloat(value);
    if (isNaN(price) || price <= 0) return;

    const boardQty = parseInt(document.getElementById("board-qty").value) || 1;
    const compQty  = parseInt(row.qty) || 1;

    row.price_state      = "manual";
    row.unit_price       = price;
    row.per_board_cost   = round4(price * compQty);
    row.extended_price   = round4(price * compQty * boardQty);
    row.nexar_supplier   = "MANUAL";
    row.nexar_price      = price;
    row.manual_price     = price;

    recomputeTotals();
    renderBOMTable();
    updateQuotation();
}

// Called when user clicks RFQ button on a row
function setRFQ(idx) {
    const row = bomData[idx];
    row.price_state    = "rfq";
    row.unit_price     = null;
    row.per_board_cost = null;
    row.extended_price = null;
    row.nexar_supplier = "RFQ";
    row.nexar_price    = null;
    row.manual_price   = null;

    recomputeTotals();
    renderBOMTable();
    updateQuotation();
}

// Clear manual/rfq state back to auto (re-fetch will overwrite)
function clearManual(idx) {
    const row = bomData[idx];
    row.price_state  = row.nexar_price_backup ? "auto" : "unpriced";
    row.unit_price   = row.unit_price_backup   || null;
    row.per_board_cost  = row.per_board_backup  || null;
    row.extended_price  = row.extended_backup   || null;
    row.nexar_supplier  = row.supplier_backup   || null;
    row.nexar_price     = row.nexar_price_backup || null;
    row.manual_price    = null;

    recomputeTotals();
    renderBOMTable();
    updateQuotation();
}

function round4(n) { return Math.round(n * 10000) / 10000; }

// Recompute bomCostPerBoard and bomTotalCost from current bomData
function recomputeTotals() {
    const boardQty = parseInt(document.getElementById("board-qty").value) || 1;

    bomCostPerBoard = 0;
    bomTotalCost    = 0;

    bomData.forEach(row => {
        if (row.dnp === "Y") return;
        if (row.price_state === "rfq") return;   // RFQ excluded from total
        const pb = row.per_board_cost || 0;
        const ex = row.extended_price || 0;
        bomCostPerBoard += pb;
        bomTotalCost    += ex;
    });

    bomCostPerBoard = round4(bomCostPerBoard);
    bomTotalCost    = round4(bomTotalCost);
}


// ── BOM TABLE ──
function renderBOMTable() {
    const search    = (document.getElementById("search-box").value || "").toLowerCase();
    const mount     = document.getElementById("mount-filter").value || "";
    const dnpFilter = document.getElementById("dnp-filter").value   || "";

    const filtered = bomData.filter(row => {
        if (search) {
            const text = [row.ref||"", row.description||"", row.mpn||"", row.manufacturer||""].join(" ").toLowerCase();
            if (!text.includes(search)) return false;
        }
        if (mount && !(row.package||"").toUpperCase().includes(mount)) return false;
        if (dnpFilter && row.dnp !== dnpFilter) return false;
        return true;
    });

    const tbody = document.getElementById("bom-table-body");
    tbody.innerHTML = "";

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="15" style="text-align:center;padding:24px;opacity:0.5;">${t("no_components")}</td></tr>`;
        renderPriceSummaryBar();
        return;
    }

    filtered.forEach(row => {
        const globalIdx = bomData.indexOf(row);
        const state     = getPriceState(row);   // must be declared before any use
        const tr        = document.createElement("tr");
        if (row.dnp === "Y") tr.classList.add("row-dnp");

        // Highlight rows by state
        if (state === "unpriced") {
            tr.style.cssText = "border-left:3px solid #ef4444;background:rgba(239,68,68,0.04);";
        } else if (state === "rfq") {
            tr.style.cssText = "border-left:3px solid #f59e0b;background:rgba(245,158,11,0.04);";
        } else if (state === "manual") {
            tr.style.cssText = "border-left:3px solid #8b5cf6;background:rgba(139,92,246,0.04);";
        }

        const hasPrice  = row.unit_price && state !== "rfq";

        // ── STATUS BADGE ──
        let statusBadge;
        if (row.dnp === "Y") {
            statusBadge = `<span class="badge badge-dnp">${t("badge_dnp")}</span>`;
        } else if (state === "rfq") {
            statusBadge = `<span class="badge" style="background:#f59e0b22;color:#f59e0b;">${t("badge_rfq")}</span>`;
        } else if (state === "unpriced") {
            statusBadge = `<span class="badge badge-warn">${t("badge_no_price")}</span>`;
        } else {
            const stock = row.nexar_stock;
            if (stock == null) {
                statusBadge = `<span class="badge" style="background:#4a557022;color:#8a93b0;">—</span>`;
            } else if (stock > 0) {
                statusBadge = `<span class="badge badge-ok" style="background:#22c55e22;color:#22c55e;">✓</span>`;
            } else {
                statusBadge = `<span class="badge" style="background:#ef444422;color:#ef4444;font-weight:700;">OUT</span>`;
            }
        }

        // ── WARNINGS ──
        const belowMinWarn = row.below_minimum && state === "auto"
            ? `<span title="${currentLang === "de" ? "Menge unter Mindestbestellmenge" : "qty below supplier MOQ"}" style="color:#f59e0b;font-size:10px;"> ${t("moq_warn")}</span>` : "";

        const cheaperOosWarn = row.cheaper_oos && state === "auto"
            ? `<span title="${currentLang === "de" ? "Günstigerer Lieferant nicht vorrätig" : "cheaper supplier OOS"}" style="color:#a78bfa;font-size:10px;"> ${t("cheaper_oos")}</span>` : "";

        // ── UNIT PRICE CELL ──
        let unitPriceCell;
        if (state === "auto") {
            unitPriceCell = `
                <span style="color:#e8ecf4;font-family:monospace;">€${Number(row.unit_price).toFixed(4)}</span>
                ${belowMinWarn}${cheaperOosWarn}
                <div style="margin-top:4px;">
                    <button onclick="showManualInput(${globalIdx})"
                        style="font-size:9px;padding:1px 5px;background:#1e2336;border:1px solid #2d3555;
                               color:#8a93b0;border-radius:3px;cursor:pointer;">${t("btn_override")}</button>
                    <button onclick="setRFQ(${globalIdx})"
                        style="font-size:9px;padding:1px 5px;background:#1e2336;border:1px solid #2d3555;
                               color:#f59e0b;border-radius:3px;cursor:pointer;margin-left:2px;">${t("btn_rfq")}</button>
                </div>`;
        } else if (state === "manual") {
            unitPriceCell = `
                <input id="manual-input-${globalIdx}" type="number" step="0.0001" min="0"
                    value="${row.manual_price || ''}"
                    onchange="setManualPrice(${globalIdx}, this.value, document.getElementById('manual-supplier-${globalIdx}').value)"
                    style="width:75px;background:#1a1f35;border:1px solid #8b5cf6;color:#c4b5fd;
                           border-radius:4px;padding:2px 6px;font-size:12px;font-family:monospace;"/>
                <input id="manual-supplier-${globalIdx}" type="text"
                    value="${row.manual_supplier || ''}"
                    placeholder="Supplier name"
                    oninput="bomData[${globalIdx}].manual_supplier = this.value; bomData[${globalIdx}].nexar_supplier = this.value; clearTimeout(window._st); window._st = setTimeout(renderBOMTable, 600);"
                    style="width:90px;background:#1a1f35;border:1px solid #8b5cf6;color:#c4b5fd;
                           border-radius:4px;padding:2px 6px;font-size:11px;margin-top:3px;display:block;"/>
                <div style="margin-top:4px;">
                    <button onclick="clearManual(${globalIdx})"
                        style="font-size:9px;padding:1px 5px;background:#1e2336;border:1px solid #2d3555;
                               color:#ef4444;border-radius:3px;cursor:pointer;">${t("btn_clear")}</button>
                    <button onclick="setRFQ(${globalIdx})"
                        style="font-size:9px;padding:1px 5px;background:#1e2336;border:1px solid #2d3555;
                               color:#f59e0b;border-radius:3px;cursor:pointer;margin-left:2px;">${t("btn_rfq")}</button>
                </div>`;
        } else if (state === "rfq") {
            unitPriceCell = `
                <span style="color:#f59e0b;font-size:11px;">${t("awaiting_quote")}</span>
                <div style="margin-top:4px;">
                    <button onclick="showManualInput(${globalIdx})"
                        style="font-size:9px;padding:1px 5px;background:#1e2336;border:1px solid #2d3555;
                               color:#8b5cf6;border-radius:3px;cursor:pointer;">${t("btn_enter_price")}</button>
                    <button onclick="clearManual(${globalIdx})"
                        style="font-size:9px;padding:1px 5px;background:#1e2336;border:1px solid #2d3555;
                               color:#4a5570;border-radius:3px;cursor:pointer;margin-left:2px;">${t("btn_clear")}</button>
                </div>`;
        } else {
            unitPriceCell = `
                <input id="manual-input-${globalIdx}" type="number" step="0.0001" min="0"
                    placeholder="${currentLang === "de" ? "Preis €" : "enter €"}"
                    onchange="setManualPrice(${globalIdx}, this.value)"
                    style="width:80px;background:#1a1f35;border:1px solid #2d3555;color:#e8ecf4;
                           border-radius:4px;padding:2px 6px;font-size:12px;font-family:monospace;"/>
                <div style="margin-top:4px;">
                    <button onclick="setRFQ(${globalIdx})"
                        style="font-size:9px;padding:1px 5px;background:#1e2336;border:1px solid #f59e0b;
                               color:#f59e0b;border-radius:3px;cursor:pointer;">${t("btn_mark_rfq")}</button>
                </div>`;
        }

        // ── PER BOARD / EXTENDED ──
        const perBoard = hasPrice
            ? `<span style="color:#22c55e;font-weight:600;">€${Number(row.per_board_cost).toFixed(4)}</span>`
            : state === "rfq"
                ? `<span style="color:#f59e0b;font-size:11px;">RFQ</span>`
                : `<span style="color:#4a5570;">—</span>`;

        const extended = hasPrice
            ? `<span style="color:#4f8fff;font-family:monospace;">€${Number(row.extended_price).toFixed(2)}</span>`
            : state === "rfq"
                ? `<span style="color:#f59e0b;font-size:11px;">RFQ</span>`
                : `<span style="color:#4a5570;">—</span>`;

        // ── SUPPLIER ──
        const supplierLabel = state === "manual"
            ? `<span style="font-size:11px;color:#8b5cf6;font-family:monospace;">${row.manual_supplier || "MANUAL"}</span>`
            : state === "rfq"
                ? `<span style="font-size:11px;color:#f59e0b;font-family:monospace;">RFQ</span>`
                : row.nexar_supplier
                    ? `<span style="font-size:11px;color:#4f8fff;font-family:monospace;">${row.nexar_supplier}</span>`
                    : "—";

        // ── STOCK ──
        const stock = state === "manual" || state === "rfq"
            ? "—"
            : row.nexar_stock != null
                ? (row.nexar_stock > 0
                    ? `<span style="color:#22c55e;">${Number(row.nexar_stock).toLocaleString()}</span>`
                    : `<span style="color:#ef4444;">OUT</span>`)
                : "—";

        // ── ALL SUPPLIERS ──
        let allSuppliers = `<span style="color:#4a5570;font-size:11px;">—</span>`;
        if (state === "auto" && row.nexar_all && row.nexar_all.length > 0) {
            allSuppliers = row.nexar_all.map(s => {
                const eur = s.price_eur != null ? s.price_eur : (s.currency === "USD" ? s.price * 0.92 : s.price);
                const rawLabel = s.currency !== "EUR"
                    ? `<span style="color:#4a5570;font-size:10px;"> (${s.currency}${Number(s.price).toFixed(4)})</span>` : "";
                const breaks = (s.price_breaks || []).map(pb => {
                    const hl = pb.qualifies ? "color:#22c55e;font-weight:600;" : "color:#4a5570;";
                    return `<div style="font-size:10px;${hl}padding-left:8px;">
                        ${pb.qty}+ pcs → €${(s.currency === "USD" ? pb.price * 0.92 : pb.price).toFixed(4)}
                        ${pb.qualifies ? "✓" : ""}
                    </div>`;
                }).join("");
                return `<div style="font-size:11px;margin-bottom:6px;">
                    <span style="color:#8a93b0;">${s.supplier}:</span>
                    <span style="color:#e8ecf4;font-weight:600;font-family:monospace;">€${Number(eur).toFixed(4)}</span>
                    ${rawLabel}
                    <span style="color:#4a5570;">(${s.stock > 0 ? Number(s.stock).toLocaleString() : "OUT"})</span>
                    ${breaks}
                </div>`;
            }).join("");
        } else if (state === "manual") {
            allSuppliers = `<span style="color:#8b5cf6;font-size:11px;">Price entered manually</span>`;
        } else if (state === "rfq") {
            allSuppliers = `<span style="color:#f59e0b;font-size:11px;">Awaiting supplier quotation</span>`;
        }

        tr.innerHTML = `
            <td style="width:30px">${row.id || ""}</td>
            <td class="mono" style="width:160px;min-width:160px;max-width:160px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;" title="${row.ref||''}">${row.ref || "—"}</td>
            <td style="min-width:150px">${row.description || "—"}</td>
            <td class="mono small" style="white-space:nowrap">${row.nexar_url ? `<a href="${row.nexar_url}" target="_blank" style="color:#4f8fff;text-decoration:underline;">${row.mpn || "—"}</a>` : (row.mpn || "—")}</td>
            <td style="min-width:100px">${row.manufacturer || "—"}</td>
            <td class="mono small" style="min-width:90px">${row.package || "—"}</td>
            <td class="mono" style="width:40px;text-align:center">${row.qty || 0}</td>
            <td style="min-width:140px">${unitPriceCell}</td>
            <td class="mono" style="min-width:90px">${perBoard}</td>
            <td class="mono" style="min-width:90px">${extended}</td>
            <td style="min-width:80px">${supplierLabel}</td>
            <td style="min-width:70px">${stock}</td>
            <td style="min-width:180px">${allSuppliers}</td>
            <td style="min-width:75px">${statusBadge}</td>
            <td style="width:60px"><button class="btn-ai-small" onclick="explainComponent(${globalIdx})">Ask AI</button></td>
        `;
        tbody.appendChild(tr);
    });

    renderPriceSummaryBar();
}

// Show the manual input field on a row that currently shows "override" button
function showManualInput(idx) {
    const row = bomData[idx];
    // Back up auto values so we can restore them with clearManual
    if (row.price_state === "auto" || !row.price_state) {
        row.unit_price_backup    = row.unit_price;
        row.per_board_backup     = row.per_board_cost;
        row.extended_backup      = row.extended_price;
        row.supplier_backup      = row.nexar_supplier;
        row.nexar_price_backup   = row.nexar_price;
    }
    row.price_state = "manual";
    row.unit_price  = row.manual_price || null;
    renderBOMTable();
}

function setManualPrice(idx, value, supplierName) {
    const row   = bomData[idx];
    const price = parseFloat(value);
    if (isNaN(price) || price <= 0) return;

    const boardQty = parseInt(document.getElementById("board-qty").value) || 1;
    const compQty  = parseInt(row.qty) || 1;

    row.price_state      = "manual";
    row.unit_price       = price;
    row.per_board_cost   = round4(price * compQty);
    row.extended_price   = round4(price * compQty * boardQty);
    row.nexar_supplier   = supplierName || row.manual_supplier || "MANUAL";
    row.manual_supplier  = supplierName || row.manual_supplier || "MANUAL";
    row.nexar_price      = price;
    row.manual_price     = price;

    recomputeTotals();
    renderBOMTable();
    updateQuotation();
}


// ── PRICE SUMMARY BAR ──
// Shows: auto-priced total | manual total | RFQ count | grand total
function renderPriceSummaryBar() {
    const boardQty = parseInt(document.getElementById("board-qty").value) || 1;

    const autoParts    = bomData.filter(r => r.dnp !== "Y" && getPriceState(r) === "auto");
    const manualParts  = bomData.filter(r => r.dnp !== "Y" && getPriceState(r) === "manual");
    const rfqParts     = bomData.filter(r => r.dnp !== "Y" && getPriceState(r) === "rfq");
    const unpricedParts = bomData.filter(r => r.dnp !== "Y" && getPriceState(r) === "unpriced");

    const autoTotal   = autoParts.reduce((s, r)   => s + (r.per_board_cost || 0), 0);
    const manualTotal = manualParts.reduce((s, r)  => s + (r.per_board_cost || 0), 0);
    const grandTotal  = autoTotal + manualTotal;


    // Update footer total in BOM table
    const totalEl = document.getElementById("bom-total");
    if (totalEl) {
        totalEl.innerHTML = rfqParts.length > 0 || unpricedParts.length > 0
            ? `€${bomTotalCost.toFixed(2)} <span style="color:#f59e0b;font-size:11px;">
                ⚠ ${rfqParts.length + unpricedParts.length} parts excluded</span>`
            : `€${bomTotalCost.toFixed(2)}`;
    }

    // Update or create the summary bar below the table
    let bar = document.getElementById("price-summary-bar");
    if (!bar) {
        bar = document.createElement("div");
        bar.id = "price-summary-bar";
        bar.style.cssText = `
            display:flex;gap:16px;flex-wrap:wrap;
            padding:12px 16px;margin-top:8px;
            background:#0f1623;border:1px solid #1e2336;border-radius:8px;
            font-size:12px;align-items:center;`;
        const tableWrap = document.getElementById("bom-table-body")?.closest("table")?.parentElement;
        if (tableWrap) tableWrap.after(bar);
    }

    bar.innerHTML = `
        <span style="color:#8a93b0;">${t("price_coverage")}</span>
        <span style="color:#22c55e;">
            ${t("auto_label")}: ${autoParts.length} — €${autoTotal.toFixed(4)}/${currentLang === "de" ? "Platine" : "board"}
        </span>
        ${manualParts.length > 0 ? `
        <span style="color:#8b5cf6;">
            ${t("manual_label2")}: ${manualParts.length} — €${manualTotal.toFixed(4)}/${currentLang === "de" ? "Platine" : "board"}
        </span>` : ""}
        ${rfqParts.length > 0 ? `
        <span style="color:#f59e0b;">
            ${t("rfq_label")}: ${rfqParts.length} — ${t("parts_excluded")}
        </span>` : ""}
        ${unpricedParts.length > 0 ? `
        <span style="color:#ef4444;">
            ${t("unpriced_label")}: ${unpricedParts.length}
        </span>` : ""}
        <span style="margin-left:auto;color:#e8ecf4;font-weight:700;font-size:13px;">
            ${t("total_per_board")} €${grandTotal.toFixed(4)}
            ${rfqParts.length + unpricedParts.length > 0
                ? `<span style="color:#f59e0b;font-size:10px;"> ${t("incomplete")}</span>`
                : `<span style="color:#22c55e;font-size:10px;"> ${t("complete")}</span>`}
        </span>`;
}


// ── ISSUES ──
function renderIssues() {
    const container = document.getElementById("issues-list");
    if (!container) return;
    if (bomIssues.length === 0) {
        container.innerHTML = `<p style="color:#22c55e;padding:12px 0;">${t("no_issues")}</p>`;
        return;
    }
    container.innerHTML = bomIssues.map(i => `
        <div class="issue-item ${i.type === "error" ? "issue-error" : "issue-warn"}">
            <span>${i.type === "error" ? "🔴" : "🟡"}</span>
            <span>${i.message}</span>
        </div>
    `).join("");
}


// ── FETCH LIVE PRICES ──
async function enrichBOM() {
    const btn       = document.getElementById("enrich-btn");
    const status    = document.getElementById("enrich-status");
    const board_qty = parseInt(document.getElementById("board-qty").value) || 1;

    // Save manual/rfq overrides before re-fetching
    const overrides = {};
    bomData.forEach((row, idx) => {
        const state = getPriceState(row);
        if (state === "manual" || state === "rfq") {
            overrides[row.mpn] = {
                price_state:  state,
                manual_price: row.manual_price || null,
            };
        }
    });

    btn.disabled    = true;
    btn.textContent = "⏳ Fetching prices...";
    status.textContent = `Looking up ${bomData.length} parts × ${board_qty} boards...`;

    try {
        const res = await fetch(`${BACKEND_URL}/enrich-bom`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ bom: bomData, board_qty }),
        });

        const data = await res.json();
        if (data.error) { status.textContent = "Error: " + data.error; return; }

        bomData = data.bom;

        // Restore manual/rfq overrides after fetch

        // Preserve from_cache flag returned by backend
        bomData.forEach(row => {
            if (row.from_cache === undefined) row.from_cache = false;
        });
        
        bomData.forEach((row, idx) => {
            const ov = overrides[row.mpn];
            if (!ov) return;
            if (ov.price_state === "rfq") {
                setRFQ(idx);
            } else if (ov.price_state === "manual" && ov.manual_price) {
                // back up the fresh auto price
                row.unit_price_backup  = row.unit_price;
                row.per_board_backup   = row.per_board_cost;
                row.extended_backup    = row.extended_price;
                row.supplier_backup    = row.nexar_supplier;
                row.nexar_price_backup = row.nexar_price;
                setManualPrice(idx, ov.manual_price);
            }
        });

        recomputeTotals();
        renderBOMTable();
        updateQuotation();

        const found      = bomData.filter(r => r.nexar_price && getPriceState(r) !== "rfq").length;
        const manualCount = bomData.filter(r => getPriceState(r) === "manual").length;
        const rfqCount   = bomData.filter(r => getPriceState(r) === "rfq").length;
        const cacheHits  = bomData.filter(r => r.from_cache).length;
        const fetched    = bomData.filter(r => r.nexar_price && !r.from_cache).length;
        status.textContent =
            `✅ ${fetched} fetched | 💾 ${cacheHits} from cache | ${manualCount} manual | ${rfqCount} RFQ | ×${board_qty} boards`;

    } catch (err) {
        status.textContent = "Could not reach Flask: " + err.message;
    }

    btn.disabled    = false;
    btn.textContent = "🔍 Fetch Live Prices";
}


// ── QUOTATION CALC ──
// ALWAYS call recomputeTotals() before this so bomCostPerBoard is fresh
function updateQuotation() {
    // Always recompute from live bomData — never trust a cached value
    recomputeTotals();

    const board_qty = parseFloat(document.getElementById("board-qty").value)    || 1;
    const asm       = parseFloat(document.getElementById("assembly-cost").value) || 0;
    const margin    = parseFloat(document.getElementById("margin").value)        || 0;

    document.getElementById("q-qty-label").textContent    = board_qty;
    document.getElementById("q-margin-label").textContent = margin;

    // Part states
    const rfqParts      = bomData.filter(r => r.dnp !== "Y" && getPriceState(r) === "rfq");
    const unpricedParts = bomData.filter(r => r.dnp !== "Y" && getPriceState(r) === "unpriced");
    const manualParts   = bomData.filter(r => r.dnp !== "Y" && getPriceState(r) === "manual");
    const missingCount  = rfqParts.length + unpricedParts.length;

    const compPerBoard = bomCostPerBoard;
    const subPerBoard  = compPerBoard + asm;
    const markupPB     = subPerBoard * (margin / 100);
    const sellPerBoard = subPerBoard + markupPB;

    const fmt = n => `€${n.toFixed(2)}`;

    document.getElementById("q-bom-unit").textContent     = fmt(compPerBoard);
    document.getElementById("q-bom-total").textContent    = fmt(compPerBoard * board_qty);
    document.getElementById("q-asm-unit").textContent     = fmt(asm);
    document.getElementById("q-asm-total").textContent    = fmt(asm * board_qty);
    document.getElementById("q-sub-unit").textContent     = fmt(subPerBoard);
    document.getElementById("q-sub-total").textContent    = fmt(subPerBoard * board_qty);
    document.getElementById("q-markup-unit").textContent  = fmt(markupPB);
    document.getElementById("q-markup-total").textContent = fmt(markupPB * board_qty);
    document.getElementById("q-sell-unit").textContent    = fmt(sellPerBoard);
    document.getElementById("q-sell-total").textContent   = fmt(sellPerBoard * board_qty);

    // Show quotation completeness warning
    let warningEl = document.getElementById("q-completeness-warning");
    if (!warningEl) {
        warningEl = document.createElement("div");
        warningEl.id = "q-completeness-warning";
        warningEl.style.cssText = "margin-top:12px;padding:10px 14px;border-radius:6px;font-size:12px;";
        const sellRow = document.getElementById("q-sell-unit")?.closest("tr")?.parentElement;
        if (sellRow) sellRow.after(warningEl);
    }

    if (missingCount > 0) {
        // Build detailed lists with ref designators
        const rfqList = rfqParts.map(r =>
            `<li style="margin-bottom:3px;">
                <span style="color:#f59e0b;font-family:monospace;">${r.mpn}</span>
                <span style="color:#4a5570;"> — ${r.ref || ""} — ${r.description || ""}</span>
                <span style="color:#f59e0b;font-size:10px;margin-left:6px;">📋 RFQ</span>
            </li>`
        ).join("");
        const unpList = unpricedParts.map(r =>
            `<li style="margin-bottom:3px;">
                <span style="color:#ef4444;font-family:monospace;">${r.mpn}</span>
                <span style="color:#4a5570;"> — ${r.ref || ""} — ${r.description || ""}</span>
                <span style="color:#ef4444;font-size:10px;margin-left:6px;">❌ No price</span>
            </li>`
        ).join("");

        warningEl.style.background = "rgba(245,158,11,0.08)";
        warningEl.style.border     = "1px solid #f59e0b44";
        warningEl.innerHTML = `
            <div style="color:#f59e0b;font-weight:700;margin-bottom:8px;font-size:13px;">
                ⚠ Quotation incomplete — ${missingCount} part${missingCount > 1 ? "s" : ""} excluded from component total
            </div>
            <div style="color:#8a93b0;font-size:11px;margin-bottom:8px;">
                Component cost shown (€${compPerBoard.toFixed(4)}/board) does NOT include the parts below.
                Go to the <strong style="color:#4f8fff;cursor:pointer;" onclick="showTab('bom')">BOM tab</strong>
                to enter manual prices or confirm RFQ status.
            </div>
            ${rfqParts.length > 0 ? `
            <div style="color:#f59e0b;font-weight:600;margin-bottom:4px;">
                📋 Awaiting RFQ (${rfqParts.length}):
            </div>
            <ul style="margin:0 0 10px 16px;padding:0;list-style:disc;">${rfqList}</ul>` : ""}
            ${unpricedParts.length > 0 ? `
            <div style="color:#ef4444;font-weight:600;margin-bottom:4px;">
                ❌ No price found on any supplier (${unpricedParts.length}):
            </div>
            <ul style="margin:0 0 6px 16px;padding:0;list-style:disc;">${unpList}</ul>` : ""}`;
    } else if (manualParts.length > 0) {
        warningEl.style.background = "rgba(139,92,246,0.08)";
        warningEl.style.border     = "1px solid #8b5cf644";
        const manList = manualParts.map(r =>
            `<li><span style="color:#c4b5fd;font-family:monospace;">${r.mpn}</span>
             <span style="color:#4a5570;"> — €${Number(r.unit_price).toFixed(4)}/unit</span></li>`
        ).join("");
        warningEl.innerHTML = `
            <div style="color:#8b5cf6;font-weight:600;margin-bottom:6px;">
                ✍ ${manualParts.length} part${manualParts.length > 1 ? "s use" : " uses"} manually entered prices
            </div>
            <ul style="margin:0 0 6px 16px;padding:0;list-style:disc;font-size:11px;">${manList}</ul>
            <div style="color:#8a93b0;font-size:11px;">Verify these prices before sending to customer.</div>`;
    } else {
        warningEl.style.background = "rgba(34,197,94,0.08)";
        warningEl.style.border     = "1px solid #22c55e44";
        warningEl.innerHTML = `<div style="color:#22c55e;font-weight:600;">
            ✅ Quotation complete — all ${bomData.filter(r=>r.dnp!=="Y").length} active parts priced
        </div>`;
    }
}


function getQuotePayload() {
    const rfqParts = bomData.filter(r => r.dnp !== "Y" && getPriceState(r) === "rfq")
                            .map(r => r.mpn);
    return {
        bom:          bomData,
        customer:     document.getElementById("customer-name").value,
        project:      document.getElementById("project-name").value,
        ref:          document.getElementById("quote-ref").value,
        qty:          document.getElementById("board-qty").value,
        asm:          document.getElementById("assembly-cost").value,
        margin:       document.getElementById("margin").value,
        bom_cost:     bomCostPerBoard,
        asm_cost:     parseFloat(document.getElementById("assembly-cost").value) || 0,
        rfq_parts:    rfqParts,
    };
}


// ── EXPORT EXCEL ──
async function exportExcel() {
    const res  = await fetch(`${BACKEND_URL}/export-quote`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getQuotePayload()),
    });
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "quotation.xlsx"; a.click();
    URL.revokeObjectURL(url);
}


// ── EXPORT PDF ──
async function exportPDF() {
    const payload = {
        ...getQuotePayload(),
        ai_description: document.getElementById("quote-ai-output").textContent || ""
    };
    const res  = await fetch(`${BACKEND_URL}/export-pdf`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "quotation.pdf"; a.click();
    URL.revokeObjectURL(url);
}


// ── SMT CHECK ──
async function runSMTCheck() {
    const status = document.getElementById("enrich-status");
    status.textContent = "Running SMT check...";
    try {
        const res = await fetch(`${BACKEND_URL}/check-smt`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ bom: bomData }),
        });
        smtData = await res.json();
        renderSMTTab();
        showTab("smt");
        status.textContent = `✅ SMT: ${smtData.overall}`;
    } catch { status.textContent = "SMT check failed."; }
}

function renderSMTTab() {
    if (!smtData) return;
    const colors = { "FEASIBLE": "#22c55e", "FEASIBLE WITH CARE": "#f59e0b", "COMPLEX": "#ef4444" };
    const col = colors[smtData.overall] || "#8a93b0";
    document.getElementById("smt-overall").innerHTML = `
        <div style="padding:14px 18px;background:rgba(255,255,255,0.05);border-radius:8px;border-left:4px solid ${col};">
            <div style="font-size:16px;font-weight:700;color:${col};">${smtData.overall}</div>
            <div style="font-size:13px;color:#e8ecf4;margin-top:4px;">${smtData.overall_msg}</div>
        </div>`;
    const s = smtData.summary;
    document.getElementById("smt-summary").innerHTML = `
        <div class="stat-card"><div class="stat-label">LOW RISK</div><div class="stat-value green">${s.LOW||0}</div></div>
        <div class="stat-card"><div class="stat-label">MEDIUM RISK</div><div class="stat-value amber">${s.MEDIUM||0}</div></div>
        <div class="stat-card"><div class="stat-label">HIGH RISK</div><div class="stat-value red">${s.HIGH||0}</div></div>
        <div class="stat-card"><div class="stat-label">MISSING PKG</div><div class="stat-value red">${s.missing||0}</div></div>`;
    const tbody = document.getElementById("smt-table-body");
    tbody.innerHTML = "";
    smtData.results.forEach(row => {
        const rc = { LOW: "#22c55e", MEDIUM: "#f59e0b", HIGH: "#ef4444" }[row.risk] || "#8a93b0";
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="mono">${row.ref}</td><td>${row.description}</td>
            <td class="mono small">${row.mpn}</td><td class="mono">${row.package}</td>
            <td class="mono">${row.qty}</td>
            <td><span class="badge" style="background:${rc}22;color:${rc};">${row.risk}</span></td>
            <td style="font-size:12px;color:#8a93b0;">${row.reason}</td>`;
        tbody.appendChild(tr);
    });
}


// ── DRAFT EMAIL ──
async function draftEmail() {
    const out       = document.getElementById("email-output");
    const board_qty = parseFloat(document.getElementById("board-qty").value)    || 1;
    const asm       = parseFloat(document.getElementById("assembly-cost").value) || 0;
    const margin    = parseFloat(document.getElementById("margin").value)        || 0;
    const sellPB    = (bomCostPerBoard + asm) * (1 + margin / 100);
    const rfqParts  = bomData.filter(r => r.dnp !== "Y" && getPriceState(r) === "rfq");

    out.textContent   = "Drafting email...";
    out.style.display = "block";

    const res = await fetch(`${BACKEND_URL}/draft-email`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            customer:        document.getElementById("customer-name").value,
            project:         document.getElementById("project-name").value,
            ref:             document.getElementById("quote-ref").value,
            qty:             board_qty,
            sell_unit:       sellPB,
            sell_total:      sellPB * board_qty,
            bom_lines:       bomData.length,
            rfq_count:       rfqParts.length,
            rfq_parts:       rfqParts.map(r => r.mpn),
            high_risk_count: smtData ? smtData.summary.HIGH || 0 : 0,
        }),
    });
    const data = await res.json();
    out.textContent = data.email || data.error;
    document.getElementById("copy-email-btn").style.display = "block";
}

function copyEmail() {
    navigator.clipboard.writeText(document.getElementById("email-output").textContent);
    document.getElementById("copy-email-btn").textContent = "✅ Copied!";
    setTimeout(() => document.getElementById("copy-email-btn").textContent = "📋 Copy Email", 2000);
}

function copyAgentEmail() {
    navigator.clipboard.writeText(document.getElementById("agent-email").textContent);
}


// ── AI ASSISTANT ──
async function askAI() {
    const input  = document.getElementById("ai-input");
    const output = document.getElementById("ai-output");
    const q      = input.value.trim();
    if (!q) return;
    output.textContent   = "Thinking...";
    output.style.display = "block";
    const bomSummary = bomData.slice(0, 15).map(r =>
        `${r.ref||""}: ${r.description||""} | MPN:${r.mpn||""} | ${r.manufacturer||""} | Qty:${r.qty||0}`
    ).join("\n");
    try {
        const res  = await fetch(`${BACKEND_URL}/ask-ai`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question: q, bom_summary: bomSummary }),
        });
        const data = await res.json();
        output.textContent = data.error ? "Error: " + data.error : data.answer;
    } catch { output.textContent = "Could not reach Flask."; }
}

function explainComponent(index) {
    const row = bomData[index];
    if (!row) return;
    showTab("ai");
    document.getElementById("ai-input").value =
        `Explain this component and suggest a cheaper alternative: ${row.description||""} (MPN: ${row.mpn||""}, made by ${row.manufacturer||""}, package: ${row.package||""})`;
    askAI();
}

function renderAIComponentList() {
    const container = document.getElementById("ai-component-list");
    if (!container) return;
    container.innerHTML = bomData.filter(r => r.dnp !== "Y").map(row => `
        <div class="ai-comp-item">
            <span class="mono small">${row.ref||""}</span>
            <span>${row.description||""}</span>
            <span class="mono small">${row.mpn||""}</span>
            <button class="btn-ai-small" onclick="explainComponent(${bomData.indexOf(row)})">Explain</button>
        </div>
    `).join("");
}

async function generateQuoteDescription() {
    const board_qty = document.getElementById("board-qty").value;
    const asm       = document.getElementById("assembly-cost").value;
    const mg        = document.getElementById("margin").value;
    const sellPB    = (bomCostPerBoard + parseFloat(asm)) * (1 + parseFloat(mg) / 100);
    const out       = document.getElementById("quote-ai-output");
    out.textContent   = "Generating...";
    out.style.display = "block";
    const res = await fetch(`${BACKEND_URL}/ask-ai`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            question: `Write a 3-sentence professional EMS quotation description. Customer: ${document.getElementById("customer-name").value}, Project: ${document.getElementById("project-name").value}, Qty: ${board_qty} boards, BOM cost: €${bomCostPerBoard.toFixed(4)}/board, Assembly: €${asm}/board, Sell: €${sellPB.toFixed(2)}/board.`,
            bom_summary: "",
        }),
    });
    const data = await res.json();
    out.textContent = data.answer || data.error;
}

function setQ(text) {
    document.getElementById("ai-input").value = text;
    askAI();
}


// ── FULL AGENT ──
async function runFullAgent() {
    if (!lastFilePath) { alert("Upload a BOM file first."); return; }
    const btn = document.getElementById("agent-btn");
    btn.disabled    = true;
    btn.textContent = "⏳ Agent running...";
    document.getElementById("agent-progress-card").classList.remove("hidden");
    document.getElementById("agent-results-card").classList.add("hidden");
    document.getElementById("agent-steps").innerHTML = "";
    try {
        const res = await fetch(`${BACKEND_URL}/run-agent`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                filepath: lastFilePath,
                customer: document.getElementById("customer-name").value,
                project:  document.getElementById("project-name").value,
                ref:      document.getElementById("quote-ref").value,
                qty:      parseFloat(document.getElementById("board-qty").value) || 100,
                asm_cost: parseFloat(document.getElementById("assembly-cost").value) || 8.5,
                margin:   parseFloat(document.getElementById("margin").value) || 20,
            }),
        });
        const data = await res.json();
        const stepsEl = document.getElementById("agent-steps");
        (data.steps || []).forEach(s => {
            const icon = s.status === "done" ? "✅" : s.status === "error" ? "❌" : "⏳";
            stepsEl.innerHTML += `
                <div style="padding:10px 14px;border-bottom:1px solid #1e2336;display:flex;gap:10px;align-items:center;">
                    <span>${icon}</span><span style="font-size:13px;">Step ${s.step}: ${s.message}</span>
                </div>`;
        });
        if (data.quote) {
            const q = data.quote;
            document.getElementById("agent-quote-summary").innerHTML = `
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                    <div class="stat-card"><div class="stat-label">BOM Cost/Board</div><div class="stat-value accent">€${q.bom_cost.toFixed(4)}</div></div>
                    <div class="stat-card"><div class="stat-label">Sell Price/Board</div><div class="stat-value green">€${q.sell_unit.toFixed(2)}</div></div>
                    <div class="stat-card"><div class="stat-label">Total Value</div><div class="stat-value green">€${q.sell_total.toFixed(2)}</div></div>
                    <div class="stat-card"><div class="stat-label">Margin</div><div class="stat-value amber">${document.getElementById("margin").value}%</div></div>
                </div>`;
        }
        if (data.smt) {
            const s = data.smt;
            document.getElementById("agent-smt-summary").innerHTML = `
                <div style="padding:12px;background:rgba(255,255,255,0.05);border-radius:6px;">
                    <strong>${s.overall}</strong> — ${s.overall_msg}
                    <div style="margin-top:6px;font-size:12px;color:#8a93b0;">
                        Low: ${s.summary.LOW||0} | Medium: ${s.summary.MEDIUM||0} | High: ${s.summary.HIGH||0}
                    </div>
                </div>`;
        }
        if (data.email) {
            agentEmailText = data.email;
            document.getElementById("agent-email").textContent = data.email;
        }
        if (data.prices) {
            bomData         = data.prices;
            recomputeTotals();
            renderBOMTable();
            updateQuotation();
        }
        document.getElementById("agent-results-card").classList.remove("hidden");
    } catch (err) {
        document.getElementById("agent-steps").innerHTML +=
            `<div style="color:#ef4444;padding:12px;">Error: ${err.message}</div>`;
    }
    btn.disabled    = false;
    btn.textContent = "🚀 Run Full Agent";
}


// ── TAB SWITCHER ──
function showTab(name) {
    document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
    const target = document.getElementById("tab-" + name);
    if (target) target.classList.remove("hidden");
    const names = ["bom", "issues", "smt", "quote", "ai", "agent"];
    document.querySelectorAll(".tab").forEach((btn, i) => {
        btn.classList.toggle("active", names[i] === name);
    });
    // Always refresh quotation when switching to it
    if (name === "quote") updateQuotation();
}


// ── RESET ──
function resetApp() {
    bomData = []; bomStats = {}; bomIssues = [];
    bomTotalCost = 0; bomCostPerBoard = 0;
    smtData = null; lastFilePath = "";
    document.getElementById("app-screen").classList.add("hidden");
    document.getElementById("upload-screen").classList.remove("hidden");
    document.getElementById("header-file").textContent = "No file loaded";
    document.getElementById("file-input").value = "";
    document.getElementById("bom-table-body").innerHTML = "";
    const bar = document.getElementById("price-summary-bar");
    if (bar) bar.remove();
    showTab("bom");
}