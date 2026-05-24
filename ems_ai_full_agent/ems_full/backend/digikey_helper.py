from dotenv import load_dotenv
load_dotenv()

import os
import requests

CLIENT_ID     = os.environ.get("DIGIKEY_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("DIGIKEY_CLIENT_SECRET", "")
TOKEN_URL     = "https://api.digikey.com/v1/oauth2/token"
SEARCH_URL    = "https://api.digikey.com/products/v4/search/keyword"


def get_access_token():
    response = requests.post(TOKEN_URL, data={
        "client_id":     CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "grant_type":    "client_credentials",
    })
    if response.status_code != 200:
        print("Token error:", response.text)
        return None
    return response.json().get("access_token")


def search_part(mpn):
    token = get_access_token()
    if not token:
        return None

    headers = {
        "Authorization":             f"Bearer {token}",
        "X-DIGIKEY-Client-Id":       CLIENT_ID,
        "Content-Type":              "application/json",
        "X-DIGIKEY-Locale-Site":     "US",
        "X-DIGIKEY-Locale-Language": "en",
        "X-DIGIKEY-Locale-Currency": "USD",
    }

    body = {"Keywords": mpn, "Limit": 3, "Offset": 0}
    response = requests.post(SEARCH_URL, headers=headers, json=body)

    if response.status_code != 200:
        print(f"Search error for {mpn}:", response.text)
        return None

    products = response.json().get("Products", [])
    if not products:
        return None

    part  = products[0]
    price = float(part.get("UnitPrice", 0) or 0)

    return {
        "mpn":         mpn,
        "unit_price":  price,
        "stock":       part.get("QuantityAvailable", 0),
        "digikey_url": part.get("ProductUrl", ""),
        "datasheet":   part.get("DatasheetUrl", ""),
    }


def enrich_bom(bom_rows):
    enriched = []
    for row in bom_rows:
        mpn = row.get("mpn", "")
        if not mpn or mpn in ("TBD", "—"):
            row["digikey_price"] = None
            row["digikey_stock"] = None
            row["digikey_url"]   = ""
            enriched.append(row)
            continue

        print(f"  Looking up: {mpn}")
        result = search_part(mpn)

        if result:
            row["digikey_price"] = result["unit_price"]
            row["digikey_stock"] = result["stock"]
            row["digikey_url"]   = result["digikey_url"]
            print(f"    → €{result['unit_price']} | stock: {result['stock']}")
        else:
            row["digikey_price"] = None
            row["digikey_stock"] = None
            row["digikey_url"]   = ""
            print(f"    → not found")

        enriched.append(row)
    return enriched
