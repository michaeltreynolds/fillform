# FillForm

A Chrome extension that speeds up genealogy data entry on **FamilySearch** by
filling the *Add Unconnected Person* and *Add Parent* forms from a pasted CSV.

You stay in control of every decision — the extension only **fills fields** when
you click its button. It never submits, matches, or creates anything on its own.

## How it works

1. Click the FillForm toolbar icon and **paste your CSV** (an Illogan baptism
   register: `Surname, Given Name, Relation, of, Parent A, Parent B, Date`).
2. On FamilySearch, open **Add Unconnected Person**. A small FillForm panel
   appears (top-right) showing the current record with a **Fill** button.
3. Click **Fill** — it populates First/Last name, Sex, Status (Deceased), the
   standardized **Birth Date** (year), and **Birthplace** (Illogan). Then you
   search and decide: attach to a match, or create a new person.
4. After creating, on the new person's page the panel offers **Add christening:
   `<date>` at Illogan** (when there's no christening yet). Click it to open the
   Christening dialog and fill the standardized **full date** (day/month/year,
   from your data) and **Illogan** — it stops there and does **not** save, so you
   review and click **Save** yourself.
5. Also use **Add Parent**. The panel detects the parent flow and offers **Fill
   Father** / **Fill Mother** buttons derived from the same record (shared
   surname, birth ≈ child − 20 years as `about YYYY`).
6. Click **Next ▶** in the panel to advance to the next record.

The tricky part — committing FamilySearch's *standardized* Date/Place objects
(not just text) — is handled by driving the page's own autosuggest widgets. See
[specification/plan.md](specification/plan.md) → "Validated technique".

## Project layout

```
manifest.json              MV3 manifest
src/
  shared/storage.js        chrome.storage.local state (records + cursor)
  content/
    parse-csv.js           CSV schema + parent-derivation rules (pure)
    fill-engine.js         drives the form / autosuggests (the validated logic)
    flow-detect.js         Add-Person vs Add-Parent detection
    inject-button.js       the floating control panel
    panel.css
  popup/                   paste-CSV UI
scripts/build.mjs          stages + zips an installable extension
specification/             design notes, samples, console test harness
```

## Install the latest shared build

This permanent link always serves the newest release zip:

**https://github.com/michaeltreynolds/fillform/releases/latest/download/fillform.zip**

Download it, **unzip** it, then `chrome://extensions` → enable **Developer mode**
→ **Load unpacked** → pick the unzipped folder. (Chrome can't install a `.zip`
directly — it needs the unpacked folder.) Chrome won't auto-update a side-loaded
extension, so to get a newer build, re-download and reload.

**Non-technical install guide (shareable):** [INSTALL.md](INSTALL.md) walks a
non-programmer through it step by step.

Releases are published automatically by [.github/workflows/release.yml](.github/workflows/release.yml):
bump `version` in [manifest.json](manifest.json) and push to `main`. CI builds
`fillform.zip` and publishes a release tagged `v<version>` (and creates the tag).
Pushes that don't change the version are no-ops, so no manual tagging is needed.

## Develop

Load unpacked for a fast edit/reload loop:

1. `chrome://extensions` → enable **Developer mode**.
2. **Load unpacked** → select this repo folder.
3. After editing, hit **Reload** on the extension card. Reload the FamilySearch
   tab to re-inject content scripts.

## Build a shareable zip

```
npm run build
```

Produces `dist/fillform.zip` (and a staged `dist/fillform/` folder) with
`manifest.json` at the archive root, ready to install.

## Scope

Built for Chris Stevenson's Illogan, Cornwall genealogy work. The CSV schema,
the always-`Illogan` birthplace, and the parent rules are specific to that data.
