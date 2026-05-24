from flask import Flask, request, jsonify, render_template, send_file
from flask_cors import CORS
import os
import io
from quotation_engine import process_bom
from ai_helper import ask_ai
from digikey_helper import enrich_bom
from smt_checker import check_smt
from pdf_generator import generate_pdf
from email_drafter import draft_quotation_email
from agent import run_agent

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
OUTPUT_FOLDER = "outputs"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)


# ── HOME ──
@app.route("/")
def home():
    return render_template("index.html")


# ── UPLOAD BOM ──
@app.route("/upload-bom", methods=["POST"])
def upload_bom():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400
    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)
    try:
        result = process_bom(filepath)
        return jsonify(result)
    except Exception as e:
        print("ERROR in process_bom:", e)
        return jsonify({"error": str(e)}), 500


# ── ASK AI ──
@app.route("/ask-ai", methods=["POST"])
def ai_route():
    data        = request.json
    question    = data.get("question", "")
    bom_summary = data.get("bom_summary", "")
    if not question:
        return jsonify({"error": "No question provided"}), 400
    try:
        answer = ask_ai(question, bom_summary)
        return jsonify({"answer": answer})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── ENRICH BOM (DigiKey prices) ──
@app.route("/enrich-bom", methods=["POST"])
def enrich_bom_route():
    data = request.json
    bom  = data.get("bom", [])
    try:
        enriched = enrich_bom(bom)
        total = sum(
            (r.get("digikey_price") or 0) * r.get("qty", 1)
            for r in enriched
            if r.get("dnp") != "Y" and r.get("digikey_price")
        )
        return jsonify({"bom": enriched, "total_cost": round(total, 2)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── SMT FEASIBILITY CHECK ──
@app.route("/check-smt", methods=["POST"])
def check_smt_route():
    data = request.json
    bom  = data.get("bom", [])
    try:
        result = check_smt(bom)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── EXPORT PDF ──
@app.route("/export-pdf", methods=["POST"])
def export_pdf():
    data = request.json
    try:
        buf = generate_pdf(data)
        return send_file(
            buf,
            as_attachment=True,
            download_name=f"{data.get('ref','quotation').replace('-','_')}.pdf",
            mimetype="application/pdf"
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── EXPORT EXCEL ──
@app.route("/export-quote", methods=["POST"])
def export_quote():
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter

    data     = request.json
    bom      = data.get("bom", [])
    customer = data.get("customer", "Customer")
    project  = data.get("project", "Project")
    qty      = float(data.get("qty", 1))
    asm      = float(data.get("asm", 0))
    margin   = float(data.get("margin", 0))
    ref_no   = data.get("ref", "QT-001")

    bom_cost  = sum((r.get("digikey_price") or r.get("unit_price") or 0) * r.get("qty",1)
                    for r in bom if r.get("dnp") != "Y")
    sub_unit  = bom_cost + asm
    markup    = sub_unit * (margin / 100)
    sell_unit = sub_unit + markup

    wb = Workbook()
    ws = wb.active
    ws.title = "Quotation"

    header_font = Font(bold=True, color="FFFFFF", size=11)
    header_fill = PatternFill("solid", fgColor="1e2336")
    green_font  = Font(bold=True, color="166534", size=12)
    center      = Alignment(horizontal="center")

    ws.merge_cells("A1:F1")
    ws["A1"] = "EMS AI QUOTATION SYSTEM"
    ws["A1"].font = Font(bold=True, size=14, color="1a56db")
    ws["A1"].alignment = center

    ws.merge_cells("A2:F2")
    ws["A2"] = f"Ref: {ref_no}  |  Customer: {customer}  |  Project: {project}"
    ws["A2"].alignment = center
    ws.append([])

    ws.append(["COST SUMMARY", "", "Per Board (€)", f"Total x{int(qty)} (€)"])
    ws.append(["Component cost (BOM)",  "", f"{bom_cost:.2f}",  f"{bom_cost*qty:.2f}"])
    ws.append(["Assembly cost",          "", f"{asm:.2f}",       f"{asm*qty:.2f}"])
    ws.append(["Subtotal",               "", f"{sub_unit:.2f}",  f"{sub_unit*qty:.2f}"])
    ws.append([f"Margin ({margin:.0f}%)", "", f"{markup:.2f}",   f"{markup*qty:.2f}"])
    ws.append(["SELL PRICE",             "", f"{sell_unit:.2f}", f"{sell_unit*qty:.2f}"])

    sell_row = ws.max_row
    for col in range(1, 5):
        ws.cell(sell_row, col).font = green_font

    ws.append([])
    bom_headers = ["#","Ref","Description","MPN","Manufacturer","Package","Qty","Unit €","Ext €","Mount","Status"]
    ws.append(bom_headers)
    hrow = ws.max_row
    for col, _ in enumerate(bom_headers, 1):
        cell = ws.cell(hrow, col)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center

    for i, row in enumerate(bom, 1):
        price = row.get("digikey_price") or row.get("unit_price", 0)
        ext   = price * row.get("qty", 1) if price else 0
        ws.append([
            i, row.get("ref",""), row.get("description",""),
            row.get("mpn",""), row.get("manufacturer",""),
            row.get("package",""), row.get("qty",0),
            f"€{price:.3f}" if price else "—",
            f"€{ext:.3f}" if ext else "—",
            row.get("mount",""), "DNP" if row.get("dnp")=="Y" else ("No Price" if not price else "OK"),
        ])

    col_widths = [4,20,35,22,20,14,6,10,10,8,10]
    for i, w in enumerate(col_widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return send_file(buf, as_attachment=True,
                     download_name=f"{ref_no.replace('-','_')}.xlsx",
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


# ── DRAFT EMAIL ──
@app.route("/draft-email", methods=["POST"])
def draft_email_route():
    data = request.json
    try:
        email_text = draft_quotation_email(data)
        return jsonify({"email": email_text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── RUN FULL AGENT ──
@app.route("/run-agent", methods=["POST"])
def run_agent_route():
    data = request.json
    filepath = data.get("filepath", "")

    if not filepath or not os.path.exists(filepath):
        return jsonify({"error": "File not found. Upload BOM first."}), 400

    try:
        result = run_agent(
            filepath = filepath,
            customer = data.get("customer", "Customer"),
            project  = data.get("project", "Project"),
            qty      = float(data.get("qty", 100)),
            asm_cost = float(data.get("asm_cost", 8.5)),
            margin   = float(data.get("margin", 20)),
            ref      = data.get("ref", "QT-001"),
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
