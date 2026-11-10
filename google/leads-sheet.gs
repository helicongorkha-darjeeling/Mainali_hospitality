/**
 * Hotel Teesta: live leads sheet.
 * Paste into the Google Sheet (Extensions → Apps Script), then Deploy → New deployment → Web app
 * (Execute as: Me, Who has access: Anyone). Supabase posts every new or updated lead here.
 *
 * SECRET must match the "sheets_webhook_secret" in Supabase Vault.
 * The ready-to-paste copy with the real secret is google/leads-sheet.local.gs (git-ignored).
 */
const SECRET = "PASTE_SECRET_HERE";
const TAB = "Leads";

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
  // Pasted without the real secret: the placeholder is public (it's in the code on GitHub), so refuse everyone.
  if (SECRET.indexOf("PASTE_") === 0) return text("not configured");
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

    const values = [
      plain(r.id),
      new Date(r.updated_at || Date.now()),
      STAGE_LABEL[r.stage] || plain(r.stage),
      plain(r.name),
      r.phone ? "'" + r.phone : "", // keep "+91…" as text, not a formula
      plain(r.email),
      plain(r.check_in),
      plain(r.check_out),
      plain(r.guests),
      plain(r.rooms),
      plain(r.meal_plan),
      plain(r.total),
      plain(r.booking_id),
    ];
    sh.getRange(row, 1, 1, WRITTEN).setValues([values]);
    if (found < 0) sh.getRange(row, WRITTEN + 1).insertCheckboxes(); // "Called?" tick box for new rows
    return text("ok");
  } finally {
    lock.releaseLock();
  }
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

/**
 * What a visitor typed must stay text. Sheets runs any cell that starts with = + - or @ as a formula,
 * and a formula could send this sheet's names and phone numbers somewhere else. A leading ' keeps it as text.
 */
function plain(v) {
  if (v == null || v === "") return "";
  if (typeof v !== "string") return v;
  return /^[=+\-@\t\r\n]/.test(v) ? "'" + v : v;
}

function text(s) {
  return ContentService.createTextOutput(s);
}
