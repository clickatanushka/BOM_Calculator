def run(bom_cost, asm_cost, margin, qty):
    """Calculate full quotation"""
    sub    = bom_cost + asm_cost
    markup = sub * (margin / 100)
    sell_u = sub + markup
    sell_t = sell_u * qty
    return {
        "bom_cost":   bom_cost,
        "asm_cost":   asm_cost,
        "sub_cost":   sub,
        "markup":     markup,
        "sell_unit":  sell_u,
        "sell_total": sell_t,
        "qty":        qty,
    }
