# tree session

Returns the current user's tree id. Not needed for the fill flow (we drive the
UI, not the API), but useful context for what the page calls on load.

```
GET https://www.familysearch.org/service/tree/tree-data/user/CURRENT/tree/session
Accept: application/json
(auth headers omitted)
```

## Response

```json
{ "treeId": "PRIVATE" }
```
