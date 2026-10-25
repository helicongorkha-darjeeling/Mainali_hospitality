/**
 * Hotel Teesta: room chart API. The booking chart (this Google Sheet) is the master; the website reads and writes it.
 *
 * Setup, once, in the chart's Google Sheet:
 *   1. Extensions → Apps Script. Paste this file and save.
 *   2. Deploy → New deployment → Web app. Execute as: Me. Who has access: Anyone. Send the /exec URL to the developer.
 *   3. Reload the sheet, then click Teesta → "Turn on auto-release of holds".
 *
 * How the chart is read (the way the desk uses it today):
 *   - every tab with a row of room numbers (in the first 10 rows) and real dates in column A
 *   - empty cell = free · any text = booked · text starting "CANCEL" = free · coloured but empty = booked
 *   - a date that appears in two tabs is free only if it's free in both
 * The website writes only its own cells (they start with "WEB"). It never changes the desk's entries.
 *
 * SECRET must match CHART_API_SECRET in Vercel. The copy with the real secret is room-chart.local.gs (git-ignored).
 */
const SECRET = "PASTE_SECRET_HERE";

// Keep in sync with roomInventory on the website (src/content/site.ts).
const ROOM_TYPES = {
  family: [324],
  quad: [307, 308, 309, 315, 316, 317],
  triple: [304, 306, 312, 318, 323, 325],
  king: [301, 302, 303, 305, 310, 311, 313, 314, 319, 320, 321, 322],
};
const ROOMS = [301, 302, 303, 304, 305, 306, 307, 308, 309, 310, 311, 312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 322, 323, 324, 325];
const HOLD_MINUTES = 30;
const COLOR_HOLD = "#fce8b2"; // amber: held while the guest pays
const COLOR_WEB = "#c6efce"; // green: booked on the website, payment to verify
const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const ID_RE = /^TST-\d{6}-[A-Z0-9]{4}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ROOM_RE = /(?:^|\D)(3(?:0[1-9]|1\d|2[0-5]))(?!\d)/; // "301", "dbl bed 301", "3BED 318"

/* ------------------------------------------------------------------ web app */

/** POST { secret, action: "availability" | "hold" | "confirm", checkIn, checkOut, bookingId?, rooms?, label? } */
function doPost(e) {
  let d;
  try {
    d = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, reason: "bad request" });
  }
  if (!d || d.secret !== SECRET) return json({ ok: false, reason: "forbidden" });
  if (d.action === "availability") return json(availability(d.checkIn, d.checkOut)); // read only, no lock

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return json({ ok: false, reason: "busy" });
  try {
    if (d.action === "hold") return json(place(d, true));
    if (d.action === "confirm") return json(confirm(d));
    return json({ ok: false, reason: "unknown action" });
  } catch (err) {
    return json({ ok: false, reason: "error", message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* ------------------------------------------------------------------ actions */

/**
 * Rooms of each type that are free on every night of the stay.
 * A month with no tab yet is all free (its tab is laid out on the first booking). A night missing from a month
 * the chart has (a mistyped or deleted row) is not sold online.
 */
function availability(from, to) {
  const nights = nightList(from, to);
  if (!nights) return { ok: false, reason: "bad dates" };
  const ix = index();
  const cells = readNights(ix, nights);
  const free = {};
  Object.keys(ROOM_TYPES).forEach((type) => {
    free[type] = ROOM_TYPES[type].filter((room) => nights.every((n) => (ix.dates[n] ? isFree(cells[n][room]) : !ix.months[n.slice(0, 7)]))).length;
  });
  return { ok: true, free: free };
}

/**
 * Writes a booking into the chart: the same room every night, the lowest free number of each type.
 * hold = true: amber "WEB HOLD" cells that free themselves after HOLD_MINUTES unless confirmed.
 */
function place(d, hold) {
  const req = parse(d);
  if (!req) return { ok: false, reason: "bad request" };

  let ix = index();
  const newMonths = {};
  req.nights.forEach((n) => !ix.dates[n] && !ix.months[n.slice(0, 7)] && (newMonths[n.slice(0, 7)] = true));
  if (Object.keys(newMonths).length) {
    Object.keys(newMonths).forEach((m) => ensureMonth(ix.ss, m + "-01"));
    ix = index();
  }
  if (req.nights.some((n) => !ix.dates[n])) return { ok: false, reason: "dates not in chart" };
  const cells = readNights(ix, req.nights);

  const mine = cellsOf(req.id, cells);
  if (mine.length) {
    if (!hold || !mine.every(isHold)) return { ok: true, assigned: roomsOf(mine) }; // already booked: same answer again
    mine.forEach(clearCell); // the guest went back and changed something: place it again
  }

  const assigned = {};
  const writes = [];
  for (const type of Object.keys(ROOM_TYPES)) {
    const qty = req.rooms[type] || 0;
    if (!qty) continue;
    const free = ROOM_TYPES[type].filter((room) => req.nights.every((n) => isFree(cells[n][room])));
    if (free.length < qty) return { ok: false, reason: "sold_out", type: type, left: free.length };
    assigned[type] = free.slice(0, qty);
    assigned[type].forEach((room) => req.nights.forEach((n) => cells[n][room].forEach((c) => writes.push(c))));
  }
  if (!writes.length) return { ok: false, reason: "bad request" };

  const text = hold ? "WEB HOLD · " + req.id + " · " + req.label : "WEB · " + req.id + " · " + req.label + " · VERIFY PAY";
  const until = new Date(Date.now() + HOLD_MINUTES * 60000).toISOString();
  writes.forEach((c) => {
    const r = c.sh.getRange(c.row, c.col).setValue(text).setBackground(hold ? COLOR_HOLD : COLOR_WEB);
    if (hold) r.setNote("hold-until:" + until);
    else r.clearNote();
  });
  return { ok: true, assigned: assigned };
}

/** The guest says they've paid: the hold becomes a booking. If the hold already ran out, book it now if still free. */
function confirm(d) {
  const req = parse(d);
  if (!req) return { ok: false, reason: "bad request" };
  const mine = cellsOf(req.id, readNights(index(), req.nights));
  if (!mine.length) return place(d, false);
  mine.forEach((c) => {
    if (!isHold(c)) return;
    const text = c.text.replace(/^WEB HOLD · /, "WEB · ") + " · VERIFY PAY";
    c.sh.getRange(c.row, c.col).setValue(text).setBackground(COLOR_WEB).clearNote();
  });
  return { ok: true, assigned: roomsOf(mine) };
}

/** Every 10 minutes: frees website holds nobody paid for. */
function releaseExpiredHolds() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return;
  try {
    const now = Date.now();
    eachGrid((sh, row0, col0, vals, notes) => {
      vals.forEach((rowVals, i) =>
        rowVals.forEach((v, j) => {
          const m = String(notes[i][j] || "").match(/hold-until:(\S+)/);
          if (/^WEB HOLD/.test(String(v)) && m && Date.parse(m[1]) < now) {
            sh.getRange(row0 + i, col0 + j).clearContent().setBackground(null).clearNote();
          }
        })
      );
    });
  } finally {
    lock.releaseLock();
  }
}

/* ------------------------------------------------------------------ menu */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Teesta")
    .addItem("Add next month", "addNextMonth")
    .addItem("Turn on auto-release of holds", "installTriggers")
    .addToUi();
}

function addNextMonth() {
  const ix = index();
  const last = Object.keys(ix.dates).sort().pop() || Utilities.formatDate(new Date(), ix.tz, "yyyy-MM-dd");
  const y = Number(last.slice(0, 4));
  const m = Number(last.slice(5, 7)); // next month, 1-based
  const next = m === 12 ? y + 1 + "-01-01" : y + "-" + pad(m + 1) + "-01";
  SpreadsheetApp.getUi().alert("Ready: " + ensureMonth(ix.ss, next));
}

function installTriggers() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === "releaseExpiredHolds")
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("releaseExpiredHolds").timeBased().everyMinutes(10).create();
  SpreadsheetApp.getUi().alert("Done. Website holds nobody paid for are freed after " + HOLD_MINUTES + " minutes.");
}

/* ------------------------------------------------------------------ reading the chart */

/**
 * Every date in every month tab → where its row is (a date can appear in more than one tab), plus the months the chart has.
 * A date counts only next to the day before or after it, so a mistyped one (10/9 for 9/10, or 2002 for 2026) is skipped.
 */
function index() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = ss.getSpreadsheetTimeZone();
  const dates = {};
  const months = {};
  ss.getSheets().forEach((sh) => {
    const head = header(sh);
    if (!head || sh.getLastRow() <= head.row) return;
    const rows = [];
    sh.getRange(head.row + 1, 1, sh.getLastRow() - head.row, 1)
      .getValues()
      .forEach((v, i) => v[0] instanceof Date && rows.push({ key: Utilities.formatDate(v[0], tz, "yyyy-MM-dd"), row: head.row + 1 + i }));
    rows.forEach((x, i) => {
      const fits = (i > 0 && nextDay(rows[i - 1].key) === x.key) || (i < rows.length - 1 && nextDay(x.key) === rows[i + 1].key);
      if (!fits) return;
      (dates[x.key] = dates[x.key] || []).push({ sh: sh, row: x.row, cols: head.cols });
      months[x.key.slice(0, 7)] = true;
    });
  });
  return { ss: ss, tz: tz, dates: dates, months: months };
}

/** The first row (of the top 10) with at least 10 room numbers → { row, cols: { room: column } }. */
function header(sh) {
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 2) return null;
  const top = sh.getRange(1, 1, Math.min(10, lastRow), lastCol).getDisplayValues();
  for (let r = 0; r < top.length; r++) {
    const cols = {};
    top[r].forEach((v, c) => {
      const m = String(v).match(ROOM_RE);
      if (m && c > 0 && !cols[m[1]]) cols[m[1]] = c + 1;
    });
    if (Object.keys(cols).length >= 10) return { row: r + 1, cols: cols };
  }
  return null;
}

/** night → room → every chart cell for that room-night, reading each tab in one block. */
function readNights(ix, nights) {
  const out = {};
  const bySheet = {};
  nights.forEach((n) => {
    out[n] = {};
    (ix.dates[n] || []).forEach((loc) => {
      const id = loc.sh.getSheetId();
      (bySheet[id] = bySheet[id] || { sh: loc.sh, cols: loc.cols, rows: [] }).rows.push({ n: n, row: loc.row });
    });
  });
  Object.keys(bySheet).forEach((id) => {
    const g = bySheet[id];
    const rows = g.rows.map((x) => x.row);
    const r0 = Math.min.apply(null, rows);
    const width = Math.max.apply(null, Object.keys(g.cols).map((k) => g.cols[k]));
    const range = g.sh.getRange(r0, 1, Math.max.apply(null, rows) - r0 + 1, width);
    const vals = range.getDisplayValues();
    const bgs = range.getBackgrounds();
    g.rows.forEach((x) =>
      Object.keys(g.cols).forEach((room) => {
        const col = g.cols[room];
        const cell = { room: Number(room), text: String(vals[x.row - r0][col - 1]), bg: bgs[x.row - r0][col - 1], sh: g.sh, row: x.row, col: col };
        (out[x.n][room] = out[x.n][room] || []).push(cell);
      })
    );
  });
  return out;
}

function isFree(cells) {
  return !!cells && cells.length > 0 && cells.every(cellFree);
}

function cellFree(c) {
  const t = c.text.trim();
  if (t) return /^cancel/i.test(t);
  const bg = String(c.bg || "").toLowerCase();
  return bg === "" || bg === "#ffffff"; // coloured but empty counts as booked
}

const isHold = (c) => /^WEB HOLD/.test(c.text);

function clearCell(c) {
  c.sh.getRange(c.row, c.col).clearContent().setBackground(null).clearNote();
  c.text = "";
  c.bg = "#ffffff";
}

/** Cells already written for this booking ID within the stay. */
function cellsOf(id, cells) {
  const found = [];
  Object.keys(cells).forEach((n) =>
    Object.keys(cells[n]).forEach((room) => cells[n][room].forEach((c) => c.text.indexOf(id) >= 0 && found.push(c)))
  );
  return found;
}

/** { king: [301, 302], … } from a list of cells. */
function roomsOf(list) {
  const out = {};
  list.forEach((c) => {
    const type = Object.keys(ROOM_TYPES).find((t) => ROOM_TYPES[t].indexOf(c.room) >= 0);
    if (!type) return;
    out[type] = out[type] || [];
    if (out[type].indexOf(c.room) < 0) out[type].push(c.room);
  });
  Object.keys(out).forEach((t) => out[t].sort());
  return out;
}

/** fn(sheet, firstRow, firstCol, values, notes) for the room grid of every month tab. */
function eachGrid(fn) {
  SpreadsheetApp.getActiveSpreadsheet()
    .getSheets()
    .forEach((sh) => {
      const head = header(sh);
      if (!head || sh.getLastRow() <= head.row) return;
      const cols = Object.keys(head.cols).map((k) => head.cols[k]);
      const c0 = Math.min.apply(null, cols);
      const range = sh.getRange(head.row + 1, c0, sh.getLastRow() - head.row, Math.max.apply(null, cols) - c0 + 1);
      fn(sh, head.row + 1, c0, range.getDisplayValues(), range.getNotes());
    });
}

/** Lays out the month of dateStr like the desk's tabs: in an empty tab named for that month if there is one, else a new "<MONTH> <YEAR>". */
function ensureMonth(ss, dateStr) {
  const y = Number(dateStr.slice(0, 4));
  const m = Number(dateStr.slice(5, 7)) - 1;
  const name = MONTHS[m] + " " + y;
  const tz = ss.getSpreadsheetTimeZone();
  let sh = ss.getSheets().find((s) => [MONTHS[m], name].indexOf(s.getName().trim().toUpperCase()) >= 0 && s.getLastRow() === 0);
  if (!sh) {
    if (ss.getSheetByName(name)) return name; // already there
    sh = ss.insertSheet(name, ss.getNumSheets());
  }
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const dates = [];
  for (let day = 1; day <= days; day++) dates.push([Utilities.parseDate(y + "-" + pad(m + 1) + "-" + pad(day), tz, "yyyy-MM-dd")]);
  sh.getRange(1, 1).setValue(name + " BOOKING CHART").setFontWeight("bold");
  sh.getRange(2, 1, 1, ROOMS.length + 1).setValues([["DATE"].concat(ROOMS)]).setFontWeight("bold");
  sh.getRange(3, 1, days, 1).setValues(dates).setNumberFormat("dd-mmm-yyyy");
  sh.setFrozenRows(2);
  sh.setFrozenColumns(1);
  return sh.getName();
}

/* ------------------------------------------------------------------ helpers */

/** Validated booking request, or null. */
function parse(d) {
  const nights = nightList(d.checkIn, d.checkOut);
  const id = String(d.bookingId || "");
  if (!nights || !ID_RE.test(id) || !d.rooms) return null;
  const rooms = {};
  let total = 0;
  Object.keys(ROOM_TYPES).forEach((t) => {
    rooms[t] = Math.max(0, Math.min(25, Math.floor(Number(d.rooms[t]) || 0)));
    total += rooms[t];
  });
  if (!total) return null;
  const label = String(d.label || "").replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, 160);
  return { id: id, nights: nights, rooms: rooms, label: label };
}

/** ["2026-10-25", "2026-10-26"] for a stay from 25 to 27 Oct (night = check-in date). Up to 30 nights, within ~13 months. */
function nightList(from, to) {
  if (!DATE_RE.test(String(from)) || !DATE_RE.test(String(to))) return null;
  const a = Date.parse(from + "T00:00:00Z");
  const b = Date.parse(to + "T00:00:00Z");
  const n = Math.round((b - a) / 86400000);
  if (!(n >= 1 && n <= 30) || a < Date.now() - 2 * 86400000 || a > Date.now() + 400 * 86400000) return null;
  const out = [];
  for (let i = 0; i < n; i++) out.push(new Date(a + i * 86400000).toISOString().slice(0, 10));
  return out;
}

const nextDay = (key) => new Date(Date.parse(key + "T00:00:00Z") + 86400000).toISOString().slice(0, 10);
const pad = (n) => (n < 10 ? "0" : "") + n;

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
