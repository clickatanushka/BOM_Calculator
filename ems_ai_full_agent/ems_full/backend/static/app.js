const BACKEND_URL = "http://localhost:5000";

let bomData           = [];
let bomStats          = {};
let bomIssues         = [];
let bomTotalCost      = 0;
let bomCostPerBoard   = 0;
let smtData           = null;
let lastFilePath      = "";
let agentEmailText    = "";

// ── INIT ──
document.addEventListener("DOMContentLoaded", () => {
    // Inject table-layout:fixed CSS so headers and data columns stay perfectly aligned
    const _style = document.createElement("style");
    _style.textContent = `
        #bom-table, .bom-table {
            table-layout: fixed !important;
            width: 100%;
            border-collapse: collapse;
        }
        #bom-table colgroup, .bom-table colgroup { display: none; }
        #bom-table thead th, .bom-table thead th {
            box-sizing: border-box;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            padding: 6px 5px;
            font-size: 11px;
            letter-spacing: 0.04em;
        }
        #bom-table tbody td, .bom-table tbody td {
            box-sizing: border-box;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            padding: 5px;
            font-size: 12px;
            vertical-align: middle;
        }
    `;
    document.head.appendChild(_style);

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
    if (row.price_state) return row.price_state;
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
// Column widths — must match the <thead> in your HTML exactly
const COL_W = {
    "#":           { w: "28px",  a: "center" },
    ref:           { w: "110px", a: "left"   },
    description:   { w: "160px", a: "left"   },
    mpn:           { w: "150px", a: "left"   },
    mfr:           { w: "90px",  a: "left"   },
    package:       { w: "80px",  a: "left"   },
    qty:           { w: "36px",  a: "center" },
    unit:          { w: "130px", a: "left"   },
    dk_price:      { w: "80px",  a: "right"  },
    total_price:   { w: "80px",  a: "right"  },
    seller:        { w: "75px",  a: "left"   },
    ai:            { w: "150px", a: "left"   },
    status:        { w: "70px",  a: "center" },
    action:        { w: "58px",  a: "center" },
};

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
        tbody.innerHTML = `<tr><td colspan="15" style="text-align:center;padding:24px;opacity:0.5;">No components found</td></tr>`;
        renderPriceSummaryBar();
        return;
    }

    filtered.forEach(row => {
        const globalIdx = bomData.indexOf(row);
        const state     = getPriceState(row);
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
       // ── STATUS BADGE — stock-based (matches old UI) ──
        let statusBadge;
        if (row.dnp === "Y") {
            statusBadge = `<span class="badge badge-dnp">DNP</span>`;
        } else if (state === "rfq") {
            statusBadge = `<span class="badge" style="background:#f59e0b22;color:#f59e0b;font-size:11px;">📋 RFQ</span>`;
        } else if (state === "unpriced") {
            statusBadge = `<span class="badge badge-warn">No Price</span>`;
        } else {
            // Stock-based: green check if in stock, red OUT if out of stock
            const stock = row.nexar_stock;
            if (stock == null) {
                statusBadge = `<span class="badge" style="background:#4a557022;color:#8a93b0;">—</span>`;
            } else if (stock > 0) {
                statusBadge = `<span class="badge badge-ok" style="background:#22c55e22;color:#22c55e;font-size:15px;padding:2px 8px;">✓</span>`;
            } else {
                statusBadge = `<span class="badge" style="background:#ef444422;color:#ef4444;font-weight:700;">OUT</span>`;
            }
        }

        // ── WARNINGS ──
        const belowMinWarn = row.below_minimum && state === "auto"
            ? `<span title="qty below supplier MOQ" style="color:#f59e0b;font-size:10px;"> ⚠MOQ</span>` : "";
        const cheaperOosWarn = row.cheaper_oos && state === "auto"
            ? `<span title="cheaper supplier OOS" style="color:#a78bfa;font-size:10px;"> 💜OOS</span>` : "";

        // ── UNIT PRICE CELL ──
        let unitPriceCell;
        if (state === "auto") {
            unitPriceCell = `
                <span style="color:#e8ecf4;font-family:monospace;">€${Number(row.unit_price).toFixed(4)}</span>
                ${belowMinWarn}${cheaperOosWarn}
                <div style="margin-top:4px;">
                    <button onclick="showManualInput(${globalIdx})" 
                        style="font-size:9px;padding:1px 5px;background:#1e2336;border:1px solid #2d3555;
                               color:#8a93b0;border-radius:3px;cursor:pointer;">✏ override</button>
                    <button onclick="setRFQ(${globalIdx})"
                        style="font-size:9px;padding:1px 5px;background:#1e2336;border:1px solid #2d3555;
                               color:#f59e0b;border-radius:3px;cursor:pointer;margin-left:2px;">📋 RFQ</button>
                </div>`;
        } else if (state === "manual") {
            unitPriceCell = `
                <input id="manual-input-${globalIdx}" type="number" step="0.0001" min="0"
                    value="${row.manual_price || ''}"
                    onchange="setManualPrice(${globalIdx}, this.value)"
                    style="width:80px;background:#1a1f35;border:1px solid #8b5cf6;color:#c4b5fd;
                           border-radius:4px;padding:2px 6px;font-size:12px;font-family:monospace;"/>
                <span style="color:#8b5cf6;font-size:10px;"> ✍MANUAL</span>
                <div style="margin-top:4px;">
                    <button onclick="clearManual(${globalIdx})"
                        style="font-size:9px;padding:1px 5px;background:#1e2336;border:1px solid #2d3555;
                               color:#ef4444;border-radius:3px;cursor:pointer;">✕ clear</button>
                    <button onclick="setRFQ(${globalIdx})"
                        style="font-size:9px;padding:1px 5px;background:#1e2336;border:1px solid #2d3555;
                               color:#f59e0b;border-radius:3px;cursor:pointer;margin-left:2px;">📋 RFQ</button>
                </div>`;
        } else if (state === "rfq") {
            unitPriceCell = `
                <span style="color:#f59e0b;font-size:11px;">📋 Awaiting quote</span>
                <div style="margin-top:4px;">
                    <button onclick="showManualInput(${globalIdx})"
                        style="font-size:9px;padding:1px 5px;background:#1e2336;border:1px solid #2d3555;
                               color:#8b5cf6;border-radius:3px;cursor:pointer;">✍ enter price</button>
                    <button onclick="clearManual(${globalIdx})"
                        style="font-size:9px;padding:1px 5px;background:#1e2336;border:1px solid #2d3555;
                               color:#4a5570;border-radius:3px;cursor:pointer;margin-left:2px;">✕ clear</button>
                </div>`;
        } else {
            unitPriceCell = `
                <input id="manual-input-${globalIdx}" type="number" step="0.0001" min="0"
                    placeholder="enter €"
                    onchange="setManualPrice(${globalIdx}, this.value)"
                    style="width:80px;background:#1a1f35;border:1px solid #2d3555;color:#e8ecf4;
                           border-radius:4px;padding:2px 6px;font-size:12px;font-family:monospace;"/>
                <div style="margin-top:4px;">
                    <button onclick="setRFQ(${globalIdx})"
                        style="font-size:9px;padding:1px 5px;background:#1e2336;border:1px solid #f59e0b;
                               color:#f59e0b;border-radius:3px;cursor:pointer;">📋 mark RFQ</button>
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

        // ── SELLER (formerly supplier/mount) ──
        const supplierLabel = state === "manual"
            ? `<span style="font-size:11px;color:#8b5cf6;font-family:monospace;">MANUAL</span>`
            : state === "rfq"
                ? `<span style="font-size:11px;color:#f59e0b;font-family:monospace;">RFQ</span>`
                : row.nexar_supplier
                    ? `<span style="font-size:11px;color:#4f8fff;font-family:monospace;">${row.nexar_supplier}</span>`
                    : "—";

        // ── TOTAL PRICE (formerly stock) ──
        const stock = state === "manual" || state === "rfq"
            ? "—"
            : row.nexar_stock != null
                ? (row.nexar_stock > 0
                    ? `<span style="color:#22c55e;">${Number(row.nexar_stock).toLocaleString()}</span>`
                    : `<span style="color:#ef4444;">OUT</span>`)
                : "—";

        // ── ALL SUPPLIERS (AI column — compact) ──
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
                    ${s.url
                        ? `<a href="${s.url}" target="_blank" style="color:#8a93b0;text-decoration:none;">${s.supplier} ↗</a>:`
                        : `<span style="color:#8a93b0;">${s.supplier}:</span>`
                    }
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

        // Cell style — widths match HTML <thead> exactly
        const cs = (col) => {
            const c = COL_W[col];
            return 'style="width:' + c.w + ';min-width:' + c.w + ';max-width:' + c.w + ';' +
                   'text-align:' + c.a + ';overflow:hidden;white-space:nowrap;' +
                   'text-overflow:ellipsis;vertical-align:middle;padding:5px;"';
        };

        // REF: truncate with full value in tooltip (avoids huge row heights from wrapping)
        const refDisplay = (row.ref || "—").length > 18
            ? `<span title="${row.ref||""}" style="font-size:11px;">${(row.ref||"").slice(0,16)}…</span>`
            : `<span title="${row.ref||""}">${row.ref || "—"}</span>`;

        // Description: truncate with tooltip
        const descDisplay = '<span title="' + (row.description||"") + '">' + (row.description || "—") + '</span>';

        // MPN: truncate with tooltip
        const mpnDisplay = '<span title="' + (row.mpn||"") + '">' + (row.mpn || "—") + '</span>';
        if (row.nexar_url) console.log("HAS URL:", row.mpn, row.nexar_url);

        tr.innerHTML =
            '<td ' + cs("#")         + '>' + (row.id || "") + '</td>' +
            '<td class="mono" '      + cs("ref")         + '>' + refDisplay  + '</td>' +
            '<td '                   + cs("description") + '>' + descDisplay + '</td>' +
            '<td class="mono small" '+ cs("mpn") + '>' + 
                (row.nexar_url 
                    ? '<a href="' + row.nexar_url + '" target="_blank" style="color:#4f8fff;text-decoration:none;" title="View on ' + (row.nexar_supplier||'supplier') + '">' + (row.mpn||"—") + ' ↗</a>'
                    : (row.mpn || "—")
                ) + 
            '</td>' +
            '<td '                   + cs("mfr")         + ' title="' + (row.manufacturer||"") + '">' + (row.manufacturer || "—") + '</td>' +
            '<td class="mono small" '+ cs("package")     + ' title="' + (row.package||"") + '">' + (row.package || "—") + '</td>' +
            '<td class="mono" '      + cs("qty")         + '>' + (row.qty || 0) + '</td>' +
            '<td style="width:130px;min-width:130px;max-width:130px;vertical-align:middle;padding:5px;overflow:visible;white-space:normal;">' + unitPriceCell + '</td>' +
            '<td class="mono" '      + cs("dk_price")    + '>' + perBoard     + '</td>' +
            '<td class="mono" '      + cs("total_price") + '>' + extended     + '</td>' +
            '<td '                   + cs("seller")      + '>' + supplierLabel + '</td>' +
            '<td style="width:150px;min-width:150px;max-width:150px;vertical-align:top;padding:5px;overflow:hidden;white-space:normal;">' + allSuppliers + '</td>' +
            '<td '                   + cs("status")      + '>' + statusBadge  + '</td>' +
            '<td '                   + cs("action")      + '><button class="btn-ai-small" onclick="explainComponent(' + globalIdx + ')">Ask AI</button></td>';
        tbody.appendChild(tr);
    });

    renderPriceSummaryBar();
}

// Show the manual input field on a row that currently shows "override" button
function showManualInput(idx) {
    const row = bomData[idx];
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


// ── PRICE SUMMARY BAR ──
function renderPriceSummaryBar() {
    const boardQty = parseInt(document.getElementById("board-qty").value) || 1;

    const autoParts    = bomData.filter(r => r.dnp !== "Y" && getPriceState(r) === "auto");
    const manualParts  = bomData.filter(r => r.dnp !== "Y" && getPriceState(r) === "manual");
    const rfqParts     = bomData.filter(r => r.dnp !== "Y" && getPriceState(r) === "rfq");
    const unpricedParts = bomData.filter(r => r.dnp !== "Y" && getPriceState(r) === "unpriced");

    const autoTotal   = autoParts.reduce((s, r)   => s + (r.per_board_cost || 0), 0);
    const manualTotal = manualParts.reduce((s, r)  => s + (r.per_board_cost || 0), 0);
    const grandTotal  = autoTotal + manualTotal;

    const totalEl = document.getElementById("bom-total");
    if (totalEl) {
        totalEl.innerHTML = rfqParts.length > 0 || unpricedParts.length > 0
            ? `€${bomTotalCost.toFixed(2)} <span style="color:#f59e0b;font-size:11px;">
                ⚠ ${rfqParts.length + unpricedParts.length} parts excluded</span>`
            : `€${bomTotalCost.toFixed(2)}`;
    }

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
        <span style="color:#8a93b0;">Price coverage:</span>
        <span style="color:#22c55e;">
            ✓ Auto: ${autoParts.length} parts — €${autoTotal.toFixed(4)}/board
        </span>
        ${manualParts.length > 0 ? `
        <span style="color:#8b5cf6;">
            ✍ Manual: ${manualParts.length} parts — €${manualTotal.toFixed(4)}/board
        </span>` : ""}
        ${rfqParts.length > 0 ? `
        <span style="color:#f59e0b;">
            📋 RFQ: ${rfqParts.length} parts — excluded from total
        </span>` : ""}
        ${unpricedParts.length > 0 ? `
        <span style="color:#ef4444;">
            ❌ Unpriced: ${unpricedParts.length} parts
        </span>` : ""}
        <span style="margin-left:auto;color:#e8ecf4;font-weight:700;font-size:13px;">
            Total/board: €${grandTotal.toFixed(4)}
            ${rfqParts.length + unpricedParts.length > 0
                ? `<span style="color:#f59e0b;font-size:10px;"> (incomplete)</span>`
                : `<span style="color:#22c55e;font-size:10px;"> ✓ complete</span>`}
        </span>`;
}


// ── ISSUES ──
function renderIssues() {
    const container = document.getElementById("issues-list");
    if (!container) return;
    if (bomIssues.length === 0) {
        container.innerHTML = `<p style="color:#22c55e;padding:12px 0;">✅ No issues found.</p>`;
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

        bomData.forEach((row, idx) => {
            const ov = overrides[row.mpn];
            if (!ov) return;
            if (ov.price_state === "rfq") {
                setRFQ(idx);
            } else if (ov.price_state === "manual" && ov.manual_price) {
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

        const found = bomData.filter(r => r.nexar_price && getPriceState(r) !== "rfq").length;
        const manualCount = bomData.filter(r => getPriceState(r) === "manual").length;
        const rfqCount    = bomData.filter(r => getPriceState(r) === "rfq").length;
        status.textContent =
            `✅ ${found} auto-priced | ${manualCount} manual | ${rfqCount} RFQ | ×${board_qty} boards`;

    } catch (err) {
        status.textContent = "Could not reach Flask: " + err.message;
    }

    btn.disabled    = false;
    btn.textContent = "🔍 Fetch Live Prices";
}


// ── QUOTATION CALC ──
function updateQuotation() {
    recomputeTotals();

    const board_qty = parseFloat(document.getElementById("board-qty").value)    || 1;
    const asm       = parseFloat(document.getElementById("assembly-cost").value) || 0;
    const margin    = parseFloat(document.getElementById("margin").value)        || 0;

    document.getElementById("q-qty-label").textContent    = board_qty;
    document.getElementById("q-margin-label").textContent = margin;

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

    let warningEl = document.getElementById("q-completeness-warning");
    if (!warningEl) {
        warningEl = document.createElement("div");
        warningEl.id = "q-completeness-warning";
        warningEl.style.cssText = "margin-top:12px;padding:10px 14px;border-radius:6px;font-size:12px;";
        const sellRow = document.getElementById("q-sell-unit")?.closest("tr")?.parentElement;
        if (sellRow) sellRow.after(warningEl);
    }

    if (missingCount > 0) {
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
    const names = ["bom", "issues", "smt", "quote", "ai", "agent", "feasibility", "pcb", "programming"];
    document.querySelectorAll(".tab").forEach((btn, i) => {
        btn.classList.toggle("active", names[i] === name);
    });
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