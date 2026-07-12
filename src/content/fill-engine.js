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

  // Commit the chosen option. `find` re-resolves the target option element LIVE
  // (option nodes get replaced as the menu streams in, so a cached node goes
  // stale). We CLICK the target directly rather than arrow-stepping to it:
  // while the standardized option is still streaming in, the menu re-renders
  // repeatedly and Downshift re-homes its highlight to option #0 on every
  // re-render — so ArrowDown stepping visibly ping-pongs the highlight for a
  // second before it settles. A direct click sidesteps that highlight war.
  // Keyboard highlight+Enter stays as a fallback if the click doesn't take.
  async function trySelect(el, find) {
    const target = find();
    if (!target) return false;

    realClick(target);
    await sleep(400);
    if (isStandardized(el)) return true;

    const idx = visibleOptions().indexOf(find() || target);
    if (idx >= 0) {
      for (let guard = 0; guard < 25; guard++) {
        const cur = highlightedIndex(el);
        if (cur === idx) break;
        const down = cur === -1 || cur < idx;
        key(el, down ? "ArrowDown" : "ArrowUp", down ? 40 : 38);
        await sleep(60);
      }
      key(el, "Enter", 13);
      await sleep(400);
    }
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
  async function fillComboEl(el, typed, { matcher, pick, settleMs = 250, attempts = 1 } = {}, label = "combo") {
    if (!el) { console.warn("[FF] missing combo:", label); return false; }

    // Re-resolve the target option element live: the `pick` predicate (the
    // calendar-icon = standardized date) wins, else the text `matcher`, else the
    // first option.
    const find = () => {
      const opts = visibleOptions();
      if (!opts.length) return null;
      let i = -1;
      if (pick) i = opts.findIndex(pick);
      else if (matcher) i = opts.findIndex((o) => matcher(o.textContent.trim()));
      return opts[i >= 0 ? i : 0];
    };

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        await openAndGetOptions(el, typed);
      } catch {
        console.warn("[FF]", label, "— no suggestions appeared.");
        return false;
      }

      if (pick) {
        // Wait until the standardized option (the one with the icon) exists.
        try {
          await waitFor(() => {
            const o = visibleOptions();
            return o.length && o.some(pick) ? o : null;
          }, { timeout: 6000 });
        } catch { /* proceed with whatever rendered */ }
      }
      // Let the menu stop re-rendering before we commit, so we don't click a
      // node that's about to be replaced.
      await sleep(settleMs);

      if (!visibleOptions().length) continue;
      if (await trySelect(el, find)) return true;
      await sleep(300);
    }
    console.warn("[FF]", label, "— could not standardize, left as typed:", el.value);
    return false;
  }

  // Find-form convenience wrapper: resolve the combo by its input name.
  const fillCombo = (name, typed, opts) => fillComboEl(byName(name), typed, opts, name);

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
      // Parent birth is unknown — seed an approximate single year as a search
      // seed: fathers ~25 years before the child, mothers ~21. Typed as
      // FamilySearch's canonical "about <year>"; the standardized option carries
      // the calendar icon.
      const offset = parent.sex === "female" ? 21 : 25;
      dateOk = await fillCombo("birthDate", `about ${y - offset}`, {
        attempts: 3,
        pick: DATE_PICK,
      });
    }
    // Parent birthplace is intentionally left blank (unknown).
    return { ok: true, dateOk };
  }

  /**
   * On a person's page (Vitals), open the Christening "Add" dialog and fill its
   * Date + Place with the record's FULL date (day/month/year, unlike Birth which
   * is year-only) and Illogan — then STOP. We deliberately do NOT click Save:
   * FillForm never commits; Chris reviews the populated dialog and saves himself.
   */
  async function fillChristening(rec) {
    const addBtn = document.querySelector(
      '[data-testid="highlight-CHRISTENING"] [data-testid="conclusion:add:button"]'
    );
    if (!addBtn) return { ok: false, error: "no Add-Christening button (a christening may already exist)" };
    if (!rec.dateText) return { ok: false, error: "record has no date" };

    realClick(addBtn);

    // The Christening add/edit dialog carries the CHRISTENING class on its form.
    let dateEl;
    try {
      dateEl = await waitFor(() =>
        document.querySelector('.CHRISTENING input[data-testid="conclusionDetailOverlay:date"]')
      );
    } catch {
      return { ok: false, error: "christening dialog did not open" };
    }

    const dateOk = await fillComboEl(dateEl, rec.dateText, { attempts: 3, pick: DATE_PICK }, "christeningDate");
    const placeEl = document.querySelector('.CHRISTENING input[data-testid="conclusionDetailOverlay:place"]');
    const placeOk = await fillComboEl(
      placeEl,
      ILLOGAN,
      { attempts: 2, matcher: (t) => /^illogan, cornwall/i.test(t) },
      "christeningPlace"
    );

    // No Save — leave the dialog open for Chris to review and commit.
    return { ok: true, dateOk, placeOk };
  }

  FF.fillPerson = fillPerson;
  FF.fillParent = fillParent;
  FF.fillChristening = fillChristening;
})();
