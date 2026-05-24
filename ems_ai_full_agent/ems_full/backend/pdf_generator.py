# ==========================================
# PDF QUOTATION GENERATOR
# Uses reportlab to create a professional PDF
# ==========================================

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from datetime import date
import io


# Brand colors
DARK   = colors.HexColor("#1e2336")
BLUE   = colors.HexColor("#4f8fff")
GREEN  = colors.HexColor("#22c55e")
GRAY   = colors.HexColor("#8a93b0")
LIGHT  = colors.HexColor("#f0f4ff")
WHITE  = colors.white


def generate_pdf(data):
    """
    data = {
        customer, project, ref, qty,
        bom_cost, asm_cost, margin,
        bom: [...rows],
        ai_description: "..."
    }
    Returns a BytesIO buffer with the PDF
    """
    buf = io.BytesIO()

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=15*mm,
        leftMargin=15*mm,
        topMargin=15*mm,
        bottomMargin=15*mm,
    )

    styles = getSampleStyleSheet()
    story  = []

    # ── TITLE BLOCK ──
    title_style = ParagraphStyle(
        "title",
        fontSize=22,
        textColor=BLUE,
        spaceAfter=2*mm,
        fontName="Helvetica-Bold",
    )
    sub_style = ParagraphStyle(
        "sub",
        fontSize=10,
        textColor=GRAY,
        spaceAfter=6*mm,
    )

    story.append(Paragraph("EMS AI QUOTATION SYSTEM", title_style))
    story.append(Paragraph(
        f"Ref: {data.get('ref','QT-001')}  |  Date: {date.today().strftime('%d %b %Y')}",
        sub_style
    ))
    story.append(HRFlowable(width="100%", thickness=1, color=BLUE))
    story.append(Spacer(1, 4*mm))

    # ── PROJECT INFO TABLE ──
    info_data = [
        ["Customer",    data.get("customer", "—"),  "Project",  data.get("project", "—")],
        ["Quotation",   data.get("ref", "—"),        "Date",     date.today().strftime("%d %B %Y")],
        ["Quantity",    f"{data.get('qty', 1)} pcs", "Valid for","30 days"],
    ]
    info_table = Table(info_data, colWidths=[35*mm, 65*mm, 30*mm, 55*mm])
    info_table.setStyle(TableStyle([
        ("FONTNAME",    (0,0), (-1,-1), "Helvetica"),
        ("FONTNAME",    (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTNAME",    (2,0), (2,-1), "Helvetica-Bold"),
        ("FONTSIZE",    (0,0), (-1,-1), 9),
        ("TEXTCOLOR",   (0,0), (0,-1), DARK),
        ("TEXTCOLOR",   (2,0), (2,-1), DARK),
        ("TEXTCOLOR",   (1,0), (1,-1), colors.black),
        ("BACKGROUND",  (0,0), (-1,-1), LIGHT),
        ("ROWBACKGROUNDS",(0,0),(-1,-1),[LIGHT, WHITE]),
        ("GRID",        (0,0), (-1,-1), 0.5, colors.HexColor("#d0d8f0")),
        ("PADDING",     (0,0), (-1,-1), 6),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 6*mm))

    # ── COST SUMMARY ──
    bom_cost  = float(data.get("bom_cost", 0))
    asm_cost  = float(data.get("asm_cost", 0))
    margin    = float(data.get("margin", 0))
    qty       = float(data.get("qty", 1))
    sub_cost  = bom_cost + asm_cost
    markup    = sub_cost * (margin / 100)
    sell_unit = sub_cost + markup

    section_style = ParagraphStyle(
        "section",
        fontSize=11,
        textColor=DARK,
        fontName="Helvetica-Bold",
        spaceBefore=4*mm,
        spaceAfter=2*mm,
    )

    story.append(Paragraph("COST SUMMARY", section_style))

    cost_data = [
        ["Item", "Per Board", f"Total x{int(qty)} pcs"],
        ["Component cost (BOM)", f"€{bom_cost:.2f}", f"€{bom_cost*qty:.2f}"],
        ["Assembly cost",         f"€{asm_cost:.2f}", f"€{asm_cost*qty:.2f}"],
        ["Subtotal",              f"€{sub_cost:.2f}", f"€{sub_cost*qty:.2f}"],
        [f"Margin ({margin:.0f}%)", f"€{markup:.2f}", f"€{markup*qty:.2f}"],
        ["SELL PRICE",            f"€{sell_unit:.2f}", f"€{sell_unit*qty:.2f}"],
    ]

    cost_table = Table(cost_data, colWidths=[100*mm, 40*mm, 45*mm])
    cost_table.setStyle(TableStyle([
        ("FONTNAME",    (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTNAME",    (0,-1),(-1,-1),"Helvetica-Bold"),
        ("FONTSIZE",    (0,0), (-1,-1), 9),
        ("BACKGROUND",  (0,0), (-1,0), DARK),
        ("TEXTCOLOR",   (0,0), (-1,0), WHITE),
        ("BACKGROUND",  (0,-1),(-1,-1), GREEN),
        ("TEXTCOLOR",   (0,-1),(-1,-1), WHITE),
        ("ROWBACKGROUNDS",(0,1),(-1,-2),[WHITE, LIGHT]),
        ("ALIGN",       (1,0), (-1,-1), "RIGHT"),
        ("GRID",        (0,0), (-1,-1), 0.5, colors.HexColor("#d0d8f0")),
        ("PADDING",     (0,0), (-1,-1), 6),
    ]))
    story.append(cost_table)
    story.append(Spacer(1, 6*mm))

    # ── AI DESCRIPTION ──
    ai_desc = data.get("ai_description", "")
    if ai_desc:
        story.append(Paragraph("SCOPE OF WORK", section_style))
        desc_style = ParagraphStyle(
            "desc",
            fontSize=9,
            textColor=colors.black,
            leading=14,
            spaceAfter=4*mm,
        )
        story.append(Paragraph(ai_desc, desc_style))

    # ── BOM TABLE ──
    story.append(Paragraph("BILL OF MATERIALS", section_style))

    bom_header = ["#", "Ref", "Description", "MPN", "Pkg", "Qty", "Unit €", "Ext €", "Status"]
    bom_rows_data = [bom_header]

    active_bom = [r for r in data.get("bom", []) if r.get("dnp") != "Y"]

    for i, row in enumerate(active_bom, 1):
        price = row.get("digikey_price") or row.get("unit_price", 0)
        ext   = price * row.get("qty", 1) if price else 0
        status = "OK" if price else "No Price"

        bom_rows_data.append([
            str(i),
            str(row.get("ref", "—"))[:15],
            str(row.get("description", "—"))[:30],
            str(row.get("mpn", "—"))[:18],
            str(row.get("package", "—"))[:10],
            str(row.get("qty", 0)),
            f"€{price:.3f}" if price else "—",
            f"€{ext:.3f}"   if ext   else "—",
            status,
        ])

    bom_table = Table(
        bom_rows_data,
        colWidths=[8*mm, 22*mm, 45*mm, 28*mm, 16*mm, 8*mm, 16*mm, 16*mm, 16*mm]
    )
    bom_table.setStyle(TableStyle([
        ("FONTNAME",    (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE",    (0,0), (-1,-1), 7.5),
        ("BACKGROUND",  (0,0), (-1,0), DARK),
        ("TEXTCOLOR",   (0,0), (-1,0), WHITE),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),[WHITE, LIGHT]),
        ("ALIGN",       (5,0), (-1,-1), "RIGHT"),
        ("GRID",        (0,0), (-1,-1), 0.3, colors.HexColor("#d0d8f0")),
        ("PADDING",     (0,0), (-1,-1), 4),
        ("FONTNAME",    (0,1), (-1,-1), "Helvetica"),
    ]))
    story.append(bom_table)
    story.append(Spacer(1, 6*mm))

    # ── TERMS ──
    story.append(HRFlowable(width="100%", thickness=0.5, color=GRAY))
    terms_style = ParagraphStyle("terms", fontSize=7.5, textColor=GRAY, leading=11)
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(
        "Terms: This quotation is valid for 30 days from the date of issue. "
        "Prices are subject to component availability. Lead time to be confirmed upon order. "
        "Generated by EMS AI Quotation System.",
        terms_style
    ))

    doc.build(story)
    buf.seek(0)
    return buf
