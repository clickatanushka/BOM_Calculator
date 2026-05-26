# ==========================================
# FULL BOM PRICING VERIFICATION
# Automatically checks all 51 parts
# ==========================================
import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from price_engine import search_part, to_eur

BOARD_QTY = 1500  # ← change this to test different quantities

TEST_PARTS = [
    ("DF40B(2.0)-80DS-0.4V(51)", 2),
    ("SFV22R-2STE1HLF",          2),
    ("IIM-42652",                 1),
    ("KGM05CR71H104KH",          22),
    ("KGM05AR71H103KH",           4),
    ("KGM05AR71H102KH",           1),
    ("KGM05BK71A225MH",           3),
    ("GMC04X7R471K50NT",          2),
    ("LMK107BBJ106MALT",          5),
    ("CL10B105KP8NNNC",           1),
    ("CL21A476MQYNNNE",           6),
    ("10129378-903001BLF",        16),
    ("TCM1C225M8R-CA2",           1),
    ("MCP2562-H/MF",              1),
    ("MEM2075-00-140-01-A",       1),
    ("BM04B-GHS-TBT",             4),
    ("BM06B-GHS-TBT",             3),
    ("BM10B-GHS-TBT",             1),
    ("SM08B-GHS-TB",              1),
    ("MFBW1V1608-601-R",          2),
    ("QBLP601-IB5",               1),
    ("QBLP601-AG15",              1),
    ("QBLP601-R35",               1),
    ("MMC5983MA",                 1),
    ("MS561101BA03-50",           1),
    ("5024430670",                1),
    ("STM32L4P5CGU6",             1),
    ("RC0402FR-0733RL",           5),
    ("RMCF0402FT75R0",            3),
    ("RMCF0402FT120R",            7),
    ("RMCF0402FT220R",           28),
    ("RMCF0402FT330R",            1),
    ("RMCF0402FT100K",            1),
    ("RMCF0402FT12K1",           10),
    ("RMCF0402FT1K00",            3),
    ("RMCF0402FT25K5",            9),
    ("RMCF0402FT2K20",           11),
    ("RMCF0402FT43K2",            1),
    ("RMCF0402FT49R9",            4),
    ("RMCF0402FT5K10",            4),
    ("TPSM33625FRDNR",            1),
    ("CSTNE8M00GH5L000R0",        1),
    ("FM24V05-GTR",               1),
    ("SM453229-381N7Y",           2),
    ("AO3400A",                   1),
    ("TLV809EF30DBZR",            1),
    ("MIC5219-3.3YM5-TR",         1),
    ("SRF2012A-801Y",             2),
    ("TPS2121RUXR",               1),
    ("USB4110-GF-A",              1),
    ("LAN8742AI-CZ-TR",           1),
]

print("=" * 100)
print(f"FULL BOM VERIFICATION — {BOARD_QTY} boards | {len(TEST_PARTS)} parts")
print("=" * 100)

results_log = []
no_price    = []
moq_warn    = []
oos_warn    = []
logic_issues = []
cheaper_oos_list = []

start = time.time()

for idx, (mpn, comp_qty) in enumerate(TEST_PARTS, 1):
    total_qty = comp_qty * BOARD_QTY

    print(f"\n[{idx:02d}/{len(TEST_PARTS)}] {mpn} | qty/board:{comp_qty} | total:{total_qty}")

    result = search_part(mpn, total_qty)

    if not result:
        print(f"  ❌ NOT FOUND")
        no_price.append(mpn)
        results_log.append({
            "mpn": mpn, "status": "NOT FOUND",
            "winner": None, "unit_eur": None, "extended": None
        })
        continue

    suppliers = result["top3_suppliers"]
    winner    = suppliers[0]
    w_eur     = winner.get("price_eur", to_eur(winner["price"], winner.get("currency","USD")))
    w_fill    = winner["stock"] >= total_qty
    ext       = round(w_eur * total_qty, 2)
    per_board = round(w_eur * comp_qty, 4)

    # Print supplier table
    print(f"  {'SUPPLIER':<15} {'RAW':>10} {'EUR':>10} {'STOCK':>10} {'FILL':>6} {'NOTE'}")
    print(f"  {'─'*65}")
    for s in suppliers:
        s_eur    = s.get("price_eur", to_eur(s["price"], s.get("currency","USD")))
        can_fill = s["stock"] >= total_qty
        is_win   = s["supplier"] == winner["supplier"]
        # Check if best qualifying tier exists
        breaks     = s.get("price_breaks", [])
        qualifying = [b for b in breaks if b.get("qualifies")]
        tier_note  = f"tier:{qualifying[-1]['qty']}+" if qualifying else "⚠MOQ"
        print(f"  {'★ ' if is_win else '  '}{s['supplier']:<13} "
              f"{s.get('currency','')}{s['price']:>8.4f} "
              f"€{s_eur:>9.4f} "
              f"{s['stock']:>10,} "
              f"{'✓' if can_fill else '✗':>6}  {tier_note}")

    print(f"  → €{w_eur:.4f}/unit | €{per_board:.4f}/board | €{ext:.2f} total | "
          f"{'✓ fills order' if w_fill else '✗ CANNOT FILL'}")

    # ── VERIFY LOGIC ──
    status = "OK"

    # 1. Check if winner is truly cheapest in-stock
    in_stock = [s for s in suppliers if s["stock"] >= total_qty]
    if in_stock:
        best = min(in_stock, key=lambda x: x.get("price_eur", to_eur(x["price"], x.get("currency","USD"))))
        if best["supplier"] != winner["supplier"]:
            msg = f"LOGIC ERROR: picked {winner['supplier']} but {best['supplier']} is cheaper+instock"
            print(f"  ❌ {msg}")
            logic_issues.append(f"{mpn}: {msg}")
            status = "LOGIC ERROR"
        else:
            print(f"  ✓ Correct winner")
    else:
        print(f"  ⚠ No supplier can fill {total_qty} pcs")
        oos_warn.append(f"{mpn} (need {total_qty}, best: {max(s['stock'] for s in suppliers):,})")
        status = "OOS"

    # 2. MOQ check
    winner_breaks = winner.get("price_breaks", [])
    qualifying    = [b for b in winner_breaks if b.get("qualifies")]
    if not qualifying and winner_breaks:
        moq_warn.append(f"{mpn} @ {winner['supplier']} (min {winner_breaks[0]['qty']}+, need {total_qty})")
        if status == "OK":
            status = "MOQ"

    # 3. Cheaper OOS
    if result.get("cheaper_oos"):
        oos_cheaper = next((s for s in suppliers
                           if s.get("price_eur", to_eur(s["price"], s.get("currency","USD"))) < w_eur
                           and s["stock"] < total_qty), None)
        if oos_cheaper:
            cheaper_oos_list.append(
                f"{mpn}: {oos_cheaper['supplier']} €"
                f"{oos_cheaper.get('price_eur', to_eur(oos_cheaper['price'], oos_cheaper.get('currency','USD'))):.4f} "
                f"vs winner €{w_eur:.4f}"
            )
            print(f"  💜 Cheaper OOS: {oos_cheaper['supplier']}")

    results_log.append({
        "mpn":       mpn,
        "status":    status,
        "winner":    winner["supplier"],
        "unit_eur":  w_eur,
        "per_board": per_board,
        "extended":  ext,
        "stock":     winner["stock"],
    })

elapsed = time.time() - start

# ── FINAL SUMMARY ──
print(f"\n{'='*100}")
print(f"VERIFICATION COMPLETE — {elapsed:.1f}s")
print(f"{'='*100}")

ok       = [r for r in results_log if r["status"] == "OK"]
moq      = [r for r in results_log if r["status"] == "MOQ"]
oos      = [r for r in results_log if r["status"] == "OOS"]
errors   = [r for r in results_log if r["status"] == "LOGIC ERROR"]
notfound = [r for r in results_log if r["status"] == "NOT FOUND"]

total_bom_cost = sum(r["extended"] for r in results_log if r["extended"])
per_board_cost = sum(r["per_board"] for r in results_log if r["per_board"])

print(f"\n  {'METRIC':<35} {'VALUE':>10}")
print(f"  {'─'*50}")
print(f"  {'Total parts:':<35} {len(TEST_PARTS):>10}")
print(f"  {'✓ Correctly priced:':<35} {len(ok):>10}")
print(f"  {'⚠ MOQ issues:':<35} {len(moq_warn):>10}")
print(f"  {'⚠ OOS (no supplier fills qty):':<35} {len(oos_warn):>10}")
print(f"  {'💜 Cheaper supplier OOS:':<35} {len(cheaper_oos_list):>10}")
print(f"  {'❌ Not found:':<35} {len(notfound):>10}")
print(f"  {'❌ Logic errors:':<35} {len(logic_issues):>10}")
print(f"  {'─'*50}")
accuracy = (len(ok) + len(moq) + len(oos)) / len(TEST_PARTS) * 100
print(f"  {'Pricing accuracy:':<35} {accuracy:>9.1f}%")
print(f"  {'─'*50}")
print(f"  {'BOM cost per board:':<35} €{per_board_cost:>9.4f}")
print(f"  {'Total procurement cost:':<35} €{total_bom_cost:>9.2f}")

if logic_issues:
    print(f"\n❌ LOGIC ERRORS (wrong supplier selected):")
    for e in logic_issues: print(f"    {e}")

if no_price:
    print(f"\n❌ NOT FOUND on any supplier:")
    for p in no_price: print(f"    {p}")

if moq_warn:
    print(f"\n⚠ MOQ ISSUES (your qty is below supplier minimum):")
    for p in moq_warn: print(f"    {p}")

if oos_warn:
    print(f"\n⚠ OOS — no supplier can fill required qty:")
    for p in oos_warn: print(f"    {p}")

if cheaper_oos_list:
    print(f"\n💜 CHEAPER ALTERNATIVES (currently OOS — worth monitoring):")
    for p in cheaper_oos_list: print(f"    {p}")

if not logic_issues and not no_price:
    print(f"\n✅ No logic errors — all winners correctly selected!")