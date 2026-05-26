# # ==========================================
# # PRICE ENGINE
# # DigiKey + Mouser + Farnell (Germany/EUR)
# # Parallel requests, quantity-aware pricing
# # ==========================================

# import requests
# import concurrent.futures
# import math

# # ==========================================
# # HARDCODE YOUR KEYS HERE
# # ==========================================

# DIGIKEY_CLIENT_ID     ="xZNLqBj9kFGjls5vRocFu6tnSVj932GlpLgGTkmXrqWvsetK"
# DIGIKEY_CLIENT_SECRET ="nX3vtCXALui2UAIbIfLFyFWlFobXTx1NADDBofyUSGTgI58yeUiN5R3Yy1pBbk0L"
# MOUSER_API_KEY        = "9c8eaed4-a677-423c-8244-551eb1e2661e"
# FARNELL_API_KEY       = "938axehsy28jawa4f2ferb6y"

# DIGIKEY_TOKEN_URL  = "https://api.digikey.com/v1/oauth2/token"
# DIGIKEY_SEARCH_URL = "https://api.digikey.com/products/v4/search/keyword"
# MOUSER_SEARCH_URL  = "https://api.mouser.com/api/v1/search/partnumber"
# FARNELL_SEARCH_URL = "https://api.element14.com/catalog/products"
# FARNELL_STORE      = "de.farnell.com"


# # ==========================================
# # HELPERS
# # ==========================================
# def safe_float(value):
#     try:
#         f = float(str(value).replace("$","").replace("€","").replace(",","").strip())
#         return None if (math.isnan(f) or math.isinf(f) or f == 0) else f
#     except:
#         return None


# def best_price_for_qty(price_breaks, total_qty, qty_key, price_key):
#     if not price_breaks:
#         return None
#     best = None
#     for pb in sorted(price_breaks, key=lambda x: int(x.get(qty_key, 1) or 1)):
#         if int(pb.get(qty_key, 1) or 1) <= total_qty:
#             p = safe_float(pb.get(price_key, 0))
#             if p:
#                 best = p
#     if best is None and price_breaks:
#         best = safe_float(price_breaks[0].get(price_key, 0))
#     return best


# # ==========================================
# # DIGIKEY
# # Fix: UnitPrice is directly on product,
# # StandardPricing has price breaks
# # ==========================================
# _dk_token = {"token": None}

# def get_digikey_token():
#     if _dk_token["token"]:
#         return _dk_token["token"]
#     try:
#         res = requests.post(DIGIKEY_TOKEN_URL, data={
#             "client_id":     DIGIKEY_CLIENT_ID,
#             "client_secret": DIGIKEY_CLIENT_SECRET,
#             "grant_type":    "client_credentials",
#         }, timeout=10)
#         if res.status_code != 200:
#             print(f"DigiKey token error {res.status_code}")
#             return None
#         token = res.json().get("access_token")
#         _dk_token["token"] = token
#         return token
#     except Exception as e:
#         print("DigiKey token exception:", e)
#         return None


# def search_digikey(mpn, total_qty=1, exact=True):
#     token = get_digikey_token()
#     if not token:
#         return None

#     headers = {
#         "Authorization":             f"Bearer {token}",
#         "X-DIGIKEY-Client-Id":       DIGIKEY_CLIENT_ID,
#         "Content-Type":              "application/json",
#         "X-DIGIKEY-Locale-Site":     "US",
#         "X-DIGIKEY-Locale-Language": "en",
#         "X-DIGIKEY-Locale-Currency": "USD",
#     }

#     try:
#         res = requests.post(
#             DIGIKEY_SEARCH_URL,
#             headers=headers,
#             json={"Keywords": mpn, "Limit": 5, "Offset": 0},
#             timeout=15,
#         )
#         if res.status_code != 200:
#             print(f"DigiKey search error {res.status_code} for {mpn}")
#             return None

#         products = res.json().get("Products", [])
#         if not products:
#             return None

#         # find exact MPN match
#         matched = None
#         for p in products:
#             if (p.get("ManufacturerProductNumber") or "").strip().upper() == mpn.strip().upper():
#                 matched = p
#                 break

#         if not matched:
#             if exact:
#                 return None
#             matched = products[0]

#         # try StandardPricing for quantity breaks first
#         print("\nDIGIKEY STANDARD PRICING:")
#         print(matched.get("StandardPricing"))
#         variations = matched.get("ProductVariations", [])

#         variation = variations[0] if variations else {}

#         standard_pricing = variation.get("StandardPricing", [])

#         print("\nDIGIKEY STANDARD PRICING:")
#         print(standard_pricing)

#         # quantity tier pricing
#         price = best_price_for_qty(
#             standard_pricing,
#             total_qty,
#             "BreakQuantity",
#             "UnitPrice"
#         )

#         # fallback
#         if not price:
#             price = safe_float(variation.get("UnitPrice", 0))

#         # final fallback
#         if not price:
#             price = safe_float(matched.get("UnitPrice", 0))

#         if not price:
#             return None

#         price_breaks_formatted = []
#         for pb in standard_pricing:
#             p = safe_float(pb.get("UnitPrice", 0))
#             q = int(pb.get("BreakQuantity", 1) or 1)
#             if p:
#                 price_breaks_formatted.append({
#                 "qty":   q,
#                 "price": round(p, 4),
#                 "total": round(p * total_qty, 2)  # total cost at this break for your qty
#             })

#         total_cost = round(price * total_qty, 2)

#         return {
#             "supplier": "DigiKey",

#             # UNIT PRICE
#             "price": round(price, 4),

#             # TOTAL COST for all required quantity
#             "extended_price": round(price * total_qty, 2),

#             "unit_price": round(price, 4),

#             "required_qty": total_qty,

#             "stock": int(matched.get("QuantityAvailable", 0) or 0),

#             "currency": "USD",

#             "url": matched.get("ProductUrl", ""),

#             "price_breaks": price_breaks_formatted,
#         }

#     except Exception as e:
#         print(f"DigiKey exception for {mpn}:", e)
#         return None


# # ==========================================
# # MOUSER
# # ==========================================
# def search_mouser(mpn, total_qty=1, exact=True):
#     if not MOUSER_API_KEY:
#         return None

#     try:
#         res = requests.post(
#             f"{MOUSER_SEARCH_URL}?apiKey={MOUSER_API_KEY}",
#             json={"SearchByPartRequest": {
#                 "mouserPartNumber":  mpn,
#                 "partSearchOptions": "",
#             }},
#             headers={"Content-Type": "application/json"},
#             timeout=15,
#         )
#         if res.status_code != 200:
#             print(f"Mouser error {res.status_code} for {mpn}")
#             return None

#         data = res.json()

#         # check for API errors
#         errors = data.get("Errors", [])
#         if errors:
#             print(f"Mouser API error for {mpn}:", errors[0].get("Message", ""))
#             return None

#         parts = (data.get("SearchResults") or {}).get("Parts", [])
#         if not parts:
#             return None

#         # find exact MPN match
#         matched = None
#         for p in parts:
#             if (p.get("ManufacturerPartNumber") or "").strip().upper() == mpn.strip().upper():
#                 matched = p
#                 break

#         if not matched:
#             if exact:
#                 return None
#             matched = parts[0]

#         # price breaks
#         price_breaks = matched.get("PriceBreaks", [])
#         best = None
#         for pb in sorted(price_breaks, key=lambda x: int(x.get("Quantity", 1) or 1)):
#             if int(pb.get("Quantity", 1) or 1) <= total_qty:
#                 p = safe_float(pb.get("Price", "0"))
#                 if p:
#                     best = p

#         if best is None and price_breaks:
#             best = safe_float(price_breaks[0].get("Price", "0"))

#         if not best:
#             return None

#         stock_str = str(matched.get("Availability", "0")).replace(",", "").split()[0]
#         try:
#             stock = int(stock_str)
#         except:
#             stock = 0

#         total_cost = round(best * total_qty, 2)

#         return {
#             "supplier": "Mouser",

#             # UNIT PRICE
#             "price": round(best, 4),

#             # TOTAL COST for required quantity
#             "extended_price": round(best * total_qty, 2),

#             "unit_price": round(best, 4),

#             "required_qty": total_qty,

#             "stock": stock,

#             "currency": "USD",

#             "url": matched.get("ProductDetailUrl", ""),
#         }
#     except Exception as e:
#         print(f"Mouser exception for {mpn}:", e)
#         return None


# # ==========================================
# # FARNELL (Germany — EUR)
# # Fix: response key is manufacturerPartNumberSearchReturn
# # ==========================================
# def search_farnell(mpn, total_qty=1, exact=True):
#     if not FARNELL_API_KEY:
#         return None

#     try:
#         res = requests.get(
#             FARNELL_SEARCH_URL,
#             params={
#                 "callInfo.apiKey":                 FARNELL_API_KEY,
#                 "callInfo.responseDataFormat":     "JSON",
#                 "storeInfo.id":                    FARNELL_STORE,
#                 "term":                            f"manuPartNum:{mpn}",
#                 "resultsSettings.numberOfResults": 5,
#                 "resultsSettings.offset":          0,
#                 "resultsSettings.responseGroup":   "prices",
#             },
#             timeout=15,
#         )

#         if res.status_code != 200:
#             print(f"Farnell error {res.status_code} for {mpn}")
#             return None

#         data = res.json()

#         # Farnell returns either of these keys depending on search type
#         search_return = (
#             data.get("manufacturerPartNumberSearchReturn") or
#             data.get("keywordSearchReturn") or
#             {}
#         )

#         products = search_return.get("products", [])
#         if not products:
#             return None

#         # find exact match
#         matched = None
#         for p in products:
#             pn = (p.get("translatedManufacturerPartNumber") or
#                   p.get("sku") or "").strip().upper()
#             if pn == mpn.strip().upper():
#                 matched = p
#                 break

#         if not matched:
#             if exact:
#                 return None
#             matched = products[0]

#         # Farnell prices: [{from:10, to:99, cost:0.0034}]
#         price_breaks = matched.get("prices", [])
#         best = None
#         for pb in sorted(price_breaks, key=lambda x: int(x.get("from", 1) or 1)):
#             if int(pb.get("from", 1) or 1) <= total_qty:
#                 p = safe_float(pb.get("cost", 0))
#                 if p:
#                     best = p

#         if best is None and price_breaks:
#             best = safe_float(price_breaks[0].get("cost", 0))

#         if not best:
#             return None

#         stock = int(matched.get("stock", {}).get("level", 0) or 0)

#         total_cost = round(best * total_qty, 2)

#         return {
#             "supplier": "Farnell DE",

#             # UNIT PRICE
#             "price": round(best, 4),

#             # TOTAL COST for required quantity
#             "extended_price": round(best * total_qty, 2),

#             "unit_price": round(best, 4),

#             "required_qty": total_qty,

#             "stock": stock,

#             "currency": "EUR",

#             "url": f"https://de.farnell.com/search?st={mpn}","price_breaks": [],

#             "price_breaks": [],
#         }

#     except Exception as e:
#         print(f"Farnell exception for {mpn}:", e)
#         return None


# # ==========================================
# # SEARCH ONE PART — all 3 in parallel
# # ==========================================
# def search_part(mpn, total_qty=1):
#     results = []

#     # exact match on all 3
#     with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
#         futures = {
#             executor.submit(search_digikey, mpn, total_qty, True): "DigiKey",
#             executor.submit(search_mouser,  mpn, total_qty, True): "Mouser",
#             executor.submit(search_farnell, mpn, total_qty, True): "Farnell",
#         }
#         for future in concurrent.futures.as_completed(futures):
#             r = future.result()
#             if r:
#                 results.append(r)

#     # flexible fallback if nothing found
#     if not results:
#         with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
#             futures = {
#                 executor.submit(search_digikey, mpn, total_qty, False): "DigiKey",
#                 executor.submit(search_mouser,  mpn, total_qty, False): "Mouser",
#                 executor.submit(search_farnell, mpn, total_qty, False): "Farnell",
#             }
#             for future in concurrent.futures.as_completed(futures):
#                 r = future.result()
#                 if r:
#                     results.append(r)

#     if not results:
#         return None

#     # In search_part() — replace the return block
#     results.sort(key=lambda x: (
#         x["stock"] < total_qty,   # suppliers that can't fill go last
#         x["price"]                # then cheapest
#     ))

#     cheapest = results[0]

#     return {
#         "cheapest_price":    cheapest["price"],
#         "cheapest_supplier": cheapest["supplier"],
#         "cheapest_currency": cheapest.get("currency", "USD"),
#         "stock":             cheapest["stock"],
#         "price_breaks":      cheapest.get("price_breaks", []),  # ← propagate this
#         "top3_suppliers":    results[:3],
#     }


# # ==========================================
# # ENRICH FULL BOM
# # ==========================================
# def enrich_bom(bom_rows, board_qty=1):
#     enriched = [None] * len(bom_rows)

#     def lookup(args):
#         i, row = args
#         mpn = str(row.get("mpn", "")).strip()

#         if not mpn or mpn.upper() in ("TBD", "—", ""):
#             row["nexar_price"]    = None
#             row["nexar_stock"]    = None
#             row["nexar_supplier"] = None
#             row["nexar_all"]      = []
#             row["digikey_price"]  = None
#             row["digikey_stock"]  = None
#             return i, row

#         total_qty = int(row.get("qty", 1) or 1) * int(board_qty)
#         print(f"  [{i+1}] {mpn} | total qty: {total_qty}")

#         result = search_part(mpn, total_qty)

#                 # In enrich_bom() → lookup() — replace the "if result:" block
#         if result:
#             cheapest = result["top3_suppliers"][0]  # already sorted correctly

#             unit_price  = cheapest["price"]
#             total_qty   = int(row.get("qty", 1) or 1) * int(board_qty)
#             ext_price   = round(unit_price * total_qty, 4)

#             row["nexar_price"]        = unit_price
#             row["nexar_stock"]        = cheapest["stock"]
#             row["nexar_supplier"]     = cheapest["supplier"]
#             row["nexar_all"]          = result["top3_suppliers"]
#             row["nexar_currency"]     = cheapest.get("currency", "USD")
#             row["unit_price"]         = unit_price          # explicit alias
#             row["extended_price"]     = ext_price           # ← THIS was missing
#             row["required_qty"]       = total_qty           # so frontend never needs to recalculate

#             # Price breaks from the cheapest (DigiKey preferred)
#             dk = next((s for s in result["top3_suppliers"] if s["supplier"] == "DigiKey"), None)
#             row["nexar_price_breaks"] = (dk or cheapest).get("price_breaks", [])

#             row["digikey_price"] = dk["price"] if dk else unit_price
#             row["digikey_stock"] = dk["stock"] if dk else cheapest["stock"]
#         else:
#             print(f"    → not found on any supplier")
#             row["nexar_price"]    = None
#             row["nexar_stock"]    = None
#             row["nexar_supplier"] = None
#             row["nexar_all"]      = []
#             row["nexar_currency"] = None
#             row["digikey_price"]  = None
#             row["digikey_stock"]  = None

#         return i, row

#     with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
#         for i, row in executor.map(lookup, enumerate(bom_rows)):
#             enriched[i] = row

#     return enriched

import requests
import concurrent.futures
import math

DIGIKEY_CLIENT_ID     = "xZNLqBj9kFGjls5vRocFu6tnSVj932GlpLgGTkmXrqWvsetK"
DIGIKEY_CLIENT_SECRET = "nX3vtCXALui2UAIbIfLFyFWlFobXTx1NADDBofyUSGTgI58yeUiN5R3Yy1pBbk0L"
MOUSER_API_KEY        = "9c8eaed4-a677-423c-8244-551eb1e2661e"
FARNELL_API_KEY       = "938axehsy28jawa4f2ferb6y"

DIGIKEY_TOKEN_URL  = "https://api.digikey.com/v1/oauth2/token"
DIGIKEY_SEARCH_URL = "https://api.digikey.com/products/v4/search/keyword"
MOUSER_SEARCH_URL  = "https://api.mouser.com/api/v1/search/partnumber"
FARNELL_SEARCH_URL = "https://api.element14.com/catalog/products"
FARNELL_STORE      = "de.farnell.com"


# ==========================================
# HELPERS
# ==========================================
def safe_float(value):
    try:
        f = float(str(value).replace("$", "").replace("€", "").replace(",", "").strip())
        return None if (math.isnan(f) or math.isinf(f) or f == 0) else f
    except:
        return None


def best_price_for_qty(price_breaks, total_qty, qty_key, price_key):
    """
    Given a list of price break dicts, find the best (lowest) unit price
    that applies to total_qty.

    Logic:
      - Sort tiers ascending by break quantity.
      - Walk through: keep updating 'best' as long as break_qty <= total_qty.
        This gives us the deepest qualifying tier.
      - If NO tier qualifies (total_qty < smallest break), use the FIRST
        (smallest) tier price — it's the only price available, and we flag
        it so the caller knows the qty is below minimum.
      - Also return the minimum order qty so the UI can warn the user.
    """
    if not price_breaks:
        return None, None, False

    sorted_breaks = sorted(
        price_breaks,
        key=lambda x: int(x.get(qty_key, 1) or 1)
    )

    best          = None
    below_minimum = False
    min_order_qty = int(sorted_breaks[0].get(qty_key, 1) or 1)

    for pb in sorted_breaks:
        break_qty = int(pb.get(qty_key, 1) or 1)
        if break_qty <= total_qty:
            p = safe_float(pb.get(price_key, 0))
            if p:
                best = p   # keep overwriting — last one that qualifies wins
        # else: break_qty > total_qty, stop qualifying

    if best is None:
        # total_qty is below every break quantity
        # use the first (lowest-break) price as the only available price
        best = safe_float(sorted_breaks[0].get(price_key, 0))
        below_minimum = True
        print(f"    ⚠ qty {total_qty} is below minimum break {min_order_qty} — using min break price")

    return best, min_order_qty, below_minimum


# ==========================================
# DIGIKEY TOKEN
# ==========================================
import time

_dk_token = {"token": None, "expires_at": 0}

def get_digikey_token():
    # If token still valid with 60s buffer, reuse it
    if _dk_token["token"] and time.time() < _dk_token["expires_at"] - 60:
        return _dk_token["token"]
    
    # Otherwise fetch a fresh one
    try:
        res = requests.post(DIGIKEY_TOKEN_URL, data={
            "client_id":     DIGIKEY_CLIENT_ID,
            "client_secret": DIGIKEY_CLIENT_SECRET,
            "grant_type":    "client_credentials",
        }, timeout=10)
        if res.status_code != 200:
            print(f"DigiKey token error {res.status_code}: {res.text[:200]}")
            return None
        data = res.json()
        _dk_token["token"]      = data.get("access_token")
        _dk_token["expires_at"] = time.time() + int(data.get("expires_in", 599))
        print(f"DigiKey token refreshed, expires in {data.get('expires_in')}s")
        return _dk_token["token"]
    except Exception as e:
        print("DigiKey token exception:", e)
        return None


# ==========================================
# DIGIKEY SEARCH
# ==========================================
def search_digikey(mpn, total_qty=1, exact=True):
    token = get_digikey_token()
    if not token:
        return None

    headers = {
        "Authorization":             f"Bearer {token}",
        "X-DIGIKEY-Client-Id":       DIGIKEY_CLIENT_ID,
        "Content-Type":              "application/json",
        "X-DIGIKEY-Locale-Site":     "US",
        "X-DIGIKEY-Locale-Language": "en",
        "X-DIGIKEY-Locale-Currency": "USD",
    }

    try:
        res = requests.post(
            DIGIKEY_SEARCH_URL,
            headers=headers,
            json={"Keywords": mpn, "Limit": 5, "Offset": 0},
            timeout=15,
        )
        if res.status_code != 200:
            print(f"DigiKey search error {res.status_code} for {mpn}")
            return None

        products = res.json().get("Products", [])
        if not products:
            return None

        matched = None
        for p in products:
            if (p.get("ManufacturerProductNumber") or "").strip().upper() == mpn.strip().upper():
                matched = p
                break
        if not matched:
            if exact:
                return None
            matched = products[0]

        # Price breaks live on ProductVariations[0].StandardPricing
        variations      = matched.get("ProductVariations", [])
        variation       = variations[0] if variations else {}
        standard_pricing = variation.get("StandardPricing", [])

        print(f"    DigiKey tiers for {mpn}: {standard_pricing}")

        # ── KEY FIX: pass total_qty so we get the correct tier ──
        price, min_qty, below_min = best_price_for_qty(
            standard_pricing,
            total_qty,
            "BreakQuantity",
            "UnitPrice"
        )

        # fallbacks if StandardPricing is empty
        if not price:
            price = safe_float(variation.get("UnitPrice", 0))
        if not price:
            price = safe_float(matched.get("UnitPrice", 0))
        if not price:
            return None

        stock = int(matched.get("QuantityAvailable", 0) or 0)

        # Build price_breaks list for UI display
        price_breaks_formatted = []
        for pb in standard_pricing:
            p_val = safe_float(pb.get("UnitPrice", 0))
            q_val = int(pb.get("BreakQuantity", 1) or 1)
            if p_val:
                price_breaks_formatted.append({
                    "qty":       q_val,
                    "price":     round(p_val, 4),
                    "total":     round(p_val * total_qty, 4),
                    "qualifies": q_val <= total_qty,   # highlight the winning tier in UI
                })

        print(f"    DigiKey → selected unit price: ${price} for qty {total_qty} "
              f"{'(below min, using lowest tier)' if below_min else ''}")

        return {
            "supplier":       "DigiKey",
            "price":          round(price, 4),      # unit price at correct tier
            "unit_price":     round(price, 4),
            "extended_price": round(price * total_qty, 4),
            "required_qty":   total_qty,
            "min_order_qty":  min_qty,
            "below_minimum":  below_min,
            "stock":          stock,
            "currency":       "USD",
            "url":            matched.get("ProductUrl", ""),
            "price_breaks":   price_breaks_formatted,
        }

    except Exception as e:
        print(f"DigiKey exception for {mpn}:", e)
        return None


# ==========================================
# MOUSER SEARCH
# ==========================================
def search_mouser(mpn, total_qty=1, exact=True):
    if not MOUSER_API_KEY:
        return None

    try:
        res = requests.post(
            f"{MOUSER_SEARCH_URL}?apiKey={MOUSER_API_KEY}",
            json={"SearchByPartRequest": {
                "mouserPartNumber":  mpn,
                "partSearchOptions": "",
            }},
            headers={"Content-Type": "application/json"},
            timeout=15,
        )
        if res.status_code != 200:
            print(f"Mouser error {res.status_code} for {mpn}")
            return None

        data   = res.json()
        errors = data.get("Errors", [])
        if errors:
            print(f"Mouser API error for {mpn}:", errors[0].get("Message", ""))
            return None

        parts = (data.get("SearchResults") or {}).get("Parts", [])
        if not parts:
            return None

        matched = None
        for p in parts:
            if (p.get("ManufacturerPartNumber") or "").strip().upper() == mpn.strip().upper():
                matched = p
                break
        if not matched:
            if exact:
                return None
            matched = parts[0]

        price_breaks = matched.get("PriceBreaks", [])

        # ── KEY FIX: use best_price_for_qty with total_qty ──
        best, min_qty, below_min = best_price_for_qty(
            price_breaks,
            total_qty,
            "Quantity",
            "Price"
        )

        if not best:
            return None

        stock_str = str(matched.get("Availability", "0")).replace(",", "").split()[0]
        try:
            stock = int(stock_str)
        except:
            stock = 0

        price_breaks_formatted = []
        for pb in price_breaks:
            p_val = safe_float(pb.get("Price", 0))
            q_val = int(pb.get("Quantity", 1) or 1)
            if p_val:
                price_breaks_formatted.append({
                    "qty":       q_val,
                    "price":     round(p_val, 4),
                    "total":     round(p_val * total_qty, 4),
                    "qualifies": q_val <= total_qty,
                })

        print(f"    Mouser → selected unit price: ${best} for qty {total_qty} "
              f"{'(below min)' if below_min else ''}")

        return {
            "supplier":       "Mouser",
            "price":          round(best, 4),
            "unit_price":     round(best, 4),
            "extended_price": round(best * total_qty, 4),
            "required_qty":   total_qty,
            "min_order_qty":  min_qty,
            "below_minimum":  below_min,
            "stock":          stock,
            "currency":       "USD",
            "url":            matched.get("ProductDetailUrl", ""),
            "price_breaks":   price_breaks_formatted,
        }

    except Exception as e:
        print(f"Mouser exception for {mpn}:", e)
        return None


# ==========================================
# FARNELL SEARCH
# ==========================================
def search_farnell(mpn, total_qty=1, exact=True):
    if not FARNELL_API_KEY:
        return None

    try:
        res = requests.get(
            FARNELL_SEARCH_URL,
            params={
                "callInfo.apiKey":                 FARNELL_API_KEY,
                "callInfo.responseDataFormat":     "JSON",
                "storeInfo.id":                    FARNELL_STORE,
                "term":                            f"manuPartNum:{mpn}",
                "resultsSettings.numberOfResults": 5,
                "resultsSettings.offset":          0,
                "resultsSettings.responseGroup":   "prices",
            },
            timeout=15,
        )
        if res.status_code != 200:
            print(f"Farnell error {res.status_code} for {mpn}")
            return None

        data = res.json()
        search_return = (
            data.get("manufacturerPartNumberSearchReturn") or
            data.get("keywordSearchReturn") or {}
        )
        products = search_return.get("products", [])
        if not products:
            return None

        matched = None
        for p in products:
            pn = (p.get("translatedManufacturerPartNumber") or p.get("sku") or "").strip().upper()
            if pn == mpn.strip().upper():
                matched = p
                break
        if not matched:
            if exact:
                return None
            matched = products[0]

        price_breaks = matched.get("prices", [])

        # ── KEY FIX: use best_price_for_qty with total_qty ──
        best, min_qty, below_min = best_price_for_qty(
            price_breaks,
            total_qty,
            "from",
            "cost"
        )

        if not best:
            return None

        stock = int(matched.get("stock", {}).get("level", 0) or 0)

        price_breaks_formatted = []
        for pb in price_breaks:
            p_val = safe_float(pb.get("cost", 0))
            q_val = int(pb.get("from", 1) or 1)
            if p_val:
                price_breaks_formatted.append({
                    "qty":       q_val,
                    "price":     round(p_val, 4),
                    "total":     round(p_val * total_qty, 4),
                    "qualifies": q_val <= total_qty,
                })

        print(f"    Farnell → selected unit price: €{best} for qty {total_qty} "
              f"{'(below min)' if below_min else ''}")

        return {
            "supplier":       "Farnell DE",
            "price":          round(best, 4),
            "unit_price":     round(best, 4),
            "extended_price": round(best * total_qty, 4),
            "required_qty":   total_qty,
            "min_order_qty":  min_qty,
            "below_minimum":  below_min,
            "stock":          stock,
            "currency":       "EUR",
            "url":            f"https://de.farnell.com/search?st={mpn}",
            "price_breaks":   price_breaks_formatted,
        }

    except Exception as e:
        print(f"Farnell exception for {mpn}:", e)
        return None


# ==========================================
# SEARCH ONE PART — all 3 in parallel
# ==========================================
def search_part(mpn, total_qty=1):
    results = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(search_digikey, mpn, total_qty, True): "DigiKey",
            executor.submit(search_mouser,  mpn, total_qty, True): "Mouser",
            executor.submit(search_farnell, mpn, total_qty, True): "Farnell",
        }
        for future in concurrent.futures.as_completed(futures):
            r = future.result()
            if r:
                results.append(r)

    if not results:
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = {
                executor.submit(search_digikey, mpn, total_qty, False): "DigiKey",
                executor.submit(search_mouser,  mpn, total_qty, False): "Mouser",
                executor.submit(search_farnell, mpn, total_qty, False): "Farnell",
            }
            for future in concurrent.futures.as_completed(futures):
                r = future.result()
                if r:
                    results.append(r)

    if not results:
        return None

    # Sort: in-stock suppliers first, then cheapest unit price
    results.sort(key=lambda x: (
        x["stock"] < total_qty,  # False (0) = can fulfill = goes first
        x["price"]
    ))

    cheapest = results[0]

    return {
        "cheapest_price":    cheapest["price"],
        "cheapest_supplier": cheapest["supplier"],
        "cheapest_currency": cheapest.get("currency", "USD"),
        "stock":             cheapest["stock"],
        "price_breaks":      cheapest.get("price_breaks", []),
        "top3_suppliers":    results[:3],
    }


# ==========================================
# ENRICH FULL BOM
# ==========================================
def enrich_bom(bom_rows, board_qty=1):
    enriched = [None] * len(bom_rows)

    def lookup(args):
        i, row = args
        mpn = str(row.get("mpn", "")).strip()

        if not mpn or mpn.upper() in ("TBD", "—", ""):
            row.update({
                "nexar_price": None, "nexar_stock": None,
                "nexar_supplier": None, "nexar_all": [],
                "unit_price": None, "extended_price": None,
                "required_qty": None, "digikey_price": None,
                "digikey_stock": None,
            })
            return i, row

        component_qty = int(row.get("qty", 1) or 1)
        total_qty     = component_qty * int(board_qty)

        print(f"  [{i+1}] {mpn} | component qty/board: {component_qty} | boards: {board_qty} | total_qty: {total_qty}")

        result = search_part(mpn, total_qty)

        if result:
            cheapest  = result["top3_suppliers"][0]
            unit_price = cheapest["price"]   # tier price for total_qty
            ext_price  = round(unit_price * total_qty, 4)

            # cost for ONE board = unit_price × component_qty
            per_board  = round(unit_price * component_qty, 4)

            print(f"    → winner: {cheapest['supplier']} | "
                  f"unit: {cheapest.get('currency','$')}{unit_price} | "
                  f"per board: {per_board} | "
                  f"total ({total_qty} pcs): {ext_price} | "
                  f"stock: {cheapest['stock']}")

            dk = next((s for s in result["top3_suppliers"] if s["supplier"] == "DigiKey"), None)

            row.update({
                # Pricing
                "unit_price":        unit_price,   # tier unit price
                "per_board_cost":    per_board,    # unit_price × component_qty
                "extended_price":    ext_price,    # unit_price × total_qty (all boards)
                "required_qty":      total_qty,
                "component_qty":     component_qty,
                "board_qty":         board_qty,

                # Supplier info
                "nexar_price":       unit_price,
                "nexar_stock":       cheapest["stock"],
                "nexar_supplier":    cheapest["supplier"],
                "nexar_currency":    cheapest.get("currency", "USD"),
                "nexar_all":         result["top3_suppliers"],
                "nexar_price_breaks": (dk or cheapest).get("price_breaks", []),
                "below_minimum":     cheapest.get("below_minimum", False),

                # DigiKey specifically
                "digikey_price":     dk["price"] if dk else unit_price,
                "digikey_stock":     dk["stock"] if dk else cheapest["stock"],
            })
        else:
            print(f"    → not found on any supplier")
            row.update({
                "nexar_price": None, "nexar_stock": None,
                "nexar_supplier": None, "nexar_all": [],
                "nexar_currency": None, "unit_price": None,
                "per_board_cost": None, "extended_price": None,
                "required_qty": total_qty, "digikey_price": None,
                "digikey_stock": None,
            })

        return i, row

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        for i, row in executor.map(lookup, enumerate(bom_rows)):
            enriched[i] = row

    return enriched