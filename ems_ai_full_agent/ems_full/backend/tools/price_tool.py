from digikey_helper import enrich_bom

def run(bom_rows):
    """Fetch live DigiKey prices for all BOM rows"""
    return enrich_bom(bom_rows)
