# dates/interp (Date standardization)

Called as you type into a Date field; the response populates the autosuggest.
Selecting the resolved option binds `gedcomx`→`formalText` and
`astrodays.earliest`→`julianDateRange.earliestDay` in the submit payload.

```
GET https://www.familysearch.org/service/standards/date/ws/dates/interp?text=1755&noCache=true&acceptLanguage=en
Accept: application/json
(auth headers omitted)
```

`text` is URL-encoded user input — e.g. `text=1755` or `text=abt%201735`.

## Response (text=1755)

```json
{
  "count": 1,
  "dates": [{
    "refId": 1,
    "original": "1755",
    "gedcomx": "+1755",
    "calendar": "gregorian",
    "localizedDate": { "calendar": "gregorian", "format": "legacy", "lang": "en", "value": "1755" },
    "detail": {
      "simpleDates": [{
        "era": "AD", "yearOfEra": 1755, "year": 1755, "month": 0, "dayOfMonth": 0,
        "astroday": 2362061,
        "astrodays": { "earliest": 2362061, "latest": 2362425 },
        "isApproximate": false, "precision": "Year", "role": "simple"
      }]
    },
    "precision": "Year",
    "type": "Simple"
  }]
}
```

Mapping into the submit payload:
- `dates[0].gedcomx` → `date.formalText` (`+1755`)
- `dates[0].detail.simpleDates[0].astrodays.earliest` → `date.julianDateRange.earliestDay` (2362061)

## Approximate dates

`text=abt 1735` (or `about 1735`) returns an `isApproximate: true` interpretation
(`gedcomx` like `+1735`). In the UI this renders **two** suggestion options — the
raw echo (`abt 1735`, no icon) and the standardized `about 1735` (calendar icon).
The standardized one is the icon-bearing option; select that. See
[../plan.md](../plan.md) → "Validated technique".
