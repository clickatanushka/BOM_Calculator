from smt_checker import check_smt

def run(bom_rows):
    """Run SMT feasibility check on BOM"""
    return check_smt(bom_rows)
