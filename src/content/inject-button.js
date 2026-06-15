/* Injected control panel — shows the current record + flow-aware "Fill" buttons.
 *
 * The panel is a fixed-position element attached to <body> (NOT inside the React
 * form, so React can't clobber it). A MutationObserver shows/hides it as the
 * find-form mounts/unmounts in the SPA.
 */
(function () {
  const FF = window.FF;
  const PANEL_ID = "ff-panel";
  const VERSION = chrome.runtime.getManifest().version;
  let state = { records: [], index: 0 };
  let lastSig = "";

  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
    );
  const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
  const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();

  function ensurePanel() {
    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = document.createElement("div");
      panel.id = PANEL_ID;
      document.body.appendChild(panel);
    }
    return panel;
  }

  function status(msg) {
    const el = document.getElementById("ff-status");
    if (el) el.textContent = msg || "";
  }

  function warnFlags(r) {
    const w = [];
    if (r.dateOk === false) w.push("date not standardized");
    if (r.placeOk === false) w.push("place not standardized");
    return w.length ? "⚠ " + w.join(", ") + " — fix manually" : "✓";
  }

  function render(flow, info) {
    const { childName, spouseName } = info || {};
    const panel = ensurePanel();
    panel.style.display = "block";
    const { records, index } = state;

    if (!records.length) {
      panel.innerHTML =
        `<div class="ff-head">FillForm <span class="ff-ver">v${VERSION}</span></div>` +
        `<div class="ff-empty">No data loaded. Click the FillForm toolbar icon to paste CSV.</div>`;
      return;
    }

    const i = Math.min(index, records.length - 1);
    const rec = records[i];
    let html =
      `<div class="ff-head">FillForm <span class="ff-ver">v${VERSION}</span> — record ${i + 1} / ${records.length}</div>` +
      `<div class="ff-rec">${esc(rec.given)} ${esc(rec.surname)} · ${esc(rec.sex || "?")} · b. ${esc(rec.birthYear || "?")}</div>`;

    if (flow === "parent") {
      if (childName) {
        const match = norm(childName) === norm(rec.given + " " + rec.surname);
        html += `<div class="ff-child${match ? "" : " ff-warn"}">Child in form: ${esc(childName)}` +
          (match ? "" : " ⚠ doesn't match current record") + `</div>`;
      }
      // Add-Spouse flow: the named person is the already-added parent; the spouse
      // we're filling is the OTHER parent. Match the name to a parsed parent and
      // recommend its counterpart.
      let recommended = null;
      if (spouseName) {
        const matched = (rec.parents || []).find(
          (p) => norm(spouseName) === norm(p.given + " " + p.surname)
        );
        recommended = matched
          ? (rec.parents || []).find((p) => p.role !== matched.role)
          : null;
        html += `<div class="ff-child${matched ? "" : " ff-warn"}">Spouse in form: ${esc(spouseName)}` +
          (matched ? ` (${cap(matched.role)} in data)` : " ⚠ doesn't match a parent in data") + `</div>`;
      }
      if (rec.parents && rec.parents.length) {
        html += `<div class="ff-btns">`;
        for (const p of rec.parents) {
          const isRec = recommended && p.role === recommended.role;
          html += `<button class="ff-btn${isRec ? " ff-primary" : ""}" data-parent="${esc(p.role)}">Fill ${cap(p.role)}: ${esc(p.given)} ${esc(p.surname)}${isRec ? " ◀ likely" : ""}</button>`;
        }
        html += `</div>`;
      } else {
        html += `<div class="ff-empty">No parents in data for this record.</div>`;
      }
    } else {
      html += `<div class="ff-btns"><button class="ff-btn ff-primary" data-fill="person">Fill ${esc(rec.given)} ${esc(rec.surname)}</button></div>`;
      if (rec.parents && rec.parents.length)
        html += `<div class="ff-sub">For the Add-Parent step: ${rec.parents.map((p) => cap(p.role) + " " + esc(p.given)).join(", ")}</div>`;
    }

    html +=
      `<div class="ff-nav">` +
      `<button class="ff-link" data-nav="prev" ${i === 0 ? "disabled" : ""}>◀ Prev</button>` +
      `<button class="ff-link" data-nav="next" ${i >= records.length - 1 ? "disabled" : ""}>Next ▶</button>` +
      `</div><div class="ff-status" id="ff-status"></div>`;

    panel.innerHTML = html;
    wire(panel, rec);
  }

  function wire(panel, rec) {
    const fill = panel.querySelector("[data-fill='person']");
    if (fill)
      fill.onclick = async () => {
        status("Filling…");
        const r = await FF.fillPerson(rec);
        status(r.ok ? "Filled. " + warnFlags(r) : "Error: " + r.error);
      };

    panel.querySelectorAll("[data-parent]").forEach((b) => {
      b.onclick = async () => {
        const role = b.getAttribute("data-parent");
        const p = rec.parents.find((x) => x.role === role);
        status("Filling " + role + "…");
        const r = await FF.fillParent(p, rec.birthYear);
        status(r.ok ? "Filled " + role + ". " + warnFlags(r) : "Error: " + r.error);
      };
    });

    panel.querySelectorAll("[data-nav]").forEach((b) => {
      b.onclick = async () => {
        const nav = b.getAttribute("data-nav");
        const i = nav === "prev"
          ? Math.max(0, state.index - 1)
          : Math.min(state.records.length - 1, state.index + 1);
        await FF.storage.setIndex(i); // storage change → re-render
      };
    });
  }

  // Re-render only when something meaningful changed (avoids wiping the status
  // line on unrelated SPA mutations).
  function maybeRender(force) {
    if (!document.querySelector("#find-form")) {
      const p = document.getElementById(PANEL_ID);
      if (p) p.style.display = "none";
      lastSig = "";
      return;
    }
    const info = FF.detectFlow();
    const { flow, childName, spouseName } = info;
    const sig = [flow, childName, spouseName, state.index, state.records.length].join("|");
    if (!force && sig === lastSig && document.getElementById(PANEL_ID)) return;
    lastSig = sig;
    render(flow, info);
  }

  async function refresh() {
    state = await FF.storage.getState();
    maybeRender(true);
  }

  let pending = null;
  const observer = new MutationObserver(() => {
    clearTimeout(pending);
    pending = setTimeout(() => maybeRender(false), 250);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  FF.storage.onChange(refresh);
  refresh();
})();
