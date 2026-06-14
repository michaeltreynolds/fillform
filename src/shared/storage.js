/* Shared storage layer — used by both the popup and the content scripts.
 * State held in chrome.storage.local:
 *   ff_records : parsed record objects (see parse-csv.js)
 *   ff_index   : zero-based cursor marking the current record
 */
(function () {
  const FF = (window.FF = window.FF || {});
  const KEYS = { records: "ff_records", index: "ff_index" };

  FF.storage = {
    KEYS,

    async getState() {
      const d = await chrome.storage.local.get([KEYS.records, KEYS.index]);
      return {
        records: Array.isArray(d[KEYS.records]) ? d[KEYS.records] : [],
        index: Number.isInteger(d[KEYS.index]) ? d[KEYS.index] : 0,
      };
    },

    // Loading a new dataset resets the cursor to the first record.
    async setRecords(records) {
      await chrome.storage.local.set({ [KEYS.records]: records, [KEYS.index]: 0 });
    },

    async setIndex(index) {
      await chrome.storage.local.set({ [KEYS.index]: index });
    },

    async clear() {
      await chrome.storage.local.remove([KEYS.records, KEYS.index]);
    },

    onChange(cb) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && (changes[KEYS.records] || changes[KEYS.index])) cb();
      });
    },
  };
})();
