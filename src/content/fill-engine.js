/* Fill engine — drives the FamilySearch find-form's own UI so that the rich,
 * STANDARDIZED Date/Place objects get bound (not just plain text).
 *
 * This is the validated technique from specification/console_test.js. See
 * specification/plan.md → "Validated technique" for the why behind each step.
 */
(function () {
  const FF = (window.FF = window.FF || {});
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // React ignores `el.value = x`; call the native setter then dispatch `input`.
  function setNativeValue(el, value) {
    const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value");
    desc.set.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  async function waitFor(fn, { timeout = 7000, interval = 100 } = {}) {
    const start = Date.now();
    for (;;) {
      const v = fn();
      if (v) return v;
      if (Date.now() - start > timeout) throw new Error("waitFor timeout");
      await sleep(interval);
    }
  }

  // The combo is wrapped in <div name="x"> around <input name="x"> — target input.
  const byName = (name) =>
    document.querySelector(`#find-form input[name="${CSS.escape(name)}"]`);
  const byTestId = (id) =>
    document.querySelector(`#find-form [data-testid="${id}"]`);

  function fillTextField(el, value, label) {
    if (!el) return console.warn("[FF] missing text field:", label);
    el.focus();
    setNativeValue(el, value);
    el.dispatchEvent(new Event("blur", { bubbles: true }));
  }

  function selectRadio(name, value) {
    const el = document.querySelector(`#find-form [name="${name}"][value="${value}"]`);
    if (!el) return console.warn("[FF] missing radio:", name, value);
    el.click();
  }

  function key(el, k, keyCode) {
    for (const type of ["keydown", "keyup"]) {
      el.dispatchEvent(new KeyboardEvent(type, {
        key: k, code: k, keyCode, which: keyCode, bubbles: true, cancelable: true,
      }));
    }
  }

  function realClick(el) {
    const r = el.getBoundingClientRect();
    const pos = { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
    for (const type of ["pointerover", "pointerenter", "pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
      const Ctor = type.startsWith("pointer") && window.PointerEvent ? PointerEvent : MouseEvent;
      el.dispatchEvent(new Ctor(type, { bubbles: true, cancelable: true, view: window, ...pos }));
    }
  }

  const visibleOptions = () =>
    [...document.querySelectorAll('[role="option"]')].filter((o) => o.offsetParent !== null);

  // Field wrapper shows "Non-standardized Date/Place" until the rich object binds.
  function isStandardized(el) {
    const wrap = el.closest(".autosuggest-wrapper") || el.parentElement;
    return !/non-standardized/i.test(wrap?.textContent || "");
  }

  async function openAndGetOptions(el, typed) {
    el.focus();
    setNativeValue(el, "");
    setNativeValue(el, typed);
    key(el, "a", 65); // nudge widgets that only react to key events
    return waitFor(() => {
      const o = visibleOptions();
      return o.length ? o : null;
    });
  }

  // Downshift sets aria-selected on the highlighted option / aria-activedescendant
  // on the input. -1 if none highlighted.
  function highlightedIndex(el) {
    const opts = visibleOptions();
    const active = el.getAttribute("aria-activedescendant");
    return opts.findIndex(
      (o) => o.getAttribute("aria-selected") === "true" || (active && o.id === active)
    );
  }

  // Step the highlight to exactly idx (Downshift auto-highlights #0, so blind
  // counting overshoots), then Enter. Mouse click as fallback.
  async function trySelect(el, idx) {
    for (let guard = 0; guard < 25; guard++) {
      const cur = highlightedIndex(el);
      if (cur === idx) break;
      const down = cur === -1 || cur < idx;
      key(el, down ? "ArrowDown" : "ArrowUp", down ? 40 : 38);
      await sleep(60);
    }
    key(el, "Enter", 13);
    await sleep(400);
    if (isStandardized(el)) return true;

    const opts = visibleOptions();
    const c = opts[idx] || opts[0];
    if (c) realClick(c);
    await sleep(400);
    return isStandardized(el);
  }

  /**
   * Fill an autosuggest combo and commit the standardized selection.
   * opts: { matcher, pick, settleMs, attempts }
   *  - pick:    element predicate identifying the standardized option; we WAIT
   *             until such an option exists, then select it (whatever its index).
   *             Date uses this to target the option bearing the calendar icon,
   *             which dodges the echo (e.g. "abt 1735" echo vs "about 1735" std).
   *  - matcher: text predicate to choose the option (else option #0).
   */
  async function fillCombo(name, typed, { matcher, pick, settleMs = 250, attempts = 1 } = {}) {
    const el = byName(name);
    if (!el) { console.warn("[FF] missing combo:", name); return false; }

    const idxOf = (opts) => {
      let i = -1;
      if (pick) i = opts.findIndex(pick);
      else if (matcher) i = opts.findIndex((o) => matcher(o.textContent.trim()));
      return i >= 0 ? i : 0;
    };

    for (let attempt = 1; attempt <= attempts; attempt++) {
      let options;
      try {
        options = await openAndGetOptions(el, typed);
      } catch {
        console.warn("[FF]", name, "— no suggestions appeared.");
        return false;
      }

      if (pick) {
        // Wait until the standardized option (e.g. the one with the icon) exists.
        try {
          options = await waitFor(() => {
            const o = visibleOptions();
            return o.length && o.some(pick) ? o : null;
          }, { timeout: 6000 });
        } catch {
          options = visibleOptions();
        }
      } else {
        await sleep(settleMs);
        options = visibleOptions();
      }

      if (!options.length) continue;
      if (await trySelect(el, idxOf(options))) return true;
      await sleep(300);
    }
    console.warn("[FF]", name, "— could not standardize, left as typed:", el.value);
    return false;
  }

  // The standardized date option carries a calendar icon; the raw echo does not.
  const DATE_PICK = (o) => !!o && !!o.querySelector("svg");
  const ILLOGAN = "Illogan, Cornwall, England, United Kingdom";

  async function fillPerson(rec) {
    if (!document.querySelector("#find-form")) return { ok: false, error: "no form on page" };
    fillTextField(byTestId("first-name"), rec.given, "first-name");
    fillTextField(byTestId("last-name"), rec.surname, "last-name");
    if (rec.sex) selectRadio("sex", rec.sex);
    selectRadio("status", "deceased");

    let dateOk = true, placeOk = true;
    if (rec.birthYear)
      dateOk = await fillCombo("birthDate", rec.birthYear, { attempts: 3, pick: DATE_PICK });
    placeOk = await fillCombo("birthPlace", ILLOGAN, {
      attempts: 2,
      matcher: (t) => /^illogan, cornwall/i.test(t),
    });
    return { ok: true, dateOk, placeOk };
  }

  async function fillParent(parent, childYear) {
    if (!document.querySelector("#find-form")) return { ok: false, error: "no form on page" };
    fillTextField(byTestId("first-name"), parent.given, "first-name");
    fillTextField(byTestId("last-name"), parent.surname, "last-name");
    if (parent.sex) selectRadio("sex", parent.sex);
    selectRadio("status", "deceased");

    let dateOk = true;
    const y = parseInt(childYear, 10);
    if (y) {
      // Parent birth is unknown — seed a standardized RANGE so the search isn't
      // pinned to one year. Born up to 45 years before the child (oldest), down
      // to the youngest plausible childbearing age: mothers ~16, fathers ~20.
      // FamilySearch standardizes "from about A to B" into a date range ("about"
      // on the first date only); the standardized option carries the calendar icon.
      const youngest = parent.sex === "female" ? 16 : 20;
      dateOk = await fillCombo(
        "birthDate",
        `from about ${y - 45} to ${y - youngest}`,
        { attempts: 3, pick: DATE_PICK }
      );
    }
    // Parent birthplace is intentionally left blank (unknown).
    return { ok: true, dateOk };
  }

  FF.fillPerson = fillPerson;
  FF.fillParent = fillParent;
})();
