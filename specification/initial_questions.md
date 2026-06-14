# Initial Questions & Answers

A running log of clarifying questions asked during planning and the answers given
(all resolved — the extension is built). See [plan.md](plan.md) for the full design.

---

## Round 1 — 2026-06-13

### Q1. What does a pasted CSV row look like? (record schema)
**A:** Provided a real file: [sample_data.csv](sample_data.csv).

It's a 1755–56 parish baptism register. Positional columns
(header `Surname,Given Name,Relation,,Parentage,,Date`):

| Col | Meaning | Example |
|-----|---------|---------|
| 1 | Child surname | `Gribbell` |
| 2 | Child given name | `Anne` |
| 3 | Relation (`s.`=son/male, `d.`=daughter/female) | `d.` |
| 4 | literal `of` (ignore) | `of` |
| 5 | Parent A given name | `Joseph` |
| 6 | Parent B given name (blank if only one) | `Anne` |
| 7 | Date | `Nov 16 1755` |

### Q2. For the Add-Parent flow, how is the parent's data derived from the child?
**A:** "Child name specifies the surname. Parents are listed with just the first names.
Sometimes there is just one parent."

Derived rules:
- Parents inherit the **child's surname** (col 1).
- Parents have **first name only** (cols 5 / 6).
- A row may list **one or two** parents.
- (From the original brief) parent birth = child's date − 20 years, formatted `abt <year>`.

### Q3. Preferred build/packaging toolchain for the installable zip?
**A:** **Plain JS + a small Node zip script** (no framework/bundler). Vanilla MV3 + a Node
script that zips `dist/`. Chosen for easy maintenance and so an automated Claude process can
extend it.

---

## Round 2 — 2026-06-13

### Q. Parent → Father/Mother mapping. Proposed rules; too complicated?
**Asked by user:** two names → father first / mother second (shared surname); one name → it's
the mother; second entry has two names → reversed (mother first, father second) with the
surname specified for the father.

**A (agreed, with a minor reframing):** Not too complicated — and *better* than guessing sex
from given names, which fails on archaic Cornish names (Christian is a daughter here; Honour,
Prudence, Patience, Bathsheba are ambiguous). Validated against the data, including the
`Rosewarne … Elizabeth, George Hocking` row, which is the classic illegitimate-baptism pattern
(child takes the mother's surname; reputed father named in full).

**Final rules** (reframed so the two-word case doesn't depend on column order):
1. An entry **containing a surname (a space)** → that person is the **Father** with his
   explicit surname; the other entry is the **Mother** with the child's surname.
2. Two plain single-word names → **Father** = first, **Mother** = second (both child's surname).
3. One name only → it's the **Mother** (child's surname); no father.

Notes: Father→male, Mother→female. The form has separate **Father/Mother chips**, so Chris's
chip click picks which parsed parent to fill (no father→mother cursor needed); any misparse is
visible and editable before submit.

---

## Round 3 — 2026-06-13

### Q. Date column → which field, as what?
**A:** Child's **Birth Date**, filled with the **year only** (e.g. `1755`). Chris uses it just
to search → match-or-create. If no match he creates a birth record, then manually swaps in a
christening with the exact date (outside our scope).

### Q. Birthplace?
**A:** **Illogan** for the child (select 1st suggestion); **blank** for parents.

### Q. Status default?
**A:** **Always Deceased.**

### Q. Parent birth date?
**A (volunteered):** `<childYear − 20>` (child 1755 → 1735). It's only a search seed; Chris
doesn't know the real date. *Implementation note:* the extension types the canonical
`about 1735` form (FamilySearch shows both `abt` and `about`; only the `about` option
standardizes cleanly).

---

## Round 4 — 2026-06 (live test)

### Q. Does driving the native autosuggest actually bind the standardized Date/Place objects?
**A: YES — validated.** Ran `console_test.js` on the live Add-Unconnected-Person form and got
both fields standardized (no warnings), correct options selected. No token needed — approach A
reuses the page's own authenticated fetches. The technique + gotchas (Downshift keyboard
selection, auto-highlight overshoot, Date echo/calendar-icon "ready" signal, Non-standardized
verify check) are written up in [plan.md](plan.md) → "Validated technique".

---

## All planning questions resolved ✅

Remaining work is implementation (scaffold MV3 extension and port the validated fill engine),
not open questions. Optional final confirmation: inspect the `by-name-with-spouses` network
payload after a real Find click to byte-match the captured sample.
