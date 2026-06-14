# search/by-name-with-spouses (the submit payload)

This is the request the find-form sends when you click Find. It is the
"rosetta stone": it shows the **rich, standardized** Date and Place objects the
form builds internally — the thing the extension must cause to exist (a plain
text value alone produces an incomplete payload).

```
POST https://www.familysearch.org/service/tree/tree-data/v9/search/by-name-with-spouses
Content-Type: application/json
(auth headers omitted)
```

## Request payload (this is built from the form entries)

```json
{
  "operationType": "addUnconnected",
  "existingRelationshipHasTwoParents": false,
  "ignoreAlreadyRelated": false,
  "birthDetails": {
    "detailsType": "EventDetails",
    "type": "BIRTH",
    "date": {
      "localizedText": "1755",
      "normalizedText": "1755",
      "originalText": "1755",
      "formalText": "+1755",
      "julianDateRange": { "earliestDay": 2362061 }
    },
    "place": {
      "localizedText": "Illogan, Cornwall, England, United Kingdom",
      "normalizedText": "Illogan, Cornwall, England, United Kingdom",
      "originalText": "Illogan, Cornwall, England, United Kingdom",
      "geoCode": { "latitude": 50.2489, "longitude": -5.2665 },
      "id": 2971843
    }
  },
  "deathDetails": { "detailsType": "EventDetails", "type": "DEATH", "date": null, "place": null },
  "genderDetails": { "gender": "FEMALE", "detailsType": "GenderDetails" },
  "nameDetails": {
    "detailsType": "NameDetails",
    "nameForms": [
      { "familyPart": "Gribbell", "givenPart": "Anne", "lang": "en", "prefixPart": null, "suffixPart": null }
    ]
  }
}
```

- `date.formalText` (`+1755`) and `date.julianDateRange.earliestDay` come from
  `dates/interp` (see [date_interp.md](date_interp.md)).
- `place.geoCode` + `place.id` come from `places/request`
  (see [places_request.md](places_request.md)).

## Response (extension does NOT consume this — the native UX shows it)

```json
[{
  "alreadyRelated": false,
  "person": {
    "birthDate": "23 NOV 1755", "birthPlace": "Illogan,Cornwall,England",
    "birthType": "CHRISTENING", "christeningDate": "23 NOV 1755",
    "christeningPlace": "Illogan,Cornwall,England",
    "gender": "FEMALE", "id": "MWV1-SJG", "lifespan": "1755-",
    "name": "Anne Gribbell", "portraitUrl": null
  }
}]
```
