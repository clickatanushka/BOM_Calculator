// const BACKEND_URL = "http://localhost:5000";

// let bomData        = [];
// let bomStats       = {};
// let bomIssues      = [];
// let bomTotalCost   = 0;
// let smtData        = null;
// let lastFilePath   = "";
// let agentEmailText = "";

// // ── INIT ──
// document.addEventListener("DOMContentLoaded", () => {
//     document.getElementById("file-input")
//         .addEventListener("change", (e) => {
//             if (e.target.files[0]) uploadBOM(e.target.files[0]);
//         });

//     const dz = document.getElementById("drop-zone");
//     dz.addEventListener("dragover",  (e) => { e.preventDefault(); dz.classList.add("drag-over"); });
//     dz.addEventListener("dragleave", ()  => dz.classList.remove("drag-over"));
//     dz.addEventListener("drop", (e) => {
//         e.preventDefault();
//         dz.classList.remove("drag-over");
//         if (e.dataTransfer.files[0]) uploadBOM(e.dataTransfer.files[0]);
//     });

//     document.getElementById("search-box")  .addEventListener("input",  renderBOMTable);
//     document.getElementById("mount-filter").addEventListener("change", renderBOMTable);
//     document.getElementById("dnp-filter")  .addEventListener("change", renderBOMTable);
//     document.getElementById("ai-input")    .addEventListener("keydown", (e) => { if (e.key === "Enter") askAI(); });
// });

// // ── UPLOAD BOM ──
// async function uploadBOM(file) {
//     const formData = new FormData();
//     formData.append("file", file);

//     try {
//         const res  = await fetch(`${BACKEND_URL}/upload-bom`, { method: "POST", body: formData });
//         if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Upload failed"); }
//         const data = await res.json();

//         bomData      = data.bom;
//         bomStats     = data.stats;
//         bomIssues    = data.issues;
//         bomTotalCost = data.total_cost;
//         lastFilePath = `uploads/${file.name}`;

//         document.getElementById("upload-screen").classList.add("hidden");
//         document.getElementById("app-screen").classList.remove("hidden");
//         document.getElementById("header-file").textContent = file.name;

//         renderStats();
//         renderBOMTable();
//         renderIssues();
//         renderAIComponentList();
//         updateQuotation();

//     } catch (err) { alert("Upload error: " + err.message); }
// }

// // ── STATS ──
// function renderStats() {
//     document.getElementById("stat-total").textContent  = bomStats.total_lines  || 0;
//     document.getElementById("stat-active").textContent = bomStats.active_lines || 0;
//     document.getElementById("stat-dnp").textContent    = bomStats.dnp_lines    || 0;
//     document.getElementById("stat-issues").textContent = bomStats.issue_count  || 0;
// }

// // ── BOM TABLE ──
// function renderBOMTable() {
//     const search    = (document.getElementById("search-box").value || "").toLowerCase();
//     const mount     = document.getElementById("mount-filter").value || "";
//     const dnpFilter = document.getElementById("dnp-filter").value   || "";

//     const filtered = bomData.filter(row => {
//         if (search) {
//             const text = [row.ref||"", row.description||"", row.mpn||"", row.manufacturer||""].join(" ").toLowerCase();
//             if (!text.includes(search)) return false;
//         }
//         if (mount && !(row.package||"").toUpperCase().includes(mount)) return false;
//         if (dnpFilter && row.dnp !== dnpFilter) return false;
//         return true;
//     });

//     const tbody = document.getElementById("bom-table-body");
//     tbody.innerHTML = "";

//     if (filtered.length === 0) {
//         tbody.innerHTML = `<tr><td colspan="13" style="text-align:center;padding:24px;opacity:0.5;">No components found</td></tr>`;
//         document.getElementById("bom-total").textContent = "€0.00";
//         return;
//     }

//     filtered.forEach(row => {
//         const tr = document.createElement("tr");
//         if (row.dnp === "Y") tr.classList.add("row-dnp");

//         const status = row.dnp === "Y"
//             ? `<span class="badge badge-dnp">DNP</span>`
//             : (!row.unit_price && !row.digikey_price)
//                 ? `<span class="badge badge-warn">No Price</span>`
//                 : `<span class="badge badge-ok">✓</span>`;

//         const uPrice  = row.unit_price > 0  ? `€${Number(row.unit_price).toFixed(3)}`  : "—";
//         const dkPrice = row.digikey_price   ? `<span style="color:#22c55e;">€${Number(row.digikey_price).toFixed(3)}</span>` : "—";
//         const stock   = row.digikey_stock != null
//             ? (row.digikey_stock > 0
//                 ? `<span style="color:#22c55e;">${row.digikey_stock}</span>`
//                 : `<span style="color:#ef4444;">0</span>`)
//             : "—";

//         tr.innerHTML = `
//             <td>${row.id||""}</td>
//             <td class="mono">${row.ref||"—"}</td>
//             <td>${row.description||"—"}</td>
//             <td class="mono small">${row.mpn||"—"}</td>
//             <td>${row.manufacturer||"—"}</td>
//             <td class="mono small">${row.package||"—"}</td>
//             <td class="mono">${row.qty||0}</td>
//             <td class="mono">${uPrice}</td>
//             <td class="mono">${dkPrice}</td>
//             <td class="mono">${stock}</td>
//             <td>${row.mount||"SMD"}</td>
//             <td>${status}</td>
//             <td><button class="btn-ai-small" onclick="explainComponent(${bomData.indexOf(row)})">Ask AI</button></td>
//         `;
//         tbody.appendChild(tr);
//     });

//     document.getElementById("bom-total").textContent = `€${bomTotalCost.toFixed(2)}`;
// }

// // ── ISSUES ──
// function renderIssues() {
//     const container = document.getElementById("issues-list");
//     if (!container) return;
//     if (bomIssues.length === 0) {
//         container.innerHTML = `<p style="color:#22c55e;padding:12px 0;">✅ No issues found.</p>`;
//         return;
//     }
//     container.innerHTML = bomIssues.map(i => `
//         <div class="issue-item ${i.type === 'error' ? 'issue-error' : 'issue-warn'}">
//             <span>${i.type === 'error' ? '🔴' : '🟡'}</span>
//             <span>${i.message}</span>
//         </div>
//     `).join("");
// }

// // ── DIGIKEY ENRICH ──
// async function enrichBOM() {
//     const btn    = document.getElementById("enrich-btn");
//     const status = document.getElementById("enrich-status");
//     btn.disabled = true;
//     btn.textContent = "⏳ Fetching...";
//     status.textContent = `Looking up ${bomData.length} parts on DigiKey...`;

//     try {
//         const res  = await fetch(`${BACKEND_URL}/enrich-bom`, {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ bom: bomData }),
//         });
//         const data = await res.json();
//         if (data.error) { status.textContent = "Error: " + data.error; return; }

//         bomData      = data.bom;
//         bomTotalCost = data.total_cost;
//         renderBOMTable();
//         updateQuotation();

//         const found = bomData.filter(r => r.digikey_price).length;
//         status.textContent = `✅ ${found}/${bomData.length} parts priced`;

//     } catch { status.textContent = "Could not reach Flask."; }

//     btn.disabled = false;
//     btn.textContent = "🔍 Fetch Live Prices (DigiKey)";
// }

// // ── SMT CHECK ──
// async function runSMTCheck() {
//     const status = document.getElementById("enrich-status");
//     status.textContent = "Running SMT check...";

//     try {
//         const res  = await fetch(`${BACKEND_URL}/check-smt`, {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ bom: bomData }),
//         });
//         smtData = await res.json();
//         renderSMTTab();
//         showTab("smt");
//         status.textContent = `✅ SMT: ${smtData.overall}`;
//     } catch { status.textContent = "SMT check failed."; }
// }

// function renderSMTTab() {
//     if (!smtData) return;

//     // overall badge
//     const colors = { "FEASIBLE": "#22c55e", "FEASIBLE WITH CARE": "#f59e0b", "COMPLEX": "#ef4444" };
//     const col = colors[smtData.overall] || "#8a93b0";
//     document.getElementById("smt-overall").innerHTML = `
//         <div style="padding:14px 18px;background:rgba(255,255,255,0.05);border-radius:8px;border-left:4px solid ${col};">
//             <div style="font-size:16px;font-weight:700;color:${col};">${smtData.overall}</div>
//             <div style="font-size:13px;color:#e8ecf4;margin-top:4px;">${smtData.overall_msg}</div>
//         </div>`;

//     // summary boxes
//     const s = smtData.summary;
//     document.getElementById("smt-summary").innerHTML = `
//         <div class="stat-card"><div class="stat-label">LOW RISK</div><div class="stat-value green">${s.LOW||0}</div></div>
//         <div class="stat-card"><div class="stat-label">MEDIUM RISK</div><div class="stat-value amber">${s.MEDIUM||0}</div></div>
//         <div class="stat-card"><div class="stat-label">HIGH RISK</div><div class="stat-value red">${s.HIGH||0}</div></div>
//         <div class="stat-card"><div class="stat-label">MISSING PKG</div><div class="stat-value red">${s.missing||0}</div></div>
//     `;

//     // table
//     const tbody = document.getElementById("smt-table-body");
//     tbody.innerHTML = "";
//     smtData.results.forEach(row => {
//         const riskColors = { LOW: "#22c55e", MEDIUM: "#f59e0b", HIGH: "#ef4444" };
//         const rc = riskColors[row.risk] || "#8a93b0";
//         const tr = document.createElement("tr");
//         tr.innerHTML = `
//             <td class="mono">${row.ref}</td>
//             <td>${row.description}</td>
//             <td class="mono small">${row.mpn}</td>
//             <td class="mono">${row.package}</td>
//             <td class="mono">${row.qty}</td>
//             <td><span class="badge" style="background:${rc}22;color:${rc};">${row.risk}</span></td>
//             <td style="font-size:12px;color:#8a93b0;">${row.reason}</td>
//         `;
//         tbody.appendChild(tr);
//     });
// }

// // ── QUOTATION CALC ──
// function updateQuotation() {
//     const qty    = parseFloat(document.getElementById("board-qty").value)    || 1;
//     const asm    = parseFloat(document.getElementById("assembly-cost").value) || 0;
//     const margin = parseFloat(document.getElementById("margin").value)        || 0;

//     document.getElementById("q-qty-label").textContent    = qty;
//     document.getElementById("q-margin-label").textContent = margin;

//     const bomU    = bomTotalCost;
//     const subU    = bomU + asm;
//     const markupU = subU * (margin / 100);
//     const sellU   = subU + markupU;
//     const fmt     = n => `€${n.toFixed(2)}`;

//     document.getElementById("q-bom-unit").textContent     = fmt(bomU);
//     document.getElementById("q-bom-total").textContent    = fmt(bomU * qty);
//     document.getElementById("q-asm-unit").textContent     = fmt(asm);
//     document.getElementById("q-asm-total").textContent    = fmt(asm * qty);
//     document.getElementById("q-sub-unit").textContent     = fmt(subU);
//     document.getElementById("q-sub-total").textContent    = fmt(subU * qty);
//     document.getElementById("q-markup-unit").textContent  = fmt(markupU);
//     document.getElementById("q-markup-total").textContent = fmt(markupU * qty);
//     document.getElementById("q-sell-unit").textContent    = fmt(sellU);
//     document.getElementById("q-sell-total").textContent   = fmt(sellU * qty);
// }

// function getQuotePayload() {
//     return {
//         bom:      bomData,
//         customer: document.getElementById("customer-name").value,
//         project:  document.getElementById("project-name").value,
//         ref:      document.getElementById("quote-ref").value,
//         qty:      document.getElementById("board-qty").value,
//         asm:      document.getElementById("assembly-cost").value,
//         margin:   document.getElementById("margin").value,
//         bom_cost: bomTotalCost,
//         asm_cost: parseFloat(document.getElementById("assembly-cost").value) || 0,
//     };
// }

// // ── EXPORT EXCEL ──
// async function exportExcel() {
//     const res  = await fetch(`${BACKEND_URL}/export-quote`, {
//         method: "POST", headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(getQuotePayload()),
//     });
//     const blob = await res.blob();
//     const url  = URL.createObjectURL(blob);
//     const a    = document.createElement("a");
//     a.href = url; a.download = "quotation.xlsx"; a.click();
//     URL.revokeObjectURL(url);
// }

// // ── EXPORT PDF ──
// async function exportPDF() {
//     const payload = { ...getQuotePayload(), ai_description: document.getElementById("quote-ai-output").textContent || "" };
//     const res  = await fetch(`${BACKEND_URL}/export-pdf`, {
//         method: "POST", headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//     });
//     const blob = await res.blob();
//     const url  = URL.createObjectURL(blob);
//     const a    = document.createElement("a");
//     a.href = url; a.download = "quotation.pdf"; a.click();
//     URL.revokeObjectURL(url);
// }

// // ── DRAFT EMAIL ──
// async function draftEmail() {
//     const out = document.getElementById("email-output");
//     const qty = parseFloat(document.getElementById("board-qty").value) || 1;
//     const asm = parseFloat(document.getElementById("assembly-cost").value) || 0;
//     const margin = parseFloat(document.getElementById("margin").value) || 0;
//     const sellU = (bomTotalCost + asm) * (1 + margin/100);

//     out.textContent = "Drafting email...";
//     out.style.display = "block";

//     const res = await fetch(`${BACKEND_URL}/draft-email`, {
//         method: "POST", headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//             customer: document.getElementById("customer-name").value,
//             project:  document.getElementById("project-name").value,
//             ref:      document.getElementById("quote-ref").value,
//             qty, sell_unit: sellU, sell_total: sellU * qty,
//             bom_lines: bomData.length,
//             high_risk_count: smtData ? smtData.summary.HIGH || 0 : 0,
//         }),
//     });
//     const data = await res.json();
//     out.textContent = data.email || data.error;
//     document.getElementById("copy-email-btn").style.display = "block";
// }

// function copyEmail() {
//     navigator.clipboard.writeText(document.getElementById("email-output").textContent);
//     document.getElementById("copy-email-btn").textContent = "✅ Copied!";
//     setTimeout(() => document.getElementById("copy-email-btn").textContent = "📋 Copy Email", 2000);
// }

// function copyAgentEmail() {
//     navigator.clipboard.writeText(document.getElementById("agent-email").textContent);
// }

// // ── AI ──
// async function askAI() {
//     const input  = document.getElementById("ai-input");
//     const output = document.getElementById("ai-output");
//     const q      = input.value.trim();
//     if (!q) return;

//     output.textContent  = "Thinking...";
//     output.style.display = "block";

//     const bomSummary = bomData.slice(0,15).map(r =>
//         `${r.ref||""}: ${r.description||""} | MPN:${r.mpn||""} | ${r.manufacturer||""} | Qty:${r.qty||0}`
//     ).join("\n");

//     try {
//         const res  = await fetch(`${BACKEND_URL}/ask-ai`, {
//             method: "POST", headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ question: q, bom_summary: bomSummary }),
//         });
//         const data = await res.json();
//         output.textContent = data.error ? "Error: " + data.error : data.answer;
//     } catch { output.textContent = "Could not reach Flask."; }
// }

// function explainComponent(index) {
//     const row = bomData[index];
//     if (!row) return;
//     showTab("ai");
//     document.getElementById("ai-input").value =
//         `Explain this component and suggest a cheaper alternative: ${row.description||""} (MPN: ${row.mpn||""}, made by ${row.manufacturer||""}, package: ${row.package||""})`;
//     askAI();
// }

// function renderAIComponentList() {
//     const container = document.getElementById("ai-component-list");
//     if (!container) return;
//     container.innerHTML = bomData.filter(r => r.dnp !== "Y").map(row => `
//         <div class="ai-comp-item">
//             <span class="mono small">${row.ref||""}</span>
//             <span>${row.description||""}</span>
//             <span class="mono small">${row.mpn||""}</span>
//             <button class="btn-ai-small" onclick="explainComponent(${bomData.indexOf(row)})">Explain</button>
//         </div>
//     `).join("");
// }

// async function generateQuoteDescription() {
//     const qty  = document.getElementById("board-qty").value;
//     const asm  = document.getElementById("assembly-cost").value;
//     const mg   = document.getElementById("margin").value;
//     const sellU = (bomTotalCost + parseFloat(asm)) * (1 + parseFloat(mg)/100);
//     const out  = document.getElementById("quote-ai-output");
//     out.textContent  = "Generating...";
//     out.style.display = "block";

//     const res  = await fetch(`${BACKEND_URL}/ask-ai`, {
//         method: "POST", headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//             question: `Write a 3-sentence professional EMS quotation description. Customer: ${document.getElementById("customer-name").value}, Project: ${document.getElementById("project-name").value}, Qty: ${qty} boards, BOM cost: €${bomTotalCost.toFixed(2)}/board, Assembly: €${asm}/board, Sell: €${sellU.toFixed(2)}/board.`,
//             bom_summary: "",
//         }),
//     });
//     const data = await res.json();
//     out.textContent = data.answer || data.error;
// }

// function setQ(text) { document.getElementById("ai-input").value = text; askAI(); }

// // ── FULL AGENT ──
// async function runFullAgent() {
//     if (!lastFilePath) { alert("Upload a BOM file first."); return; }

//     const btn = document.getElementById("agent-btn");
//     btn.disabled = true;
//     btn.textContent = "⏳ Agent running...";

//     document.getElementById("agent-progress-card").classList.remove("hidden");
//     document.getElementById("agent-results-card").classList.add("hidden");
//     document.getElementById("agent-steps").innerHTML = "";

//     try {
//         const res  = await fetch(`${BACKEND_URL}/run-agent`, {
//             method: "POST", headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({
//                 filepath: lastFilePath,
//                 customer: document.getElementById("customer-name").value,
//                 project:  document.getElementById("project-name").value,
//                 ref:      document.getElementById("quote-ref").value,
//                 qty:      parseFloat(document.getElementById("board-qty").value) || 100,
//                 asm_cost: parseFloat(document.getElementById("assembly-cost").value) || 8.5,
//                 margin:   parseFloat(document.getElementById("margin").value) || 20,
//             }),
//         });

//         const data = await res.json();

//         // render steps
//         const stepsEl = document.getElementById("agent-steps");
//         (data.steps || []).forEach(s => {
//             const icon = s.status === "done" ? "✅" : s.status === "error" ? "❌" : "⏳";
//             stepsEl.innerHTML += `
//                 <div style="padding:10px 14px;border-bottom:1px solid #1e2336;display:flex;gap:10px;align-items:center;">
//                     <span>${icon}</span>
//                     <span style="font-size:13px;">Step ${s.step}: ${s.message}</span>
//                 </div>`;
//         });

//         // show results
//         if (data.quote) {
//             const q = data.quote;
//             document.getElementById("agent-quote-summary").innerHTML = `
//                 <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
//                     <div class="stat-card"><div class="stat-label">BOM Cost/Board</div><div class="stat-value accent">€${q.bom_cost.toFixed(2)}</div></div>
//                     <div class="stat-card"><div class="stat-label">Sell Price/Board</div><div class="stat-value green">€${q.sell_unit.toFixed(2)}</div></div>
//                     <div class="stat-card"><div class="stat-label">Total Value</div><div class="stat-value green">€${q.sell_total.toFixed(2)}</div></div>
//                     <div class="stat-card"><div class="stat-label">Margin</div><div class="stat-value amber">${document.getElementById("margin").value}%</div></div>
//                 </div>`;
//         }

//         if (data.smt) {
//             const s = data.smt;
//             document.getElementById("agent-smt-summary").innerHTML = `
//                 <div style="padding:12px;background:rgba(255,255,255,0.05);border-radius:6px;">
//                     <strong>${s.overall}</strong> — ${s.overall_msg}
//                     <div style="margin-top:6px;font-size:12px;color:#8a93b0;">
//                         Low: ${s.summary.LOW||0} | Medium: ${s.summary.MEDIUM||0} | High: ${s.summary.HIGH||0}
//                     </div>
//                 </div>`;
//         }

//         if (data.email) {
//             agentEmailText = data.email;
//             document.getElementById("agent-email").textContent = data.email;
//         }

//         // update global state if prices came back
//         if (data.prices) {
//             bomData      = data.prices;
//             bomTotalCost = data.prices.reduce((s,r) => s + ((r.digikey_price||0) * (r.qty||1)), 0);
//             renderBOMTable();
//             updateQuotation();
//         }

//         document.getElementById("agent-results-card").classList.remove("hidden");

//     } catch (err) {
//         document.getElementById("agent-steps").innerHTML += `<div style="color:#ef4444;padding:12px;">Error: ${err.message}</div>`;
//     }

//     btn.disabled = false;
//     btn.textContent = "🚀 Run Full Agent";
// }

// // ── TAB SWITCHER ──
// function showTab(name) {
//     document.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
//     const target = document.getElementById("tab-" + name);
//     if (target) target.classList.remove("hidden");

//     const names = ["bom","issues","smt","quote","ai","agent"];
//     document.querySelectorAll(".tab").forEach((btn, i) => {
//         btn.classList.toggle("active", names[i] === name);
//     });
// }

// // ── RESET ──
// function resetApp() {
//     bomData = []; bomStats = {}; bomIssues = []; bomTotalCost = 0; smtData = null; lastFilePath = "";
//     document.getElementById("app-screen").classList.add("hidden");
//     document.getElementById("upload-screen").classList.remove("hidden");
//     document.getElementById("header-file").textContent = "No file loaded";
//     document.getElementById("file-input").value = "";
//     document.getElementById("bom-table-body").innerHTML = "";
//     showTab("bom");
// }


const BACKEND_URL = "http://localhost:5000";

let bomData           = [];
let bomStats          = {};
let bomIssues         = [];
let bomTotalCost      = 0;   // total procurement cost (all components × all boards)
let bomCostPerBoard   = 0;   // component cost for ONE board — used in quotation
let smtData           = null;
let lastFilePath      = "";
let agentEmailText    = "";

// ── INIT ──
document.addEventListener("DOMContentLoaded", () => {
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
        bomTotalCost      = data.total_cost   || 0;
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
        tbody.innerHTML = `<tr><td colspan="14" style="text-align:center;padding:24px;opacity:0.5;">No components found</td></tr>`;
        document.getElementById("bom-total").textContent = "€0.00";
        return;
    }

    filtered.forEach(row => {
        const tr = document.createElement("tr");
        if (row.dnp === "Y") tr.classList.add("row-dnp");

        const hasPrice = row.nexar_price || row.unit_price;

        const belowMinWarn = row.below_minimum
            ? `<span title="Your qty is below supplier minimum order qty — price shown is the lowest available tier" style="color:#f59e0b;font-size:10px;"> ⚠ MOQ</span>`
            : "";

        const status = row.dnp === "Y"
            ? `<span class="badge badge-dnp">DNP</span>`
            : !hasPrice
                ? `<span class="badge badge-warn">No Price</span>`
                : `<span class="badge badge-ok">✓</span>`;

        // Unit price (tier-selected for total_qty)
        const unitPrice = row.unit_price
            ? `<span style="color:#e8ecf4;font-family:monospace;">€${Number(row.unit_price).toFixed(4)}</span>${belowMinWarn}`
            : `<span style="color:#4a5570;">—</span>`;

        // Per-board cost = unit_price × component_qty
        const perBoard = row.per_board_cost
            ? `<span style="color:#22c55e;font-weight:600;">€${Number(row.per_board_cost).toFixed(4)}</span>`
            : `<span style="color:#4a5570;">—</span>`;

        // Extended = unit_price × total_qty (all boards)
        const extended = row.extended_price
            ? `<span style="color:#4f8fff;font-family:monospace;">€${Number(row.extended_price).toFixed(2)}</span>`
            : `<span style="color:#4a5570;">—</span>`;

        const supplier = row.nexar_supplier
            ? `<span style="font-size:11px;color:#4f8fff;font-family:monospace;">${row.nexar_supplier}</span>`
            : "—";

        const stock = row.nexar_stock != null
            ? (row.nexar_stock > 0
                ? `<span style="color:#22c55e;">${Number(row.nexar_stock).toLocaleString()}</span>`
                : `<span style="color:#ef4444;">OUT</span>`)
            : "—";

        // All suppliers with tier breaks
        let allSuppliers = `<span style="color:#4a5570;font-size:11px;">—</span>`;
        if (row.nexar_all && row.nexar_all.length > 0) {
            allSuppliers = row.nexar_all.map(s => {
                const breaks = (s.price_breaks || []).map(pb => {
                    const highlight = pb.qualifies
                        ? "color:#22c55e;font-weight:600;"
                        : "color:#4a5570;";
                    return `<div style="font-size:10px;${highlight}padding-left:8px;">
                        ${pb.qty}+ pcs → ${s.currency}${pb.price}
                        ${pb.qualifies ? "✓" : ""}
                    </div>`;
                }).join("");

                return `<div style="font-size:11px;margin-bottom:6px;">
                    <span style="color:#8a93b0;">${s.supplier}:</span>
                    <span style="color:#e8ecf4;font-weight:600;font-family:monospace;">
                        ${s.currency || ""}${Number(s.price).toFixed(4)}
                    </span>
                    <span style="color:#4a5570;">(${s.stock > 0 ? Number(s.stock).toLocaleString() : "OUT"})</span>
                    ${breaks}
                </div>`;
            }).join("");
        }

        tr.innerHTML = `
            <td>${row.id || ""}</td>
            <td class="mono" style="white-space:nowrap">${row.ref || "—"}</td>
            <td>${row.description || "—"}</td>
            <td class="mono small">${row.mpn || "—"}</td>
            <td>${row.manufacturer || "—"}</td>
            <td class="mono small">${row.package || "—"}</td>
            <td class="mono">${row.qty || 0}</td>
            <td class="mono">${unitPrice}</td>
            <td class="mono">${perBoard}</td>
            <td class="mono">${extended}</td>
            <td>${supplier}</td>
            <td>${stock}</td>
            <td>${allSuppliers}</td>
            <td>${status}</td>
            <td><button class="btn-ai-small" onclick="explainComponent(${bomData.indexOf(row)})">Ask AI</button></td>
        `;
        tbody.appendChild(tr);
    });

    // Show total procurement cost in BOM footer
    document.getElementById("bom-total").textContent = `€${bomTotalCost.toFixed(2)}`;
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

    btn.disabled    = true;
    btn.textContent = "⏳ Fetching prices...";
    status.textContent = `Looking up ${bomData.length} parts × ${board_qty} boards on DigiKey + Mouser + Farnell...`;

    try {
        const res = await fetch(`${BACKEND_URL}/enrich-bom`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ bom: bomData, board_qty }),
        });

        const data = await res.json();
        if (data.error) { status.textContent = "Error: " + data.error; return; }

        bomData         = data.bom;
        bomTotalCost    = data.total_cost        || 0;   // total procurement
        bomCostPerBoard = data.bom_cost_per_board || 0;  // per-board component cost

        renderBOMTable();
        updateQuotation();

        const found = bomData.filter(r => r.nexar_price).length;
        status.textContent = `✅ ${found}/${bomData.length} parts priced for qty ×${board_qty}`;

    } catch (err) {
        status.textContent = "Could not reach Flask: " + err.message;
    }

    btn.disabled    = false;
    btn.textContent = "🔍 Fetch Live Prices";
}


// ── QUOTATION CALC ──
// bomCostPerBoard = unit_price × component_qty   (already tier-priced, NOT multiplied by board_qty)
// We then multiply by board_qty here ONCE for the "Total" column only.
// Assembly cost is also per-board, multiplied by board_qty for total.
function updateQuotation() {
    const board_qty = parseFloat(document.getElementById("board-qty").value)    || 1;
    const asm       = parseFloat(document.getElementById("assembly-cost").value) || 0;
    const margin    = parseFloat(document.getElementById("margin").value)        || 0;

    document.getElementById("q-qty-label").textContent    = board_qty;
    document.getElementById("q-margin-label").textContent = margin;

    // Per-board costs
    const compPerBoard = bomCostPerBoard;             // component cost, 1 board
    const subPerBoard  = compPerBoard + asm;          // subtotal, 1 board
    const markupPB     = subPerBoard * (margin / 100);
    const sellPerBoard = subPerBoard + markupPB;

    // Total costs (× board_qty)  — this is the ONLY place board_qty multiplies
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
}


function getQuotePayload() {
    return {
        bom:          bomData,
        customer:     document.getElementById("customer-name").value,
        project:      document.getElementById("project-name").value,
        ref:          document.getElementById("quote-ref").value,
        qty:          document.getElementById("board-qty").value,
        asm:          document.getElementById("assembly-cost").value,
        margin:       document.getElementById("margin").value,
        bom_cost:     bomCostPerBoard,   // per-board — backend will multiply by qty
        asm_cost:     parseFloat(document.getElementById("assembly-cost").value) || 0,
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
        const riskColors = { LOW: "#22c55e", MEDIUM: "#f59e0b", HIGH: "#ef4444" };
        const rc = riskColors[row.risk] || "#8a93b0";
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="mono">${row.ref}</td>
            <td>${row.description}</td>
            <td class="mono small">${row.mpn}</td>
            <td class="mono">${row.package}</td>
            <td class="mono">${row.qty}</td>
            <td><span class="badge" style="background:${rc}22;color:${rc};">${row.risk}</span></td>
            <td style="font-size:12px;color:#8a93b0;">${row.reason}</td>`;
        tbody.appendChild(tr);
    });
}


// ── DRAFT EMAIL ──
async function draftEmail() {
    const out    = document.getElementById("email-output");
    const board_qty = parseFloat(document.getElementById("board-qty").value)    || 1;
    const asm    = parseFloat(document.getElementById("assembly-cost").value) || 0;
    const margin = parseFloat(document.getElementById("margin").value)        || 0;
    const sellPB = (bomCostPerBoard + asm) * (1 + margin / 100);

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
                    <span>${icon}</span>
                    <span style="font-size:13px;">Step ${s.step}: ${s.message}</span>
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
            bomCostPerBoard = bomData
                .filter(r => r.dnp !== "Y")
                .reduce((s, r) => s + (r.per_board_cost || 0), 0);
            bomTotalCost    = bomData
                .filter(r => r.dnp !== "Y")
                .reduce((s, r) => s + (r.extended_price || 0), 0);
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
    showTab("bom");
}