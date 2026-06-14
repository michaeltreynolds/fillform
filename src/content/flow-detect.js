/* Flow detection — which FamilySearch flow is the find-form sitting in?
 *
 *  - Add Unconnected Person: #find-form present, NOT inside an "Add Parents" dialog.
 *  - Add Parent: #find-form inside <div role="dialog" aria-label="Add ParentsChild: <name>">.
 *
 * Returns { flow: "person" | "parent" | null, childName? }.
 */
(function () {
  const FF = (window.FF = window.FF || {});

  function detectFlow() {
    const form = document.querySelector("#find-form");
    if (!form) return { flow: null };

    const dialog = form.closest('[role="dialog"]');
    const label = (dialog && dialog.getAttribute("aria-label")) || "";
    if (/add parent/i.test(label)) {
      const m = label.match(/child:\s*(.+)$/i);
      return { flow: "parent", childName: m ? m[1].trim() : null };
    }
    return { flow: "person" };
  }

  FF.detectFlow = detectFlow;
})();
