# API samples (sanitized)

Curated, **secret-free** references for how FamilySearch's find-form and its
Date/Place standardization endpoints behave. Enough context for an agent on
another machine to maintain the extension without a live capture.

These are distilled from raw browser captures that have since been deleted (they
held real session cookies + Bearer tokens + the logged-in user's own tree data).
All `Authorization` / `Cookie` / `x-dtpc` headers and any user PII were removed;
only URLs, request payloads, and response bodies for the *research subject*
remain. To refresh, re-capture from your browser's Network tab and re-sanitize.

| File | What it shows |
|------|---------------|
| [find_form.html](find_form.html) | The find-form DOM (same form for both flows). Source of the stable selectors (`name=`, `data-testid=`, `role=`). |
| [search_by_name.md](search_by_name.md) | **The key artifact** — the submit payload, showing the rich *standardized* Date/Place objects the form sends. |
| [date_interp.md](date_interp.md) | `dates/interp` request + response → how `1755` / `abt 1735` become `formalText` + `julianDateRange`. |
| [places_request.md](places_request.md) | `places/request` request + response → how place text resolves to `geoCode` + `id`. |
| [session.md](session.md) | The tree-session endpoint (returns `{treeId}`). |

For the distilled "how to drive this" guidance, see [../plan.md](../plan.md) →
"Validated technique", and the runnable harness [../console_test.js](../console_test.js).
