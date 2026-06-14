/* Popup logic — paste CSV, parse, store; show current cursor + a small preview. */
(function () {
  const FF = window.FF;
  const ta = document.getElementById("csv");
  const statusEl = document.getElementById("status");
  const previewEl = document.getElementById("preview");

  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])
    );

  async function showState() {
    const { records, index } = await FF.storage.getState();
    if (!records.length) {
      statusEl.textContent = "No data loaded.";
      previewEl.innerHTML = "";
      return;
    }
    statusEl.textContent = `${records.length} records loaded · current: ${index + 1}.`;
    const r = records[Math.min(index, records.length - 1)];
    const parents = (r.parents || [])
      .map((p) => `${p.role} ${esc(p.given)} ${esc(p.surname)}`)
      .join(", ");
    previewEl.innerHTML =
      `<div class="pv-title">Current record</div>` +
      `<div>${esc(r.given)} ${esc(r.surname)} · ${esc(r.sex || "?")} · b. ${esc(r.birthYear || "?")}</div>` +
      (parents ? `<div class="pv-parents">Parents: ${parents}</div>` : `<div class="pv-parents">No parents listed.</div>`);
  }

  document.getElementById("load").onclick = async () => {
    const recs = FF.parseCsv(ta.value);
    if (!recs.length) {
      statusEl.textContent = "No records parsed — check the CSV.";
      return;
    }
    await FF.storage.setRecords(recs);
    showState();
  };

  document.getElementById("reset").onclick = async () => {
    await FF.storage.clear();
    ta.value = "";
    showState();
  };

  document.getElementById("version").textContent =
    "v" + chrome.runtime.getManifest().version;

  FF.storage.onChange(showState);
  showState();
})();
