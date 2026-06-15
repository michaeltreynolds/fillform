/* Flow detection — which FamilySearch flow is the find-form sitting in?
 *
 *  - Add Unconnected Person: #find-form present, NOT inside an "Add …" dialog.
 *  - Add Parent: #find-form inside <div role="dialog" aria-label="Add ParentsChild: <name>">.
 *  - Add Spouse: #find-form inside <div role="dialog" aria-label="Add SpouseSpouse: <name>">.
 *
 * The Spouse modal is the SAME find-form as the Parent modal, so it's a "parent"
 * flow too: in Chris's workflow he adds a parent, then adds a spouse to that
 * parent — and the spouse he's adding IS the child's other parent. The modal
 * names the already-added parent (`Spouse: <name>`), so the panel uses that to
 * recommend filling the OTHER parent.
 *
 * Returns { flow: "person" | "parent" | null, childName?, spouseName? }.
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
    if (/add spouse/i.test(label)) {
      const m = label.match(/spouse:\s*(.+)$/i);
      return { flow: "parent", spouseName: m ? m[1].trim() : null };
    }
    return { flow: "person" };
  }

  FF.detectFlow = detectFlow;
})();
