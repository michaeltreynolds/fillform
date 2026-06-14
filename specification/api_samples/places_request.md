# places/request (Place standardization)

Called as you type into a Place field; the response populates the autosuggest.
Selecting the resolved option binds `fullDisplay.name`, `location.centroid`
(→`geoCode`), and `id` into the submit payload. Chris always wants the first
"Illogan" result.

```
GET https://www.familysearch.org/service/standards/place/ws-ui/places/request?text=illog&pagenum=1&pagesize=15&output=summary&acceptLanguage=en&partial=true&hideUnsearchable=true
Accept: application/json
(auth headers omitted)
```

`text` is the (partial) place text. Note: typing the *full* formatted name returns
the right match plus near-misses (e.g. Redruth) — match the option whose text
starts with the desired place.

## Response (text=illog) — first result, the one we use

```json
{
  "searchResults": [{
    "result": [{
      "rep": {
        "id": 2971843,
        "jurisdiction": {
          "name": "Cornwall",
          "jurisdiction": {
            "name": "England",
            "jurisdiction": { "name": "United Kingdom", "place": 1927033 }
          }
        },
        "type": { "localizedName": [{ "locale": "en", "name": "Village" }] },
        "place": 6137950,
        "fromYear": 1801,
        "location": { "centroid": { "latitude": 50.2489, "longitude": -5.2665 } },
        "display": { "name": "Illogan", "locale": "en" },
        "fullDisplay": { "name": "Illogan, Cornwall, England, United Kingdom", "locale": "en" }
      },
      "relevanceScore": 63
    }]
  }]
}
```

(The full response returns ~5 results — Illogan, Il Loghino, Treloweth Chapel, etc.
Only the first Illogan one is used.)

Mapping into the submit payload (`place`):
- `rep.fullDisplay.name` → `localizedText` / `normalizedText` / `originalText`
- `rep.location.centroid` → `geoCode { latitude, longitude }`
- `rep.id` → `id` (2971843)
