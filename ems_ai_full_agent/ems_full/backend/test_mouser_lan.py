import requests, json

res = requests.post(
    'https://api.mouser.com/api/v1/search/partnumber?apiKey=0e23e68a-5648-4801-9b8c-16e2f6746aba',
    json={"SearchByPartRequest": {"mouserPartNumber": "LAN8742AI-CZ-TR", "partSearchOptions": ""}},
    headers={"Content-Type": "application/json"},
    timeout=15
)
data = res.json()
parts = (data.get("SearchResults") or {}).get("Parts", [])
print(f"Parts found: {len(parts)}")
for p in parts:
    print(f"  MPN: {p.get('ManufacturerPartNumber')}")
    print(f"  Stock: {p.get('Availability')}")
    print(f"  Prices: {p.get('PriceBreaks')}")
