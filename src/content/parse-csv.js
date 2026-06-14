/* CSV parsing + parent-derivation for the Illogan baptism-register format.
 *
 * Columns (positional, header row auto-skipped):
 *   0 Surname | 1 Given Name | 2 Relation (s./d.) | 3 "of" | 4 Parent A | 5 Parent B | 6 Date
 *
 * Tolerant of messy pastes (Google Docs/Sheets): comma OR tab delimited, any
 * line-ending, blank lines, and non-breaking spaces.
 *
 * Pure functions only (no DOM / chrome APIs) so the popup and content scripts
 * can both use them. See specification/plan.md for the resolved rules.
 */
(function () {
  const FF = (typeof window !== "undefined" ? (window.FF = window.FF || {}) : {});

  // Special whitespace/line-break chars built at runtime so this source stays
  // pure ASCII (literal U+2028/U+2029 in source would break JS parsing).
  const NBSP = String.fromCharCode(0x00a0); // non-breaking space
  const LS = String.fromCharCode(0x2028);   // Unicode line separator
  const PS = String.fromCharCode(0x2029);   // Unicode paragraph separator
  // Matches LF, CR, CRLF, vertical tab (\v = U+000B, Google Docs soft break),
  // and the Unicode line/paragraph separators.
  const LINE_BREAK = new RegExp("\\r\\n|[\\r\\n\\v" + LS + PS + "]");

  // Split one line into trimmed cells (tolerates simple quoted cells). `delim`
  // is "," or "\t" -- auto-detected so a paste from Google Sheets (tab-delimited)
  // works as well as a comma CSV.
  function splitLine(line, delim) {
    const out = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') inQ = false;
        else cur += c;
      } else if (c === '"') inQ = true;
      else if (c === delim) { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  }

  // More tabs than commas => it was pasted from a spreadsheet (tab-delimited).
  const detectDelimiter = (text) =>
    (text.match(/\t/g) || []).length > (text.match(/,/g) || []).length ? "\t" : ",";

  const yearOf = (s) => {
    const m = String(s || "").match(/\b(\d{4})\b/);
    return m ? m[1] : "";
  };

  const sexFromRelation = (r) =>
    /^s/i.test(r) ? "male" : /^d/i.test(r) ? "female" : "";

  const hasSurname = (s) => /\s/.test((s || "").trim());

  /**
   * Decide which parent name is the father vs the mother (see plan.md):
   *   1. An entry containing a surname (a space) -> Father, with his explicit
   *      surname; the other -> Mother, with the child's surname.
   *   2. Two plain names -> Father = A, Mother = B (both child's surname).
   *   3. One name -> Mother (child's surname); no father.
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

    // both / neither carry a surname -> assume father first, mother second
    return [
      { role: "father", sex: "male", given: a, surname },
      { role: "mother", sex: "female", given: b, surname },
    ];
  }

  function parseCsv(text) {
    const normalized = String(text || "").split(NBSP).join(" ");
    const delim = detectDelimiter(normalized);
    const lines = normalized
      .split(LINE_BREAK)
      .map((l) => l.trim())
      .filter(Boolean);

    const records = [];
    for (const line of lines) {
      const c = splitLine(line, delim);
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
