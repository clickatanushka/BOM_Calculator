# ==========================================
# EMAIL DRAFTER
# Uses Groq AI to write professional emails
# ==========================================

from ai_helper import ask_ai


def draft_quotation_email(data):
    """
    data = {
        customer, project, qty,
        sell_unit, sell_total,
        bom_lines, high_risk_count,
        ref
    }
    Returns a ready-to-send email string
    """

    prompt = f"""Write a professional EMS quotation email with these exact details:

Customer: {data.get('customer', 'Customer')}
Project: {data.get('project', 'PCB Project')}
Quotation Ref: {data.get('ref', 'QT-001')}
Board Quantity: {data.get('qty', 100)} pcs
Sell Price per Board: €{data.get('sell_unit', 0):.2f}
Total Value: €{data.get('sell_total', 0):.2f}
BOM Lines: {data.get('bom_lines', 0)} components
High Risk Parts: {data.get('high_risk_count', 0)}

Write the email in this structure:
1. Subject line
2. Greeting
3. Thank them for the RFQ
4. State the quotation details clearly
5. Mention lead time is to be confirmed
6. Mention the quotation is valid for 30 days
7. Professional closing

Keep it concise and professional. Plain text only."""

    return ask_ai(prompt, "")


def draft_follow_up_email(data):
    """Draft a follow-up email for an existing quotation"""

    prompt = f"""Write a short professional follow-up email for:

Customer: {data.get('customer', 'Customer')}
Project: {data.get('project', 'PCB Project')}
Quotation Ref: {data.get('ref', 'QT-001')}
Days since quotation: {data.get('days', 7)}

Keep it polite, short, 3-4 sentences max. Plain text only."""

    return ask_ai(prompt, "")
