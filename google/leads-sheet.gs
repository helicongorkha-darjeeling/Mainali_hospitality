/**
 * Hotel Teesta: live leads sheet.
 * Paste into the Google Sheet (Extensions → Apps Script), then Deploy → New deployment → Web app
 * (Execute as: Me, Who has access: Anyone). Supabase posts every new or updated lead here.
 *
 * Email alerts: set ALERT_TO below, run testAlert() once to allow sending mail, then
 * Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy (keeps the same URL).
 *
 * SECRET must match the "sheets_webhook_secret" in Supabase Vault.
 * The ready-to-paste copy with the real secret is google/leads-sheet.local.gs (git-ignored).
 */
const SECRET = "PASTE_SECRET_HERE";
const TAB = "Leads";

// Email alerts to the front desk. Leave empty to send them to the Google account that owns this sheet.
// Several addresses: ["desk@gmail.com", "owner@gmail.com"].
const ALERT_TO = [];
// Which moments send an email: a new lead, reaching the UPI screen, saying they've paid.
const ALERT_STAGES = ["payment", "booked"];

// Columns A–M are written by the website. N onwards are for the front desk and are never overwritten.
const HEADERS = [
  "Lead ID", "Updated", "Stage", "Name", "Phone", "Email",
  "Check-in", "Check-out", "Guests", "Rooms", "Meal plan", "Total ₹", "Booking ID",
  "Called?", "Desk notes",
];
const WRITTEN = 13;

const STAGE_LABEL = {
  details: "1 · Left number",
  rooms: "2 · Choosing rooms",
  review: "3 · Reviewing",
  payment: "4 · At payment",
  booked: "5 · Says paid, verify",
};

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return text("bad request");
  }
  if (!data || data.secret !== SECRET || !data.record || !data.record.id) return text("forbidden");

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet();
    const r = data.record;
    const last = sh.getLastRow();
    const ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map((v) => v[0]) : [];
    const found = ids.indexOf(r.id);
    const row = found >= 0 ? found + 2 : last + 1;
    const before = found >= 0 ? String(sh.getRange(row, 3).getValue()) : null; // stage label already in the sheet

    const values = [
      r.id,
      new Date(r.updated_at || Date.now()),
      STAGE_LABEL[r.stage] || r.stage,
      r.name || "",
      r.phone ? "'" + r.phone : "", // keep "+91…" as text, not a formula
      r.email || "",
      r.check_in || "",
      r.check_out || "",
      r.guests || "",
      r.rooms || "",
      r.meal_plan || "",
      r.total || "",
      r.booking_id || "",
    ];
    sh.getRange(row, 1, 1, WRITTEN).setValues([values]);
    if (found < 0) sh.getRange(row, WRITTEN + 1).insertCheckboxes(); // "Called?" tick box for new rows

    // Alert once per moment: the stage only moves forward, so a repeated update sends nothing.
    const now = STAGE_LABEL[r.stage] || r.stage;
    if (found < 0) alertLater = { kind: ALERT_STAGES.indexOf(r.stage) >= 0 ? r.stage : "new", r: r, row: row };
    else if (ALERT_STAGES.indexOf(r.stage) >= 0 && before !== now) alertLater = { kind: r.stage, r: r, row: row };
    return text("ok");
  } finally {
    lock.releaseLock();
    if (alertLater) sendAlert(alertLater);
    alertLater = null;
  }
}

let alertLater = null;

/** Never lets a mail problem stop the row from being written. */
function sendAlert(a) {
  try {
    const r = a.r;
    const to = (ALERT_TO.length ? ALERT_TO : [Session.getEffectiveUser().getEmail()]).join(",");
    if (!to) return;
    const who = r.name || "A visitor";
    const head = {
      new: "New lead: " + who + " left their number. Call them.",
      payment: who + " is at payment (UPI screen).",
      booked: who + " says they've paid. Check the ICICI app and verify.",
    }[a.kind];
    const subject = {
      new: "New lead · " + who + " · " + (r.phone || ""),
      payment: "At payment · " + who + (r.total ? " · ₹" + r.total : ""),
      booked: "VERIFY PAYMENT · " + who + (r.total ? " · ₹" + r.total : "") + (r.booking_id ? " · " + r.booking_id : ""),
    }[a.kind];

    const digits = String(r.phone || "").replace(/[^\d]/g, "");
    const lines = [
      ["Phone", r.phone ? '<a href="tel:' + esc(r.phone) + '">' + esc(r.phone) + "</a>" +
        (digits ? ' · <a href="https://wa.me/' + digits + '">WhatsApp</a>' : "") : ""],
      ["Email", esc(r.email)],
      ["Dates", r.check_in ? esc(r.check_in) + " → " + esc(r.check_out || "?") : ""],
      ["Guests", esc(r.guests)],
      ["Rooms", esc(r.rooms)],
      ["Meal plan", esc(r.meal_plan)],
      ["Total", r.total ? "₹" + esc(r.total) : ""],
      ["Booking ID", esc(r.booking_id)],
      ["UPI ref", esc(r.upi_ref)],
    ].filter((l) => l[1]);

    const url = SpreadsheetApp.getActiveSpreadsheet().getUrl() + "#gid=" + sheet().getSheetId() + "&range=A" + a.row;
    const html =
      "<p><b>" + esc(head) + "</b></p>" +
      "<table cellpadding=\"4\">" + lines.map((l) => "<tr><td><b>" + l[0] + "</b></td><td>" + l[1] + "</td></tr>").join("") + "</table>" +
      '<p><a href="' + url + '">Open the row in the Leads sheet</a></p>';
    const plain = head + "\n\n" + lines.map((l) => l[0] + ": " + l[1].replace(/<[^>]+>/g, "")).join("\n") + "\n\n" + url;

    MailApp.sendEmail({ to: to, subject: subject, body: plain, htmlBody: html, name: "Hotel Teesta website" });
  } catch (err) {
    console.error("alert failed: " + err);
  }
}

function esc(v) {
  return v == null ? "" : String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

/** Run this once from the editor (select it, press Run): it asks for the email permission and sends a sample alert. */
function testAlert() {
  sendAlert({
    kind: "booked",
    row: 2,
    r: { name: "Test Guest", phone: "+919800000000", check_in: "2026-12-24", check_out: "2026-12-26", guests: 2,
         rooms: "1 × The King", meal_plan: "CP", total: 4250, booking_id: "TST-261224-TEST" },
  });
}

function sheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(TAB);
  if (!sh) sh = ss.insertSheet(TAB);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold");
    sh.setFrozenRows(1);
    sh.getRange("B:B").setNumberFormat("dd mmm yyyy, h:mm am/pm");
  }
  return sh;
}

function text(s) {
  return ContentService.createTextOutput(s);
}
