import requests, json

res = requests.post(
    'https://api.mouser.com/api/v1/search/partnumber?apiKey=0e23e68a-5648-4801-9b8c-16e2f6746aba',
    json={"SearchByPartRequest": {"mouserPartNumber": "SFV22R-2STE1HLF", "partSearchOptions": ""}},
    headers={"Content-Type": "application/json"},
    timeout=15
)
print('Status:', res.status_code)
print(json.dumps(res.json(), indent=2)[:2000])
