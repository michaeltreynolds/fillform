# FillForm — Plan & Open Questions

A Chrome extension that helps Chris Stevenson enter genealogy data into FamilySearch's
"Add Unconnected Person" and "Add Parent" forms. The user keeps full control of every
decision; the extension only **fills fields** when a button is clicked, then lets the
native UX take over.

> **Status: implemented and shipping.** All phases below are built and live-tested; the
> "Open questions" were resolved during implementation (notes kept for history). For how to
> run/install see the [README](../README.md) and [INSTALL.md](../INSTALL.md). The
> still-authoritative parts of this doc are the **selectors**, **data model / parent rules**,
> **field-fill spec**, and **Validated technique** sections.

---

## What we now know (from the sample captures)

### 1. The two flows share ONE form
Both "Add Unconnected Person" and "Add Parent" render the same form:
`<form id="find-form" data-testid="add-find-flow:search">`.

Stable selectors inside it (the `id=` attributes are randomized per render — **do not use
them**; use `name` / `data-testid` / `role`):

| Field        | Selector |
|--------------|----------|
| First names  | `input[data-testid="first-name"]` (`name="nameTemplate.en.firstName"`) |
| Last names   | `input[data-testid="last-name"]` |
| Title/Suffix | `input[data-testid="title"]`, `input[data-testid="suffix"]` |
| Sex          | `input[name="sex"][value="male|female|unknown"]` |
| Status       | `input[name="status"][value="deceased|living"]` |
| Birth date   | `input[name="birthDate"]` (combobox + autosuggest) |
| Birth place  | `input[name="birthPlace"]` (combobox + autosuggest) |
| Death date/place | `input[name="deathDate"]`, `input[name="deathPlace"]` |
| Parent chips | `button[data-testid="add-father|add-mother|add-husband|add-wife"]` |

### 2. Flow detection is feasible from the DOM
- **Add Unconnected Person:** `<h2>Add Unconnected Person</h2>`, page title "Recent People",
  not in a modal dialog.
- **Add Parent:** modal `div[role="dialog"][aria-label^="Add Parents"]`, `<h2>Add Parents</h2>`,
  with a subheading `Child: <Full Name>`. **The child's name is readable here** — this is our
  source for deriving the parent's shared last name and approximate birth year.
- **Add Spouse:** modal `div[role="dialog"][aria-label^="Add Spouse"]`, `<h2>Add Spouse</h2>`,
  with a subheading `Spouse: <Full Name>`. The **same find-form** as Add Parent, so it's treated
  as a `parent` flow. In Chris's workflow he adds a parent, then adds a spouse *to that parent* —
  and that spouse is the child's **other parent**. The subheading names the already-added parent,
  so the panel matches it to a parsed parent and recommends filling the counterpart.

### 3. The "complicated" Date & Place values — mystery essentially solved
The submitted `search/by-name-with-spouses` payload shows exactly what the fields resolve to.
The DOM input `value` is only the plain text ("1755"); the rich object lives in **React
component state**, not the DOM.

**Date** "1755" →
```json
{"localizedText":"1755","normalizedText":"1755","originalText":"1755",
 "formalText":"+1755","julianDateRange":{"earliestDay":2362061}}
```
Comes from `GET /service/standards/date/ws/dates/interp?text=1755` →
`dates[0].gedcomx` = `formalText`, `dates[0].detail.simpleDates[0].astrodays.earliest` = `earliestDay`.

**Place** "Illogan…" →
```json
{"localizedText":"Illogan, Cornwall, England, United Kingdom","normalizedText":"…",
 "originalText":"…","geoCode":{"latitude":50.2489,"longitude":-5.2665},"id":2971843}
```
Comes from `GET /service/standards/place/ws-ui/places/request?text=illog…` →
first result's `rep.fullDisplay.name`, `rep.location.centroid`, `rep.id`. Chris always
picks the first ("Illogan") result.

Both helper APIs need an `Authorization: Bearer <token>` header (the `fssessionid` cookie value).

---

## The central technical decision: how to commit Date/Place into React state

Setting `input.value = "1755"` is **not enough** — the rich object won't exist and the submit
payload will be incomplete. Two approaches:

- **(A) Drive the native autosuggest (recommended).** Use the native value setter +
  dispatch `input`/`keydown` events so React sees the change, wait for the suggestion
  listbox to render, then programmatically click the correct option (first place / matching
  date). This reuses the app's own state wiring, so the rich object is built by their code.
  Most robust to internal-format changes; main risk is async timing and picking the right
  list item.
- **(B) Inject the rich object directly into React state.** Locate the fiber and call its
  `onChange` with the pre-built object (which we can construct ourselves by calling the two
  helper APIs). No UI waiting, but fragile across React/internal changes.

**Recommendation:** build (A) as the primary path. Keep the helper-API calls (B's building
blocks) as a verification/fallback. Plain text fields (name, sex, status) just use the native
setter + `input` event.

---

## Data model (from `sample_data.csv` — a 1755–56 parish baptism register)

Header: `Surname,Given Name,Relation,,Parentage,,Date` (two blank header cells). Positional:

| Col | Meaning | Example | Use |
|-----|---------|---------|-----|
| 1 | Child surname | `Gribbell` | child last name + **both parents' surname** |
| 2 | Child given name | `Anne` | child first name |
| 3 | Relation | `s.` / `d.` | child sex: `s.`→male, `d.`→female |
| 4 | literal `of` | `of` | ignore |
| 5 | Parent A given name | `Joseph` | a parent's first name |
| 6 | Parent B given name | `Anne` | a parent's first name (blank if only one parent) |
| 7 | Date | `Nov 16 1755` | child christening/birth date |

Confirmed rules:
- Child surname → parents' surname (shared). Parents are given **first name only**.
- Sometimes only one parent is listed (col 6 blank), e.g. `Jeffery,Richard,s.,of,Mary,,…`.
- Parent birth date = a standardized range `from about <childYear − 45> to about
  <childYear − 20>` (parent aged 20–45 at the child's birth) — a search seed, not a
  known date, so a range beats a single year.

### Parent parsing rules (RESOLVED)
Given child surname `S`, parent field A (col 5), parent field B (col 6):

1. **An entry containing a surname (a space)** → that person is the **Father**, using his
   explicit surname (e.g. `George Hocking` → Father George Hocking). The other entry is the
   **Mother**, using the child's surname `S`. (Illegitimate-baptism pattern: child carries the
   mother's surname; reputed father is named in full.)
2. **Two plain single-word names** → Father = `{A, S}`, Mother = `{B, S}`.
3. **One name** (B blank) → **Mother** = `{A, S}`; no father.

Sex: Father→male, Mother→female (sets the sex radio / chip). The form exposes separate
**Father** and **Mother** chips, so Chris's chip click selects which parsed parent to fill —
the cursor only needs the record index, not a father→mother sequence. Any misparse is visible
and editable before submit.

## Field-fill specification (RESOLVED)

What the extension writes into the find-form, per flow. (Chris drives; this just populates so
he can search → match-or-create.)

**Child (Add Unconnected Person)**
| Field | Value |
|-------|-------|
| First name | Given Name (col 2) |
| Last name | Surname (col 1) |
| Sex | `s.`→Male, `d.`→Female (col 3) |
| Status | **Deceased** |
| Birth Date | **year only**, extracted from col 7 (e.g. `Nov 16 1755` → `1755`) |
| Birthplace | **Illogan, Cornwall, England, United Kingdom** (select 1st suggestion) |

Note: Chris uses Birth Date only to find/create. If no match, he creates as a birth record,
then manually deletes birth & attaches a christening for the exact date — outside our scope.

**Parent (Add Parent flow)** — derived from the child + parent-parsing rules above
| Field | Value |
|-------|-------|
| First name | parsed parent given name |
| Last name | child's surname (or father's explicit surname per parsing rule 1) |
| Sex | Father→Male, Mother→Female |
| Status | **Deceased** |
| Birth Date | Standardized **range** `from about <childYear − 45> to about <childYear − 20>` (e.g. child 1755 → `from about 1710 to about 1735`) — parent aged 20–45 at the child's birth. Chris doesn't know the real date; it's just a search seed, so a range beats a single year. |
| Birthplace | **blank** |

## Validated technique (live-tested 2026-06 — see `console_test.js`)

Approach A (drive the page's own UI) **works end-to-end**, no token needed. Confirmed by
filling the Anne Gribbell record and getting both autosuggests fully standardized. Key facts
the extension's fill engine must encode:

- **React-controlled inputs:** set value via the native `HTMLInputElement.prototype` value
  setter, then dispatch a bubbling `input` event. (`el.value = x` alone is ignored.)
- **Target the input, not the wrapper:** the form has a `<div name="birthDate">` *around* the
  `<input name="birthDate">` — query `input[name="…"]`.
- **Autosuggest = Downshift comboboxes** (`#downshift-N-menu`, options
  `[role="option"][data-testid="suggestion-i"]`). Selection is committed by **keyboard**:
  step the highlight to the target option, then `Enter`.
- **Downshift auto-highlights option #0 on open** → blind ArrowDown counting overshoots.
  Navigate deterministically: read the highlighted option (`aria-selected="true"` /
  input's `aria-activedescendant`) and step until it equals the target index.
- **Date field echo trap:** the Date menu shows an instant **echo** option before
  `dates/interp` resolves. For a plain year ("1755") the single option is upgraded *in
  place* (gains a calendar `<svg>` icon). For an approximate date ("abt 1735") there are
  **two** options — the echo `abt 1735` (no icon, index 0) and the standardized
  `about 1735` (calendar icon, index 1). In both cases the **standardized option is the
  one bearing the calendar icon**, at an unpredictable index. Fix: don't pick by index —
  wait until an option *with an icon* exists, then select **that** option.
- **Success signal:** the field wrapper shows "Non-standardized Date/Place" until the rich
  object binds — absence of that text = standardized. Use as the verify-and-retry check.
- **Place query:** typing the full formatted name returns the right match plus near-misses
  (e.g. Redruth); match on the option text starting with the desired place and select that
  exact index.

➡️ This logic lives in `console_test.js` and should be ported near-verbatim into the
extension's content-script fill engine.

## Open questions (all resolved during implementation — kept for history)

### Behavior / mechanics
5. ~~Approach A vs B~~ **RESOLVED** — Approach A validated (above).
6. After clicking a suggestion, is any extra confirm/blur needed to "lock in" the value?
7. **Auth for helper APIs** (only needed if we call them directly): grab the Bearer token
   from page context / network. If we go pure-UX (A), we may not need it at all.
8. **Cursor model** — track `recordIndex` in `chrome.storage.local` (the Father/Mother chip
   selects the role, so no `nextParent` needed). When does the record advance (after person
   created? after both parents?) and how does the user reset/skip?
9. Button injection point & label — inject "Fill <next name> from data" into the form;
   confirm the dialog/panel mount timing so we can attach via a `MutationObserver`.

### Project / delivery
10. Repo structure & docs conventions so an automated Claude process can extend it later.
    (Toolchain resolved: plain JS MV3 + Node zip script.)

---

## Implementation plan (phased) — ✅ all phases shipped

**Phase 0 — Validate the unknowns (spikes, no real build yet)**
- Live-test approach A on FamilySearch: can we fill name/sex/date/place and produce a
  correct submit payload by simulating input + clicking suggestions? Confirm event sequence.
- Confirm CSV schema and parent-derivation rules with Chris (Q1–Q2).

**Phase 1 — Skeleton MV3 extension**
- `manifest.json` (MV3), content script matched to `familysearch.org/*`, popup for pasting CSV.
- CSV parse + store records in `chrome.storage.local`; cursor state module.
- `build`/`zip` script.

**Phase 2 — Flow detection + button injection**
- `MutationObserver` detects the find-form; classify Add-Person vs Add-Parent via the h2 /
  dialog markers; read `Child: <name>` for parent derivation.
- Inject the "Fill <next name>" button into each flow.

**Phase 3 — Field filling engine**
- Plain fields via native setter + events.
- Date/Place via approach A (autosuggest drive), with helper-API fallback.
- Parent flow derives data from the last-filled child.

**Phase 4 — Polish**
- Cursor advance/skip/reset UX, error states (no records left, suggestion not found),
  docs, packaging.

---

## Notes / risks
- Selectors must avoid the hashed CSS classes and random `id`s; rely on `name` /
  `data-testid` / `role` / aria labels, which look stable and semantic.
- The captured Bearer token in the samples is a live session token — treat the sample
  files as sensitive and don't commit real tokens going forward.
- Scope stays fixed to Chris's genealogy use case.
