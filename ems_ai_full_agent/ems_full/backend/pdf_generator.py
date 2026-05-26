from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from datetime import date
import io

DARK  = colors.HexColor("#1e2336")
BLUE  = colors.HexColor("#4f8fff")
GREEN = colors.HexColor("#22c55e")
AMBER = colors.HexColor("#f59e0b")
RED   = colors.HexColor("#ef4444")
PURP  = colors.HexColor("#8b5cf6")
GRAY  = colors.HexColor("#8a93b0")
LIGHT = colors.HexColor("#f0f4ff")
WHITE = colors.white


def _p(text, style):
    """Wrap text in a Paragraph so ReportLab word-wraps it inside the cell."""
    return Paragraph(str(text) if text is not None else "—", style)


def generate_pdf(data):
    buf = io.BytesIO()

    doc = SimpleDocTemplate(
        buf,
        pagesize=landscape(A4),
        rightMargin=12*mm,
        leftMargin=12*mm,
        topMargin=12*mm,
        bottomMargin=12*mm,
    )

    styles = getSampleStyleSheet()

    # ── Reusable cell paragraph styles ──
    cell_normal = ParagraphStyle(
        "cell_normal", fontSize=7, fontName="Helvetica",
        textColor=colors.black, leading=9, wordWrap="LTR",
    )
    cell_bold = ParagraphStyle(
        "cell_bold", fontSize=7, fontName="Helvetica-Bold",
        textColor=colors.black, leading=9, wordWrap="LTR",
    )
    cell_white = ParagraphStyle(
        "cell_white", fontSize=7, fontName="Helvetica-Bold",
        textColor=WHITE, leading=9, wordWrap="LTR",
    )
    cell_green = ParagraphStyle(
        "cell_green", fontSize=7, fontName="Helvetica-Bold",
        textColor=WHITE, leading=9, wordWrap="LTR",
    )
    cell_mono = ParagraphStyle(
        "cell_mono", fontSize=7, fontName="Courier",
        textColor=colors.black, leading=9, wordWrap="LTR",
    )
    cell_amber = ParagraphStyle(
        "cell_amber", fontSize=7, fontName="Helvetica-Oblique",
        textColor=colors.HexColor("#856404"), leading=9, wordWrap="LTR",
    )
    cell_red = ParagraphStyle(
        "cell_red", fontSize=7, fontName="Helvetica",
        textColor=RED, leading=9, wordWrap="LTR",
    )
    cell_purp = ParagraphStyle(
        "cell_purp", fontSize=7, fontName="Helvetica",
        textColor=PURP, leading=9, wordWrap="LTR",
    )
    cell_right = ParagraphStyle(
        "cell_right", fontSize=7, fontName="Helvetica",
        textColor=colors.black, leading=9, wordWrap="LTR",
        alignment=TA_RIGHT,
    )

    story  = []

    title_style = ParagraphStyle(
        "title", fontSize=20, textColor=BLUE,
        spaceAfter=2*mm, fontName="Helvetica-Bold",
    )
    sub_style = ParagraphStyle(
        "sub", fontSize=9, textColor=GRAY, spaceAfter=5*mm,
    )
    section_style = ParagraphStyle(
        "section", fontSize=10, textColor=DARK,
        fontName="Helvetica-Bold", spaceBefore=4*mm, spaceAfter=2*mm,
    )

    # ── TITLE ──
    story.append(Paragraph("EMS AI QUOTATION SYSTEM", title_style))
    story.append(Paragraph(
        f"Ref: {data.get('ref','QT-001')}  |  Date: {date.today().strftime('%d %b %Y')}",
        sub_style
    ))
    story.append(HRFlowable(width="100%", thickness=1, color=BLUE))
    story.append(Spacer(1, 4*mm))

    # ── PROJECT INFO ──
    info_data = [
        [_p("Customer", cell_bold),  _p(data.get("customer","—"), cell_normal),
         _p("Project",  cell_bold),  _p(data.get("project","—"),  cell_normal)],
        [_p("Quotation",cell_bold),  _p(data.get("ref","—"),      cell_normal),
         _p("Date",     cell_bold),  _p(date.today().strftime("%d %B %Y"), cell_normal)],
        [_p("Quantity", cell_bold),  _p(f"{data.get('qty',1)} pcs", cell_normal),
         _p("Valid for",cell_bold),  _p("30 days", cell_normal)],
    ]
    info_table = Table(info_data, colWidths=[30*mm, 90*mm, 28*mm, 90*mm])
    info_table.setStyle(TableStyle([
        ("FONTSIZE",  (0,0),(-1,-1), 8),
        ("BACKGROUND",(0,0),(-1,-1), LIGHT),
        ("ROWBACKGROUNDS",(0,0),(-1,-1),[LIGHT, WHITE]),
        ("GRID",      (0,0),(-1,-1), 0.5, colors.HexColor("#d0d8f0")),
        ("PADDING",   (0,0),(-1,-1), 5),
        ("VALIGN",    (0,0),(-1,-1), "MIDDLE"),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 5*mm))

    # ── COST SUMMARY ──
    bom_cost  = float(data.get("bom_cost", 0))
    asm_cost  = float(data.get("asm_cost", 0))
    margin    = float(data.get("margin", 0))
    qty       = float(data.get("qty", 1))
    sub_cost  = bom_cost + asm_cost
    markup    = sub_cost * (margin / 100)
    sell_unit = sub_cost + markup

    rfq_parts = data.get("rfq_parts", [])

    story.append(Paragraph("COST SUMMARY", section_style))

    cost_data = [
        [_p("Item", cell_white),
         _p("Per Board (€)", cell_white),
         _p(f"Total ×{int(qty)} pcs (€)", cell_white)],

        [_p("Component cost (BOM — priced parts only)", cell_normal),
         _p(f"{bom_cost:.4f}", cell_right),
         _p(f"{bom_cost*qty:.2f}", cell_right)],

        [_p("Assembly cost", cell_normal),
         _p(f"{asm_cost:.2f}", cell_right),
         _p(f"{asm_cost*qty:.2f}", cell_right)],

        [_p("Subtotal", cell_bold),
         _p(f"{sub_cost:.4f}", cell_right),
         _p(f"{sub_cost*qty:.2f}", cell_right)],

        [_p(f"Margin ({margin:.0f}%)", cell_normal),
         _p(f"{markup:.4f}", cell_right),
         _p(f"{markup*qty:.2f}", cell_right)],

        [_p("SELL PRICE", cell_green),
         _p(f"{sell_unit:.2f}", ParagraphStyle("cr", fontSize=7, fontName="Helvetica-Bold",
            textColor=WHITE, leading=9, alignment=TA_RIGHT)),
         _p(f"{sell_unit*qty:.2f}", ParagraphStyle("cr2", fontSize=7, fontName="Helvetica-Bold",
            textColor=WHITE, leading=9, alignment=TA_RIGHT))],
    ]

    if rfq_parts:
        rfq_text = f"⚠ RFQ parts excluded ({len(rfq_parts)}): {', '.join(rfq_parts[:5])}{'...' if len(rfq_parts)>5 else ''}"
        cost_data.insert(2, [
            _p(rfq_text, cell_amber),
            _p("—", cell_amber),
            _p("—", cell_amber),
        ])

    cost_table = Table(cost_data, colWidths=[150*mm, 50*mm, 58*mm])
    cost_style = [
        ("FONTSIZE",    (0,0),(-1,-1), 8),
        ("BACKGROUND",  (0,0),(-1,0),  DARK),
        ("BACKGROUND",  (0,-1),(-1,-1),GREEN),
        ("ROWBACKGROUNDS",(0,1),(-1,-2),[WHITE, LIGHT]),
        ("GRID",        (0,0),(-1,-1), 0.5, colors.HexColor("#d0d8f0")),
        ("PADDING",     (0,0),(-1,-1), 5),
        ("VALIGN",      (0,0),(-1,-1), "MIDDLE"),
    ]
    if rfq_parts:
        rfq_row_idx = 2
        cost_style.append(("BACKGROUND", (0,rfq_row_idx),(-1,rfq_row_idx), colors.HexColor("#fff3cd")))

    cost_table.setStyle(TableStyle(cost_style))
    story.append(cost_table)
    story.append(Spacer(1, 5*mm))

    # ── AI DESCRIPTION ──
    ai_desc = data.get("ai_description", "")
    if ai_desc:
        story.append(Paragraph("SCOPE OF WORK", section_style))
        story.append(Paragraph(ai_desc, ParagraphStyle(
            "desc", fontSize=8, textColor=colors.black, leading=12, spaceAfter=4*mm,
        )))

    # ── BOM TABLE ──
    story.append(Paragraph("BILL OF MATERIALS", section_style))

    # Header row — all Paragraphs with white bold style
    bom_header = [
        _p("#",            cell_white),
        _p("Ref",          cell_white),
        _p("Description",  cell_white),
        _p("MPN",          cell_white),
        _p("Manufacturer", cell_white),
        _p("Package",      cell_white),
        _p("Qty",          cell_white),
        _p("Unit Price",   cell_white),
        _p("Per Board",    cell_white),
        _p("Extended",     cell_white),
        _p("Seller",       cell_white),   # renamed from "Supplier"
        _p("Total Price",  cell_white),   # renamed from "Stock"
        _p("Status",       cell_white),
    ]
    bom_rows_data = [bom_header]

    active_bom = [r for r in data.get("bom", []) if r.get("dnp") != "Y"]

    row_styles = []
    row_offset = 1  # header is row 0

    for i, row in enumerate(active_bom, 1):
        real_row = row_offset + i - 1

        price_state = row.get("price_state", "")
        unit_price  = row.get("unit_price") or row.get("nexar_price") or row.get("digikey_price")
        is_rfq      = price_state == "rfq" or row.get("nexar_supplier") == "RFQ"
        is_manual   = price_state == "manual"
        is_oos      = row.get("nexar_stock") == 0 and unit_price
        is_unpriced = not unit_price and not is_rfq

        comp_qty  = row.get("qty", 1)
        board_qty = float(data.get("qty", 1))

        if is_rfq:
            unit_str      = _p("RFQ",    cell_amber)
            per_board_str = _p("RFQ",    cell_amber)
            extended_str  = _p("RFQ",    cell_amber)
            seller_str    = _p("RFQ",    cell_amber)
            total_str     = _p("—",      cell_amber)
            status_str    = _p("RFQ",    cell_amber)
            row_styles.append(("BACKGROUND", (0,real_row),(-1,real_row), colors.HexColor("#fff3cd")))

        elif is_unpriced:
            unit_str      = _p("No price", cell_red)
            per_board_str = _p("—",        cell_red)
            extended_str  = _p("—",        cell_red)
            seller_str    = _p("—",        cell_red)
            total_str     = _p("—",        cell_red)
            status_str    = _p("Unpriced", cell_red)
            row_styles.append(("BACKGROUND", (0,real_row),(-1,real_row), colors.HexColor("#fff0f0")))

        else:
            per_board = float(unit_price) * float(comp_qty)
            extended  = per_board * board_qty

            unit_str      = _p(f"€{float(unit_price):.4f}", cell_normal)
            per_board_str = _p(f"€{per_board:.4f}",         cell_normal)
            extended_str  = _p(f"€{extended:.2f}",          cell_normal)

            # Total price column = extended cost (per board × qty)
            total_str     = _p(f"€{extended:.2f}", cell_normal)

            if is_manual:
                seller_str = _p("Manual", cell_purp)
                status_str = _p("Manual", cell_purp)
                row_styles.append(("BACKGROUND", (0,real_row),(-1,real_row), colors.HexColor("#f5f0ff")))
            else:
                supplier_name = row.get("nexar_supplier") or row.get("digikey_supplier") or "—"
                seller_str = _p(supplier_name, cell_normal)
                if is_oos:
                    status_str = _p("OOS", cell_red)
                    row_styles.append(("TEXTCOLOR", (11,real_row),(11,real_row), RED))
                else:
                    status_str = _p("OK", ParagraphStyle("ok", fontSize=7, fontName="Helvetica",
                                    textColor=GREEN, leading=9))

        bom_rows_data.append([
            _p(str(i),                          cell_normal),
            _p(str(row.get("ref","—")),          cell_mono),
            _p(str(row.get("description","—")), cell_normal),
            _p(str(row.get("mpn","—")),          cell_mono),
            _p(str(row.get("manufacturer","—")), cell_normal),
            _p(str(row.get("package","—")),      cell_mono),
            _p(str(comp_qty),                    cell_normal),
            unit_str,
            per_board_str,
            extended_str,
            seller_str,
            total_str,
            status_str,
        ])

    # landscape A4 usable width ≈ 257mm
    # Wider Description & MPN, narrower AI/supplier cols
    col_widths = [
         7*mm,   # #
        28*mm,   # Ref
        52*mm,   # Description — wider
        35*mm,   # MPN — wider
        28*mm,   # Manufacturer
        18*mm,   # Package
         8*mm,   # Qty
        20*mm,   # Unit Price
        18*mm,   # Per Board
        18*mm,   # Extended
        20*mm,   # Seller (was Supplier/Mount)
        18*mm,   # Total Price (was Stock)
        13*mm,   # Status
    ]

    bom_table = Table(bom_rows_data, colWidths=col_widths, repeatRows=1)

    base_style = [
        ("FONTSIZE",  (0,0),(-1,-1), 7),
        ("BACKGROUND",(0,0),(-1,0),  DARK),
        ("ALIGN",     (0,0),(0,-1),  "CENTER"),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),[WHITE, LIGHT]),
        ("GRID",      (0,0),(-1,-1), 0.3, colors.HexColor("#d0d8f0")),
        ("PADDING",   (0,0),(-1,-1), 3),
        ("VALIGN",    (0,0),(-1,-1), "TOP"),
    ]
    base_style.extend(row_styles)
    bom_table.setStyle(TableStyle(base_style))
    story.append(bom_table)
    story.append(Spacer(1, 5*mm))

    # ── LEGEND ──
    legend_items = [
        (_p("Legend:", ParagraphStyle("lb", fontSize=7, fontName="Helvetica-Bold",
                        textColor=DARK, leading=9)), 15*mm),
        (_p("✓ OK = priced & in stock",
            ParagraphStyle("lg", fontSize=7, textColor=GREEN, leading=9)), 45*mm),
        (_p("OOS = priced but out of stock",
            ParagraphStyle("la", fontSize=7, textColor=AMBER, leading=9)), 48*mm),
        (_p("RFQ = awaiting supplier quote (excluded from total)",
            ParagraphStyle("lr", fontSize=7, textColor=AMBER, leading=9)), 72*mm),
        (_p("Unpriced = no price found",
            ParagraphStyle("lu", fontSize=7, textColor=RED, leading=9)), 40*mm),
        (_p("Manual = manually entered price",
            ParagraphStyle("lm", fontSize=7, textColor=PURP, leading=9)), 40*mm),
    ]
    legend_data  = [[item[0] for item in legend_items]]
    legend_widths = [item[1] for item in legend_items]
    legend_table = Table(legend_data, colWidths=legend_widths)
    legend_table.setStyle(TableStyle([
        ("FONTSIZE",  (0,0),(-1,-1), 7),
        ("PADDING",   (0,0),(-1,-1), 2),
        ("VALIGN",    (0,0),(-1,-1), "MIDDLE"),
    ]))
    story.append(legend_table)
    story.append(Spacer(1, 3*mm))

    # ── TERMS ──
    story.append(HRFlowable(width="100%", thickness=0.5, color=GRAY))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(
        "Terms: This quotation is valid for 30 days. Prices subject to component availability. "
        "RFQ items excluded from total — final price to be confirmed. "
        "Generated by EMS AI Quotation System.",
        ParagraphStyle("terms", fontSize=7, textColor=GRAY, leading=10)
    ))

    doc.build(story)
    buf.seek(0)
    return buf