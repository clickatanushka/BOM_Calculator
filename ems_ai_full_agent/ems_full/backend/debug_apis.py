# Run this file to debug all three APIs
# Replace the keys with your actual values before running

import requests
# # DIGIKEY_CLIENT_ID="xZNLqBj9kFGjls5vRocFu6tnSVj932GlpLgGTkmXrqWvsetK"
# # DIGIKEY_CLIENT_SECRET="nX3vtCXALui2UAIbIfLFyFWlFobXTx1NADDBofyUSGTgI58yeUiN5R3Yy1pBbk0L"
# # DIGIKEY_TOKEN_URL     = "https://api.digikey.com/v1/oauth2/token"
# # DIGIKEY_SEARCH_URL    = "https://api.digikey.com/products/v4/search/keyword"

# # MOUSER_API_KEY="9c8eaed4-a677-423c-8244-551eb1e2661e9c8eaed4-a677-423c-8244-551eb1e2661e"
# # MOUSER_SEARCH_URL     = f"https://api.mouser.com/api/v1/search/partnumber"
# # FARNELL_API_KEY ="938axehsy28jawa4f2ferb6y"

DIGIKEY_CLIENT_ID="xZNLqBj9kFGjls5vRocFu6tnSVj932GlpLgGTkmXrqWvsetK"
DIGIKEY_CLIENT_SECRET="nX3vtCXALui2UAIbIfLFyFWlFobXTx1NADDBofyUSGTgI58yeUiN5R3Yy1pBbk0L"
MOUSER_API_KEY        = "9c8eaed4-a677-423c-8244-551eb1e2661e"

FARNELL_API_KEY       = "938axehsy28jawa4f2ferb6y"

MPN = "RC0402FR-0710KL"

print("=" * 60)
print("1. DIGIKEY TOKEN")
print("=" * 60)
res = requests.post("https://api.digikey.com/v1/oauth2/token", data={
    "client_id":     DIGIKEY_CLIENT_ID,
    "client_secret": DIGIKEY_CLIENT_SECRET,
    "grant_type":    "client_credentials",
})
print("Status:", res.status_code)
print("Response:", res.text[:300])

token = None
if res.status_code == 200:
    token = res.json().get("access_token")
    print("Token length:", len(token) if token else 0)

print("\n" + "=" * 60)
print("2. DIGIKEY SEARCH")
print("=" * 60)
if token:
    res2 = requests.post(
        "https://api.digikey.com/products/v4/search/keyword",
        headers={
            "Authorization":             f"Bearer {token}",
            "X-DIGIKEY-Client-Id":       DIGIKEY_CLIENT_ID,
            "Content-Type":              "application/json",
            "X-DIGIKEY-Locale-Site":     "US",
            "X-DIGIKEY-Locale-Language": "en",
            "X-DIGIKEY-Locale-Currency": "USD",
        },
        json={"Keywords": MPN, "Limit": 3, "Offset": 0},
        timeout=15,
    )
    print("Status:", res2.status_code)
    print("Response:", res2.text[:500])

print("\n" + "=" * 60)
print("3. MOUSER SEARCH")
print("=" * 60)
res3 = requests.post(
    f"https://api.mouser.com/api/v1/search/partnumber?apiKey={MOUSER_API_KEY}",
    json={"SearchByPartRequest": {
        "mouserPartNumber":  MPN,
        "partSearchOptions": "",
    }},
    headers={"Content-Type": "application/json"},
    timeout=15,
)
print("Status:", res3.status_code)
print("Response:", res3.text[:500])

print("\n" + "=" * 60)
print("4. FARNELL SEARCH")
print("=" * 60)
res4 = requests.get(
    "https://api.element14.com/catalog/products",
    params={
        "callInfo.apiKey":                FARNELL_API_KEY,
        "callInfo.responseDataFormat":    "JSON",
        "storeInfo.id":                   "de.farnell.com",
        "term":                           f"manuPartNum:{MPN}",
        "resultsSettings.numberOfResults": 3,
        "resultsSettings.offset":          0,
        "resultsSettings.responseGroup":   "prices",
    },
    timeout=15,
)
print("Status:", res4.status_code)
print("Response:", res4.text[:500])