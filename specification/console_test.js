/* ============================================================================
 * FillForm — DevTools console test harness
 * ----------------------------------------------------------------------------
 * PURPOSE: validate that we can populate the FamilySearch "Add Unconnected
 * Person" find-form purely by driving the page's own UI — including the tricky
 * Date and Place autosuggest fields — so that a real submit produces the full
 * rich payload (formalText/julianDateRange for date; geoCode/id for place).
 *
 * HOW TO USE:
 *   1. On familysearch.org, open the "Add Unconnected Person" form.
 *   2. Open DevTools (F12) → Console. (If pasting is blocked, type
 *      "allow pasting" first, then paste.)
 *   3. Paste this whole file and press Enter. It auto-runs the Anne Gribbell
 *      sample (matches specification/api_samples/search_by_name.md).
 *   4. Watch the form fill. Then open the Network tab, click the form's
 *      Search/Find button, and inspect the "by-name-with-spouses" request
 *      payload. Compare it to the known-good sample.
 *
 * Re-run a custom record from the console:
 *   FF.fillChild({ given:"Anne", surname:"Gribbell", sex:"female",
 *                  birthYear:"1755", birthPlace:"Illogan, Cornwall, England, United Kingdom" })
 *
 * Nothing here submits the form — you stay in control.
 * ========================================================================== */
(() => {
  const LOG = (...a) => console.log("%c[FF]", "color:#0a7", ...a);
  const WARN = (...a) => console.warn("[FF]", ...a);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // React-controlled inputs ignore plain `el.value = x`. We must call the
  // native value setter, then dispatch a bubbling input event so React's
  // onChange fires.
  function setNativeValue(el, value) {
    const proto = Object.getPrototypeOf(el);
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    desc.set.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  async function waitFor(fn, { timeout = 6000, interval = 100, label = "" } = {}) {
    const start = performance.now();
    for (;;) {
      const v = fn();
      if (v) return v;
      if (performance.now() - start > timeout)
        throw new Error("waitFor timed out: " + label);
      await sleep(interval);
    }
  }

  // NB: the form wraps each combo in a <div name="birthDate"> AROUND the
  // <input name="birthDate">, so we must target the input specifically.
  const byName = (name) =>
    document.querySelector(`#find-form input[name="${CSS.escape(name)}"]`) ||
    document.querySelector(`input[name="${CSS.escape(name)}"]`);
  const byTestId = (id) => document.querySelector(`[data-testid="${id}"]`);

  function fillTextField(el, value, label) {
    if (!el) return WARN("missing text field:", label);
    el.focus();
    setNativeValue(el, value);
    el.dispatchEvent(new Event("blur", { bubbles: true }));
    LOG("filled", label, "=", JSON.stringify(value));
  }

  function selectRadio(name, value) {
    const el = document.querySelector(
      `#find-form [name="${name}"][value="${value}"]`
    );
    if (!el) return WARN("missing radio:", name, value);
    el.click();
    LOG("selected", name, "=", value);
  }

  // Realistic click — autosuggest menus often act on mousedown (to beat the
  // input's blur), so fire the whole pointer/mouse sequence.
  function realClick(el) {
    const r = el.getBoundingClientRect();
    const pos = { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
    for (const type of ["pointerover", "pointerenter", "pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
      const Ctor = type.startsWith("pointer") && window.PointerEvent ? PointerEvent : MouseEvent;
      el.dispatchEvent(new Ctor(type, { bubbles: true, cancelable: true, view: window, ...pos }));
    }
  }

  function key(el, k, keyCode) {
    for (const type of ["keydown", "keyup"]) {
      el.dispatchEvent(
        new KeyboardEvent(type, {
          key: k, code: k, keyCode, which: keyCode, bubbles: true, cancelable: true,
        })
      );
    }
  }

  function visibleOptions() {
    return [...document.querySelectorAll('[role="option"]')].filter(
      (o) => o.offsetParent !== null
    );
  }

  // The field wrapper shows a "Non-standardized Date/Place" warning when the
  // rich standardized object was NOT attached. Success = that text is absent.
  function isStandardized(el) {
    const wrap = el.closest(".autosuggest-wrapper") || el.closest('[name]')?.parentElement || el.parentElement;
    const txt = (wrap?.textContent || "");
    return !/non-standardized/i.test(txt);
  }

  // (Re)open the menu by retyping, then wait for at least one option.
  async function openAndGetOptions(el, typed) {
    el.focus();
    setNativeValue(el, "");
    setNativeValue(el, typed);
    key(el, "a", 65); // nudge widgets that only react to key events
    return waitFor(
      () => {
        const o = visibleOptions();
        return o.length ? o : null;
      },
      { timeout: 7000, label: "options" }
    );
  }

  // Index of the currently highlighted option (Downshift sets aria-selected on
  // it and aria-activedescendant on the input). -1 if none highlighted.
  function highlightedIndex(el) {
    const opts = visibleOptions();
    const active = el.getAttribute("aria-activedescendant");
    return opts.findIndex(
      (o) => o.getAttribute("aria-selected") === "true" || (active && o.id === active)
    );
  }

  // Select option #idx by stepping the highlight to exactly idx (Downshift
  // auto-highlights #0 on open, so blind counting overshoots), then Enter.
  // Mouse click is the fallback. Returns "keyboard"/"click"/null.
  async function trySelect(el, idx) {
    for (let guard = 0; guard < 25; guard++) {
      const cur = highlightedIndex(el);
      if (cur === idx) break;
      key(el, cur === -1 || cur < idx ? "ArrowDown" : "ArrowUp", cur === -1 || cur < idx ? 40 : 38);
      await sleep(60);
    }
    key(el, "Enter", 13);
    await sleep(400);
    if (isStandardized(el)) return "keyboard";

    const opts = visibleOptions();
    const c = opts[idx] || opts[0];
    if (c) realClick(c);
    await sleep(400);
    return isStandardized(el) ? "click" : null;
  }

  /**
   * Drive an autosuggest combobox so the rich *standardized* object is bound.
   *
   * Key subtlety: the Date field renders an instant ECHO option before its
   * dates/interp API resolves — and the single option is upgraded IN PLACE
   * (it gains a calendar icon) rather than replaced. Selecting the echo leaves
   * it non-standardized. So when a `ready` predicate is given we wait until the
   * chosen option satisfies it (e.g. has its icon) before selecting; otherwise
   * we just wait `settleMs`. We verify via the "Non-standardized" warning and
   * retry up to `attempts` times.
   */
  async function fillCombo(name, typed, { matcher, label, settleMs = 250, attempts = 1, ready } = {}) {
    const el = byName(name);
    if (!el) return WARN("missing combo:", name);
    label = label || name;
    LOG("filling", label, "=", JSON.stringify(typed), `(attempts=${attempts}${ready ? ", waits-for-ready" : `, settleMs=${settleMs}`})`);

    const idxOf = (opts) => Math.max(0, matcher ? opts.findIndex((o) => matcher(o.textContent.trim())) : 0);

    let lastOptions = [];
    for (let attempt = 1; attempt <= attempts; attempt++) {
      let options;
      try {
        options = await openAndGetOptions(el, typed);
      } catch (e) {
        WARN(label, "— no suggestions appeared.", e.message, "aria-expanded:", el.getAttribute("aria-expanded"));
        return false;
      }

      if (ready) {
        // Wait until the option we intend to pick is fully resolved (not an echo).
        try {
          options = await waitFor(
            () => {
              const o = visibleOptions();
              return o.length && ready(o[idxOf(o)]) ? o : null;
            },
            { timeout: 6000, label: `${label} option-ready` }
          );
        } catch (e) {
          WARN(label, `attempt ${attempt}: option never became ready`, e.message);
          options = visibleOptions();
        }
      } else {
        await sleep(settleMs);
        options = visibleOptions();
      }

      lastOptions = options;
      if (!options.length) { WARN(label, `attempt ${attempt}: no options after wait`); continue; }

      const idx = idxOf(options);
      LOG(label, `attempt ${attempt}/${attempts} — ${options.length} option(s):`, options.map((o) => o.textContent.trim()), `→ selecting #${idx}`);

      const how = await trySelect(el, idx);
      if (how) {
        LOG("%c" + label + ` — ✅ STANDARDIZED via ${how}. value:`, "color:#0a0", JSON.stringify(el.value));
        return true;
      }
      WARN(label, `attempt ${attempt} did not standardize` + (attempt < attempts ? " — retrying…" : ""));
      await sleep(300);
    }

    // --- All attempts failed: dump DOM so we can design the right interaction ---
    WARN("%c" + label + " — ❌ STILL NON-STANDARDIZED. value:", "color:#c00", JSON.stringify(el.value));
    const choice = lastOptions[0];
    if (choice) {
      const listbox = choice.closest('[role="listbox"]') || choice.parentElement;
      console.log("[FF] option outerHTML:\n", choice.outerHTML);
      console.log("[FF] listbox outerHTML (truncated):\n", (listbox?.outerHTML || "").slice(0, 2000));
    }
    return false;
  }

  async function fillChild(rec) {
    LOG("=== filling child:", rec, "===");
    if (!document.querySelector("#find-form"))
      return WARN("No #find-form on this page — open Add Unconnected Person first.");

    fillTextField(byTestId("first-name"), rec.given, "first-name");
    fillTextField(byTestId("last-name"), rec.surname, "last-name");
    if (rec.sex) selectRadio("sex", rec.sex);
    selectRadio("status", "deceased");

    if (rec.birthYear)
      await fillCombo("birthDate", rec.birthYear, {
        label: "birthDate",
        attempts: 3,
        // The single date option is an echo until dates/interp resolves, at
        // which point it gains a calendar icon. Only select once it has one.
        ready: (o) => !!o && !!o.querySelector("svg"),
      });
    if (rec.birthPlace)
      await fillCombo("birthPlace", rec.birthPlace, {
        label: "birthPlace",
        attempts: 2,
        matcher: (t) => t.startsWith("Illogan, Cornwall"),
      });

    LOG("=== done. Now open Network tab and click the form's Find/Search " +
        "button, then inspect the by-name-with-spouses payload. ===");
  }

  window.FF = { fillChild, fillCombo, fillTextField, selectRadio, visibleOptions };

  // Auto-run the known-good sample.
  fillChild({
    given: "Anne",
    surname: "Gribbell",
    sex: "female",
    birthYear: "1755",
    birthPlace: "Illogan, Cornwall, England, United Kingdom",
  });
})();
