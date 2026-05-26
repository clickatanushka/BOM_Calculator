import requests, json

res = requests.get('https://api.element14.com/catalog/products', params={
    'callInfo.apiKey': '938axehsy28jawa4f2ferb6y',
    'callInfo.responseDataFormat': 'JSON',
    'storeInfo.id': 'de.farnell.com',
    'term': 'manuPartNum:SFV22R-2STE1HLF',
    'resultsSettings.numberOfResults': 5,
    'resultsSettings.offset': 0,
    'resultsSettings.responseGroup': 'prices',
}, timeout=15)

print('Status:', res.status_code)
print(json.dumps(res.json(), indent=2)[:3000])
