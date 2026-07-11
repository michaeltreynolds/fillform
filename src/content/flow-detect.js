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
 * Returns { flow: "person" | "parent" | "vitals" | null, childName?, spouseName?,
 * personName?, christeningExists?, canAddChristening? }.
 *
 * The "vitals" flow is a person's detail page (no find-form). After Chris creates
 * a person, he lands here; the panel offers a button that opens the Christening
 * "Add" dialog and fills its full date + Illogan (without saving).
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

  // No find-form on the page — are we looking at a person's detail (Vitals) page?
  // If so, expose the person's name and whether a Christening can still be added,
  // so the panel can offer a one-click "fill the Christening dialog" button.
  function detectVitals() {
    const vitals = document.querySelector('[data-testid="section-card-vitals"]');
    if (!vitals) return { flow: null };
    const nameEl = vitals.querySelector(
      '[data-testid="conclusionDisplay:NAME"] [data-testid="conclusion-name-template"]'
    );
    const personName = nameEl ? nameEl.textContent.trim() : null;
    const christeningExists = !!vitals.querySelector('[data-testid="conclusionDisplay:CHRISTENING"]');
    const canAddChristening = !!vitals.querySelector(
      '[data-testid="highlight-CHRISTENING"] [data-testid="conclusion:add:button"]'
    );
    return { flow: "vitals", personName, christeningExists, canAddChristening };
  }

  // Combined entry point: find-form flows take precedence (an Add-Parent dialog
  // can float over a Vitals page); fall back to Vitals detection.
  function detect() {
    const f = detectFlow();
    if (f.flow) return f;
    return detectVitals();
  }

  FF.detectFlow = detect;
})();
