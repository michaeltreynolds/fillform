/* CSV parsing + parent-derivation for the Illogan baptism-register format.
 *
 * Columns (positional, header row auto-skipped):
 *   0 Surname | 1 Given Name | 2 Relation (s./d.) | 3 "of" | 4 Parent A | 5 Parent B | 6 Date
 *
 * Pure functions only (no DOM / chrome APIs) so the popup and content scripts
 * can both use them. See specification/plan.md for the resolved rules.
 */
(function () {
  const FF = (typeof window !== "undefined" ? (window.FF = window.FF || {}) : {});

  // Split one CSV line into trimmed cells (tolerates simple quoted cells).
  function splitLine(line) {
    const out = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') inQ = false;
        else cur += c;
      } else if (c === '"') inQ = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  }

  const yearOf = (s) => {
    const m = String(s || "").match(/\b(\d{4})\b/);
    return m ? m[1] : "";
  };

  const sexFromRelation = (r) =>
    /^s/i.test(r) ? "male" : /^d/i.test(r) ? "female" : "";

  const hasSurname = (s) => /\s/.test((s || "").trim());

  /**
   * Decide which parent name is the father vs the mother (see plan.md):
   *   1. An entry containing a surname (a space) → Father, with his explicit
   *      surname; the other → Mother, with the child's surname.
   *   2. Two plain names → Father = A, Mother = B (both child's surname).
   *   3. One name → Mother (child's surname); no father.
   */
  function deriveParents(surname, a, b) {
    a = (a || "").trim();
    b = (b || "").trim();
    const present = [a, b].filter(Boolean);
    if (present.length === 0) return [];

    if (present.length === 1) {
      return [{ role: "mother", sex: "female", given: present[0], surname }];
    }

    const aSurname = hasSurname(a);
    const bSurname = hasSurname(b);
    if (aSurname !== bSurname) {
      const fEntry = aSurname ? a : b;
      const mEntry = aSurname ? b : a;
      const parts = fEntry.split(/\s+/);
      return [
        { role: "father", sex: "male", given: parts[0], surname: parts.slice(1).join(" ") },
        { role: "mother", sex: "female", given: mEntry, surname },
      ];
    }

    // both / neither carry a surname → assume father first, mother second
    return [
      { role: "father", sex: "male", given: a, surname },
      { role: "mother", sex: "female", given: b, surname },
    ];
  }

  function parseCsv(text) {
    const lines = String(text || "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const records = [];
    for (const line of lines) {
      const c = splitLine(line);
      // Skip the header row.
      if (/surname/i.test(c[0] || "") && /given/i.test(c[1] || "")) continue;

      const surname = c[0] || "";
      const given = c[1] || "";
      if (!surname && !given) continue;

      const dateText = c[6] || "";
      records.push({
        surname,
        given,
        sex: sexFromRelation(c[2] || ""),
        dateText,
        birthYear: yearOf(dateText),
        parents: deriveParents(surname, c[4] || "", c[5] || ""),
      });
    }
    return records;
  }

  FF.parseCsv = parseCsv;
  FF.deriveParents = deriveParents;

  // Allow Node tooling/tests to import the pure functions.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { parseCsv, deriveParents };
  }
})();
