# Requesting a change to FillForm

This page explains two things:

1. How to ask for a bug fix or a new feature.
2. How the **Copy page HTML** button works, and when to use it.

You don't need to know how to code for either of these.

---

## 1. How to ask for a bug fix or a new feature

Changes to FillForm are requested through **GitHub Issues** — a simple web form.
An automated assistant (Claude) reads new issues, makes the change, and replies
on the same issue explaining what it did and how to test it.

### Open a new request

1. Go to the project's **Issues** page:
   **https://github.com/michaeltreynolds/fillform/issues**
2. Click the green **New issue** button.
3. Fill in:
   - **Title** — a short summary, e.g. *"Fill button doesn't work on the Marriage
     search page"*.
   - **Description** — describe the problem or the feature in your own words.
     Include what you were doing, what you expected, and what happened instead.
     If it's about a specific screen, see [section 2](#2-how-the-copy-page-html-button-works)
     below on attaching that screen's HTML — it helps a lot.
4. Click **Submit new issue**.

That's it. The assistant picks it up automatically, usually within a few
minutes.

### What happens next

- If your request is clear, the assistant makes the change, and posts a
  comment on your issue summarizing what changed and how to test it (in plain
  language — no jargon).
- If something is unclear, it will post a comment asking a specific question
  instead of guessing.

### Replying to a question or follow-up

If the assistant asks you a question, or if you want to add more detail after
your issue was closed, add a comment on that same issue. **Start your comment
with the word `@claude`** — for example:

> @claude yes, that's the button I meant. It happens every time, not just
> sometimes.

Without `@claude` at the start, the assistant won't see your comment.

> **Note:** only a small allow-list of GitHub accounts can trigger the
> assistant (to stop random strangers from using it, since this project is
> public). If your comments aren't getting a response, you may need to be
> added to that list — ask whoever set up the project.

---

## 2. How the "Copy page HTML" button works

Sometimes a request is about a FamilySearch screen the extension doesn't
support yet (for example, a new type of form). In that case it's very useful
to attach a copy of that screen's underlying HTML to your issue — it lets the
assistant see exactly how the page is built, without needing a screenshot.

### Turning it on

1. Click the **FillForm** icon in your Chrome toolbar to open the popup.
2. Near the bottom, tick the checkbox labeled **Developer mode — show a Copy
   page HTML button on FamilySearch, for capturing a new screen to send with a
   feature request**.

This is a one-time setting — it stays on until you untick it.

### Using it

1. With developer mode on, go to the FamilySearch screen you want to report.
2. A small **FillForm** panel appears on the page with a **Copy page HTML**
   button (if no other FillForm panel is already showing there, a minimal one
   appears just for this button).
3. Click **Copy page HTML**. FillForm copies that screen's HTML to your
   clipboard and shows a message like *"Copied the open dialog HTML (12 KB)."*
4. Go to your GitHub issue (see section 1 above) and paste it (Ctrl+V / Cmd+V)
   into the description or a comment.

### What actually gets copied

FillForm tries to copy just the relevant part of the page, not the whole
thing:

- If a popup dialog box is open on screen, it copies that dialog.
- Otherwise, if you're on a known FamilySearch form, it copies that form.
- Otherwise, it copies the whole page.

### Before you paste it — check for personal details

The copied HTML is exactly what's on your screen, which may include real
names, dates, or other genealogy record details. **Glance over it before
pasting it into a public GitHub issue**, and remove or blank out anything you
don't want visible publicly.

### If copying doesn't work

Occasionally Chrome blocks the automatic copy. If that happens, FillForm's
message will tell you it instead printed the HTML to the browser's developer
console. You can ignore this unless someone specifically asks you to open the
console (press **F12**) and copy it from there.
