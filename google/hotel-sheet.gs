/**
 * Hotel Teesta: one Google Sheet for leads, bookings and free rooms.
 * Replaces leads-sheet.gs and room-chart.gs. Setup steps: docs/ROOMS_SHEET_SETUP.md.
 *
 * Tabs
 *   Leads     website visitors who left a phone number (Supabase sends them here)
 *   Bookings  THE list of bookings. The front desk adds one row per booking, the website adds "WEB" rows
 *   Rooms     made by this script: next 60 days × 25 rooms, guest names, free rooms per type
 *   Day       made by this script: Check-out / In-house / Arrivals for the date typed in B1 (like the old daily tabs)
 *
 * Bookings rules
 *   - Room numbers go in ROOM NO, several separated by "/" or ",": 306/307 (CP318 counts as 318).
 *   - A guest stays the nights from C/IN up to the day before C/OUT (C/IN 20 Nov, C/OUT 22 Nov = nights of 20 and 21 Nov).
 *   - STATUS: empty, BOOKED, C/IN or C/OUT = the room is taken.
 *             CANCEL, NO SHOW or WEB EXPIRED = the room is free again.
 *   - CHECK (last column) is filled by the script: "OK", or what's wrong (no room number, a clash with another row…).
 *
 * The web app (Deploy → Web app, Execute as: Me, Who has access: Anyone) takes posts from
 *   - Supabase: { secret, record }                       → a lead row
 *   - the website: { secret, action: availability | hold | confirm, … } → free rooms, and WEB rows in Bookings
 * SECRET must match "sheets_webhook_secret" in Supabase Vault and CHART_API_SECRET in Vercel.
 */
const SECRET = "PASTE_SECRET_HERE";

// ------------------------------------------------------------------ settings

// Email alerts for leads: off for now. To turn on, set EMAIL_ALERTS = true (and redeploy a new version).
const EMAIL_ALERTS = false;
// Who gets them. Empty = the Google account that owns this sheet. Several: ["a@gmail.com", "b@gmail.com"].
const ALERT_TO = [];
const ALERT_STAGES = ["payment", "booked"];

// Rooms by type (as the front desk's register calls them). Keep in step with roomInventory in src/content/site.ts.
const ROOM_TYPES = {
  king: [301, 302, 303, 305, 310, 311, 313, 314, 319, 320, 321, 322], // double bed
  triple: [312, 315, 318, 323, 325],
  quad: [304, 306, 307, 308, 309, 316, 317], // four bed / family
  family: [324], // big room
};
const TYPE_LABEL = { king: "Double", triple: "Triple", quad: "4-bed", family: "Big room" };
const DAYS_SHOWN = 60;
const HOLD_MINUTES = 30;

const LEADS = "Leads";
const BOOKINGS = "Bookings";
const ROOMS_TAB = "Rooms";
const DAY_TAB = "Day";

// Bookings columns (1-based). A–L are the register's columns, unchanged.
const B = { REV: 1, NAME: 2, CIN: 3, COUT: 4, ROOM: 5, PAX: 6, TYPE: 7, PLAN: 8, AGENT: 9, PAY: 10, STATUS: 11, LOCAL: 12, PHONE: 13, NOTES: 14, HOLD: 15, CHECK: 16 };
const BOOKING_HEADERS = ["REV NO", "GUEST NAME", "C/IN", "C/OUT", "ROOM NO", "PAX", "ROOM TYPE", "PLAN", "AGENT NAME", "PAYMENT", "STATUS", "LOCAL AGENT", "PHONE", "NOTES", "HOLD UNTIL", "CHECK"];

const COLOR = { desk: "#f4cccc", hold: "#fce8b2", web: "#c6efce", free: "#e6f4ea", head: "#efe7d6", problem: "#fde2e1" };

const ID_RE = /^TST-\d{6}-[A-Z0-9]{4}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ROOM_NO_RE = /3(?:0[1-9]|1\d|2[0-5])(?!\d)/g;

const ALL_ROOMS = Object.keys(ROOM_TYPES).reduce((a, t) => a.concat(ROOM_TYPES[t]), []);
const TYPE_OF = {};
Object.keys(ROOM_TYPES).forEach((t) => ROOM_TYPES[t].forEach((r) => (TYPE_OF[r] = t)));

// ------------------------------------------------------------------ web app

function doPost(e) {
  let d;
  try {
    d = JSON.parse(e.postData.contents);
  } catch (err) {
    return text("bad request");
  }
  if (!d || d.secret !== SECRET) return d && d.action ? json({ ok: false, reason: "forbidden" }) : text("forbidden");
  if (d.record) return leadPost(d.record);
  if (d.action === "availability") return json(availability(d.checkIn, d.checkOut)); // read only

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return json({ ok: false, reason: "busy" });
  let out;
  try {
    if (d.action === "hold") out = place(d, true);
    else if (d.action === "confirm") out = confirm(d);
    else out = { ok: false, reason: "unknown action" };
    if (out.ok) refresh();
  } catch (err) {
    out = { ok: false, reason: "error", message: String(err) };
  } finally {
    lock.releaseLock();
  }
  return json(out);
}

// ------------------------------------------------------------------ reading Bookings

/**
 * Every booking row, plus which room is taken on which night.
 * nights["2026-11-20"][305] = { row, name, kind: "desk" | "hold" | "web" }
 */
function readBookings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = ss.getSpreadsheetTimeZone();
  const sh = bookingsSheet(ss);
  const last = sh.getLastRow();
  const rows = last > 1 ? sh.getRange(2, 1, last - 1, BOOKING_HEADERS.length).getValues() : [];
  const now = Date.now();
  const nights = {};
  const list = rows.map((v, i) => {
    const b = {
      row: i + 2,
      v: v,
      id: String(v[B.REV - 1]).trim(),
      name: String(v[B.NAME - 1]).trim(),
      cin: dateKey(v[B.CIN - 1], tz),
      cout: dateKey(v[B.COUT - 1], tz),
      rooms: roomNumbers(v[B.ROOM - 1]),
      status: normStatus(v[B.STATUS - 1]),
      holdUntil: v[B.HOLD - 1] instanceof Date ? v[B.HOLD - 1].getTime() : Date.parse(v[B.HOLD - 1]) || 0,
      problems: [],
    };
    b.blank = !b.name && !b.cin && !b.cout && !String(v[B.ROOM - 1]).trim();
    b.kind = /^WEB/.test(b.status) ? (b.status === "WEB HOLD" ? "hold" : "web") : "desk";
    b.active = !b.blank && !/^(CANCEL|NO ?SHOW|WEB EXPIRED)/.test(b.status) && !(b.kind === "hold" && b.holdUntil && b.holdUntil < now);
    return b;
  });

  const today = todayKey(tz);
  list.forEach((b) => {
    if (b.blank) return;
    b.past = !!b.cout && b.cout < today; // stays that are over: used for the Day view, never flagged
    if (!b.cin) b.problems.push("C/IN date?");
    if (!b.cout) b.problems.push("C/OUT date?");
    if (b.cin && b.cout && b.cout <= b.cin) b.problems.push("C/OUT must be after C/IN");
    if (!b.rooms.length) b.problems.push("no room number: rooms not blocked");
    if (!b.active || b.problems.length) return;
    eachNight(b.cin, b.cout, (n) => {
      nights[n] = nights[n] || {};
      b.rooms.forEach((r) => {
        const other = nights[n][r];
        if (other) {
          if (b.past) return;
          const msg = "clash: " + r + " on " + n.slice(8) + "/" + n.slice(5, 7) + " with row " + other.row;
          if (b.problems.indexOf(msg) < 0) b.problems.push(msg);
        } else nights[n][r] = { row: b.row, name: b.name || b.id, kind: b.kind };
      });
    });
  });
  return { ss: ss, tz: tz, sh: sh, list: list, nights: nights };
}

/** Free rooms of each type for every night of the stay → { king: [301, …], … } */
function freeRooms(bk, from, to) {
  const out = {};
  Object.keys(ROOM_TYPES).forEach((t) => {
    out[t] = ROOM_TYPES[t].filter((r) => {
      let free = true;
      eachNight(from, to, (n) => {
        if (bk.nights[n] && bk.nights[n][r]) free = false;
      });
      return free;
    });
  });
  return out;
}

const counts = (free) => Object.keys(free).reduce((o, t) => ((o[t] = free[t].length), o), {});

/** "Double 3 · Triple 1 · 4-bed 0 · Big room 1 (5 free)" */
function freeText(free) {
  const c = counts(free);
  const total = Object.keys(c).reduce((s, t) => s + c[t], 0);
  return Object.keys(c).map((t) => TYPE_LABEL[t] + " " + c[t]).join(" · ") + " (" + total + " free)";
}

// ------------------------------------------------------------------ website actions

function availability(from, to) {
  if (!validStay(from, to)) return { ok: false, reason: "bad dates" };
  return { ok: true, free: counts(freeRooms(readBookings(), from, to)) };
}

/** Holds rooms for a website guest (the lowest free number of each type, the same room every night). */
function place(d, hold) {
  const req = parseRequest(d);
  if (!req) return { ok: false, reason: "bad request" };
  const bk = readBookings();
  const mine = bk.list.filter((b) => b.id === req.id && b.active);
  if (mine.length) {
    if (!hold || mine.some((b) => b.kind !== "hold")) return { ok: true, assigned: assignedOf(mine) }; // already booked
    const got = assignedOf(mine);
    const same = mine.every((b) => b.cin === req.checkIn && b.cout === req.checkOut) &&
      Object.keys(ROOM_TYPES).every((t) => (got[t] || []).length === (req.rooms[t] || 0));
    if (same) {
      // pressed again with the same stay: keep the rooms, restart the 30 minutes
      mine.forEach((b) => bk.sh.getRange(b.row, B.HOLD).setValue(new Date(Date.now() + HOLD_MINUTES * 60000)));
      return { ok: true, assigned: got };
    }
    mine.forEach((b) => bk.sh.getRange(b.row, B.STATUS).setValue("WEB EXPIRED")); // the guest changed the stay: place again
    return place(d, hold);
  }
  const free = freeRooms(bk, req.checkIn, req.checkOut);
  const assigned = {};
  for (const t of Object.keys(ROOM_TYPES)) {
    const qty = req.rooms[t] || 0;
    if (!qty) continue;
    if (free[t].length < qty) return { ok: false, reason: "sold_out", type: t, left: free[t].length };
    assigned[t] = free[t].slice(0, qty);
  }
  const rooms = Object.keys(assigned).reduce((a, t) => a.concat(assigned[t]), []);
  const types = Object.keys(assigned).map((t) => assigned[t].length + " " + TYPE_LABEL[t]).join(" + ");
  const row = new Array(BOOKING_HEADERS.length).fill("");
  row[B.REV - 1] = req.id;
  row[B.NAME - 1] = req.name || "Website guest";
  row[B.CIN - 1] = toDate(req.checkIn, bk.tz);
  row[B.COUT - 1] = toDate(req.checkOut, bk.tz);
  row[B.ROOM - 1] = rooms.join("/");
  row[B.PAX - 1] = req.pax || "";
  row[B.TYPE - 1] = types;
  row[B.PLAN - 1] = req.plan;
  row[B.AGENT - 1] = "WEBSITE";
  row[B.PAY - 1] = hold ? "" : payText(req);
  row[B.STATUS - 1] = hold ? "WEB HOLD" : "WEB VERIFY PAY";
  row[B.PHONE - 1] = req.phone ? "'" + req.phone : "";
  row[B.NOTES - 1] = req.label;
  row[B.HOLD - 1] = hold ? new Date(Date.now() + HOLD_MINUTES * 60000) : "";
  bk.sh.appendRow(row);
  bk.sh.getRange(bk.sh.getLastRow(), 1, 1, BOOKING_HEADERS.length).setBackground(hold ? COLOR.hold : COLOR.web);
  return { ok: true, assigned: assigned };
}

/** The guest says they've paid: the hold becomes a booking for the desk to verify. */
function confirm(d) {
  const req = parseRequest(d);
  if (!req) return { ok: false, reason: "bad request" };
  const bk = readBookings();
  const mine = bk.list.filter((b) => b.id === req.id && !b.blank);
  const live = mine.filter((b) => b.active);
  if (!live.length) {
    mine.forEach((b) => b.status === "WEB HOLD" && bk.sh.getRange(b.row, B.STATUS).setValue("WEB EXPIRED"));
    return place(d, false); // the hold ran out: book it now if the rooms are still free
  }
  live.forEach((b) => {
    if (b.kind !== "hold") return;
    bk.sh.getRange(b.row, B.STATUS).setValue("WEB VERIFY PAY");
    bk.sh.getRange(b.row, B.PAY).setValue(payText(req));
    bk.sh.getRange(b.row, B.HOLD).setValue("");
    bk.sh.getRange(b.row, 1, 1, BOOKING_HEADERS.length).setBackground(COLOR.web);
  });
  return { ok: true, assigned: assignedOf(live) };
}

function assignedOf(list) {
  const out = {};
  list.forEach((b) =>
    b.rooms.forEach((r) => {
      const t = TYPE_OF[r];
      if (!t) return;
      out[t] = out[t] || [];
      if (out[t].indexOf(r) < 0) out[t].push(r);
    })
  );
  Object.keys(out).forEach((t) => out[t].sort());
  return out;
}

const payText = (req) => (req.total ? "₹" + req.total + " UPI · VERIFY" : "UPI · VERIFY");

function parseRequest(d) {
  const id = String(d.bookingId || "");
  if (!ID_RE.test(id) || !validStay(d.checkIn, d.checkOut) || !d.rooms) return null;
  const rooms = {};
  let total = 0;
  Object.keys(ROOM_TYPES).forEach((t) => {
    rooms[t] = Math.max(0, Math.min(25, Math.floor(Number(d.rooms[t]) || 0)));
    total += rooms[t];
  });
  if (!total) return null;
  const clean = (s, n) => String(s || "").replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, n);
  const g = d.guest || {};
  return {
    id: id,
    checkIn: d.checkIn,
    checkOut: d.checkOut,
    rooms: rooms,
    label: clean(d.label, 160),
    name: clean(g.name, 60),
    pax: clean(g.pax, 10),
    plan: clean(g.plan, 6),
    phone: clean(g.phone, 16).replace(/[^\d+]/g, ""),
    total: Math.max(0, Math.round(Number(d.total) || 0)) || 0,
  };
}

/** Up to 30 nights, starting at most 2 days ago and within ~13 months. */
function validStay(from, to) {
  if (!DATE_RE.test(String(from)) || !DATE_RE.test(String(to))) return false;
  const a = Date.parse(from + "T00:00:00Z");
  const n = Math.round((Date.parse(to + "T00:00:00Z") - a) / 86400000);
  return n >= 1 && n <= 30 && a >= Date.now() - 2 * 86400000 && a <= Date.now() + 400 * 86400000;
}

// ------------------------------------------------------------------ Rooms + Day tabs, CHECK column

/** Rebuilds the CHECK column, the Rooms grid and the Day view from the Bookings list. */
function refresh() {
  const bk = readBookings();
  writeChecks(bk);
  buildRooms(bk);
  buildDay(bk);
}

function writeChecks(bk) {
  if (!bk.list.length) return;
  const checks = bk.list.map((b) => [b.blank ? "" : b.past ? "past" : b.problems.length ? b.problems.join("; ") : b.active ? "OK" : "free again"]);
  const range = bk.sh.getRange(2, B.CHECK, checks.length, 1);
  const before = range.getValues();
  if (JSON.stringify(before) !== JSON.stringify(checks)) range.setValues(checks);
  range.setBackgrounds(checks.map((c) => [/^(OK|free again|past|)$/.test(c[0]) ? null : COLOR.problem]));
}

function buildRooms(bk) {
  const ss = bk.ss;
  let sh = ss.getSheetByName(ROOMS_TAB);
  if (!sh) sh = ss.insertSheet(ROOMS_TAB);
  const types = Object.keys(ROOM_TYPES);
  const head = ["Date", "Day"].concat(types.map((t) => "Free " + TYPE_LABEL[t]), ["Total free"], ALL_ROOMS);
  const typeRow = ["", ""].concat(types.map(() => ""), [""], ALL_ROOMS.map((r) => TYPE_LABEL[TYPE_OF[r]]));
  const values = [];
  const colors = [];
  const start = todayKey(bk.tz);
  for (let i = 0; i < DAYS_SHOWN; i++) {
    const n = addDays(start, i);
    const taken = bk.nights[n] || {};
    const freeBy = types.map((t) => ROOM_TYPES[t].filter((r) => !taken[r]).length);
    const total = freeBy.reduce((s, x) => s + x, 0);
    const d = toDate(n, bk.tz);
    values.push([d, Utilities.formatDate(d, bk.tz, "EEE")].concat(freeBy, [total], ALL_ROOMS.map((r) => (taken[r] ? short(taken[r].name) : ""))));
    colors.push(
      [null, null]
        .concat(freeBy.map((x) => (x ? COLOR.free : COLOR.desk)), [total ? COLOR.free : COLOR.desk])
        .concat(ALL_ROOMS.map((r) => (taken[r] ? COLOR[taken[r].kind] : COLOR.free)))
    );
  }
  sh.clear();
  sh.getRange(1, 1).setValue("FREE ROOMS · made from the Bookings tab, updates by itself · green = free").setFontWeight("bold");
  sh.getRange(2, 1, 1, head.length).setValues([typeRow]).setFontSize(8).setFontColor("#7d7358");
  sh.getRange(3, 1, 1, head.length).setValues([head]).setFontWeight("bold").setBackground(COLOR.head);
  sh.getRange(4, 1, values.length, head.length).setValues(values).setBackgrounds(colors).setFontSize(9);
  sh.getRange(4, 1, values.length, 1).setNumberFormat("dd mmm");
  sh.getRange(4, 3, values.length, types.length + 1).setFontWeight("bold").setHorizontalAlignment("center");
  sh.setFrozenRows(3);
  sh.setFrozenColumns(2 + types.length + 1);
  sh.setColumnWidths(1, 2, 60);
  sh.setColumnWidths(3, types.length + 1, 70);
  sh.setColumnWidths(3 + types.length + 1, ALL_ROOMS.length, 78);
}

/** The old daily tab, made from Bookings for the date in B1 (today if empty). */
function buildDay(bk) {
  const ss = bk.ss;
  let sh = ss.getSheetByName(DAY_TAB);
  if (!sh) sh = ss.insertSheet(DAY_TAB);
  let day = sh.getRange("B1").getValue();
  const key = day instanceof Date ? Utilities.formatDate(day, bk.tz, "yyyy-MM-dd") : todayKey(bk.tz);
  const cols = [B.REV, B.NAME, B.CIN, B.COUT, B.ROOM, B.PAX, B.TYPE, B.PLAN, B.AGENT, B.PAY, B.STATUS, B.LOCAL, B.PHONE];
  const head = cols.map((c) => BOOKING_HEADERS[c - 1]);
  const live = bk.list.filter((b) => b.active && b.cin && b.cout);
  const sections = [
    ["CHECK-OUT", live.filter((b) => b.cout === key)],
    ["IN-HOUSE", live.filter((b) => b.cin < key && b.cout > key)],
    ["ARRIVAL", live.filter((b) => b.cin === key)],
  ];
  sh.getRange(3, 1, Math.max(sh.getMaxRows() - 2, 1), Math.max(sh.getMaxColumns(), head.length)).clear();
  sh.getRange("A1").setValue("DATE").setFontWeight("bold");
  if (!(day instanceof Date)) sh.getRange("B1").setValue(toDate(key, bk.tz));
  sh.getRange("B1").setNumberFormat("dd mmm yyyy (ddd)").setFontWeight("bold").setBackground(COLOR.hold);
  sh.getRange("C1").setValue("← type any date here").setFontColor("#7d7358");
  const free = freeRooms(bk, key, addDays(key, 1));
  sh.getRange("A2").setValue("Free tonight: " + freeText(free) + " · " + Object.keys(free).map((t) => free[t].join(", ")).filter(Boolean).join(", "));
  let r = 3;
  sections.forEach((s) => {
    sh.getRange(r, 1).setValue(s[0] + " · " + s[1].reduce((n, b) => n + b.rooms.length, 0) + " rooms").setFontWeight("bold").setBackground(COLOR.head);
    r++;
    sh.getRange(r, 1, 1, head.length).setValues([head]).setFontWeight("bold").setFontSize(9);
    r++;
    if (s[1].length) {
      sh.getRange(r, 1, s[1].length, head.length).setValues(s[1].map((b) => cols.map((c) => b.v[c - 1])));
      sh.getRange(r, 3, s[1].length, 2).setNumberFormat("dd/mm");
      r += s[1].length;
    }
    r++;
  });
}

// ------------------------------------------------------------------ leads

const LEAD_HEADERS = [
  "Lead ID", "Updated", "Stage", "Name", "Phone", "Email",
  "Check-in", "Check-out", "Guests", "Rooms", "Meal plan", "Total ₹", "Booking ID",
  "Called?", "Desk notes", "Free rooms for these dates",
];
const WRITTEN = 13; // A–M from the website; N–O are the desk's and never overwritten; P = free rooms
const FREE_COL = 16;
const STAGE_LABEL = {
  details: "1 · Left number",
  rooms: "2 · Choosing rooms",
  review: "3 · Reviewing",
  payment: "4 · At payment",
  booked: "5 · Says paid, verify",
};

let alertLater = null;

function leadPost(r) {
  if (!r.id) return text("bad request");
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return text("busy");
  let freeLine = "";
  try {
    const sh = leadsSheet();
    const last = sh.getLastRow();
    const ids = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map((v) => v[0]) : [];
    const found = ids.indexOf(r.id);
    const row = found >= 0 ? found + 2 : last + 1;
    const before = found >= 0 ? String(sh.getRange(row, 3).getValue()) : null;

    const values = [
      r.id,
      new Date(r.updated_at || Date.now()),
      STAGE_LABEL[r.stage] || r.stage,
      r.name || "",
      r.phone ? "'" + r.phone : "",
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
    if (found < 0) sh.getRange(row, WRITTEN + 1).insertCheckboxes();

    if (r.check_in && r.check_out && r.check_out > r.check_in) {
      try {
        freeLine = freeText(freeRooms(readBookings(), r.check_in, r.check_out));
        sh.getRange(row, FREE_COL).setValue(freeLine);
      } catch (err) {
        console.error("free rooms failed: " + err);
      }
    }

    const now = STAGE_LABEL[r.stage] || r.stage;
    if (found < 0) alertLater = { kind: ALERT_STAGES.indexOf(r.stage) >= 0 ? r.stage : "new", r: r, row: row, free: freeLine };
    else if (ALERT_STAGES.indexOf(r.stage) >= 0 && before !== now) alertLater = { kind: r.stage, r: r, row: row, free: freeLine };
    return text("ok");
  } finally {
    lock.releaseLock();
    if (alertLater && EMAIL_ALERTS) sendAlert(alertLater);
    alertLater = null;
  }
}

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
      ["Phone", r.phone ? '<a href="tel:' + esc(r.phone) + '">' + esc(r.phone) + "</a>" + (digits ? ' · <a href="https://wa.me/' + digits + '">WhatsApp</a>' : "") : ""],
      ["Email", esc(r.email)],
      ["Dates", r.check_in ? esc(r.check_in) + " → " + esc(r.check_out || "?") : ""],
      ["Guests", esc(r.guests)],
      ["Rooms", esc(r.rooms)],
      ["Free rooms", esc(a.free)],
      ["Meal plan", esc(r.meal_plan)],
      ["Total", r.total ? "₹" + esc(r.total) : ""],
      ["Booking ID", esc(r.booking_id)],
      ["UPI ref", esc(r.upi_ref)],
    ].filter((l) => l[1]);

    const url = SpreadsheetApp.getActiveSpreadsheet().getUrl() + "#gid=" + leadsSheet().getSheetId() + "&range=A" + a.row;
    const html =
      "<p><b>" + esc(head) + "</b></p>" +
      '<table cellpadding="4">' + lines.map((l) => "<tr><td><b>" + l[0] + "</b></td><td>" + l[1] + "</td></tr>").join("") + "</table>" +
      '<p><a href="' + url + '">Open the row in the Leads sheet</a></p>';
    const plain = head + "\n\n" + lines.map((l) => l[0] + ": " + l[1].replace(/<[^>]+>/g, "")).join("\n") + "\n\n" + url;
    MailApp.sendEmail({ to: to, subject: subject, body: plain, htmlBody: html, name: "Hotel Teesta website" });
  } catch (err) {
    console.error("alert failed: " + err);
  }
}

/** Run once from the editor: asks for the email permission and sends a sample alert. */
function testAlert() {
  sendAlert({
    kind: "booked",
    row: 2,
    free: "Double 3 · Triple 1 · 4-bed 2 · Big room 1 (7 free)",
    r: { name: "Test Guest", phone: "+919800000000", check_in: "2026-12-24", check_out: "2026-12-26", guests: 2, rooms: "1 × The King", meal_plan: "CP", total: 4250, booking_id: "TST-261224-TEST" },
  });
}

// ------------------------------------------------------------------ triggers and menu

/** Simple trigger: any edit in Bookings (or the date in Day!B1) rebuilds Rooms, Day and CHECK. */
function onEdit(e) {
  const name = e && e.range && e.range.getSheet().getName();
  if (name !== BOOKINGS && !(name === DAY_TAB && e.range.getA1Notation() === "B1")) return;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return;
  try {
    refresh();
  } finally {
    lock.releaseLock();
  }
}

/** Every hour: website holds nobody paid for become WEB EXPIRED, and the Rooms grid moves on to today. */
function hourly() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  try {
    const bk = readBookings();
    const now = Date.now();
    bk.list.forEach((b) => {
      if (b.status === "WEB HOLD" && b.holdUntil && b.holdUntil < now) {
        bk.sh.getRange(b.row, B.STATUS).setValue("WEB EXPIRED");
        bk.sh.getRange(b.row, 1, 1, BOOKING_HEADERS.length).setBackground(null);
      }
    });
    refresh();
  } finally {
    lock.releaseLock();
  }
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Teesta")
    .addItem("Refresh free rooms now", "menuRefresh")
    .addItem("Set up (run once)", "setup")
    .addToUi();
}

function menuRefresh() {
  refresh();
  SpreadsheetApp.getActive().toast("Rooms, Day and CHECK updated.", "Teesta");
}

/** Run once: makes the tabs, the hourly trigger, and the first Rooms grid. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  leadsSheet();
  const sh = bookingsSheet(ss);
  sh.getRange(1, 1, 1, BOOKING_HEADERS.length).setValues([BOOKING_HEADERS]).setFontWeight("bold").setBackground(COLOR.head);
  sh.setFrozenRows(1);
  sh.getRange("C:D").setNumberFormat("dd/mm/yyyy");
  sh.getRange("O:O").setNumberFormat("dd/mm hh:mm");
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["BOOKED", "C/IN", "C/OUT", "CANCEL", "NO SHOW", "WEB HOLD", "WEB VERIFY PAY", "WEB PAID", "WEB EXPIRED"], true)
    .setAllowInvalid(true)
    .build();
  sh.getRange(2, B.STATUS, Math.max(sh.getMaxRows() - 1, 1), 1).setDataValidation(statusRule);
  sh.getRange(2, B.CIN, Math.max(sh.getMaxRows() - 1, 1), 2).setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(true).build());

  ScriptApp.getProjectTriggers()
    .filter((t) => ["hourly", "releaseExpiredHolds"].indexOf(t.getHandlerFunction()) >= 0)
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("hourly").timeBased().everyHours(1).create();
  refresh();
  ss.toast("Done: Bookings, Rooms and Day are ready. Rooms update whenever Bookings changes.", "Teesta", 8);
}

// ------------------------------------------------------------------ sheets

function bookingsSheet(ss) {
  let sh = ss.getSheetByName(BOOKINGS);
  if (!sh) {
    sh = ss.insertSheet(BOOKINGS);
    sh.getRange(1, 1, 1, BOOKING_HEADERS.length).setValues([BOOKING_HEADERS]).setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  return sh;
}

function leadsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(LEADS);
  if (!sh) sh = ss.insertSheet(LEADS);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, LEAD_HEADERS.length).setValues([LEAD_HEADERS]).setFontWeight("bold");
    sh.setFrozenRows(1);
    sh.getRange("B:B").setNumberFormat("dd mmm yyyy, h:mm am/pm");
  } else if (!String(sh.getRange(1, FREE_COL).getValue())) {
    sh.getRange(1, FREE_COL).setValue(LEAD_HEADERS[FREE_COL - 1]).setFontWeight("bold");
  }
  return sh;
}

// ------------------------------------------------------------------ helpers

/** "306/307", "CP318", 319, "318/323/325" → [306, 307] … ; "8ROOMS" → [] */
function roomNumbers(v) {
  const s = String(v == null ? "" : v);
  const out = [];
  (s.match(ROOM_NO_RE) || []).forEach((m) => {
    const n = Number(m);
    if (TYPE_OF[n] && out.indexOf(n) < 0) out.push(n);
  });
  return out;
}

/** "C\IN", "c /in", " C/.IN" → "C/IN"; "cancelled" → "CANCEL…" */
function normStatus(v) {
  const s = String(v == null ? "" : v).toUpperCase().trim();
  const squash = s.replace(/[\s.\\/]/g, "");
  if (squash === "CIN") return "C/IN";
  if (squash === "COUT") return "C/OUT";
  return s.replace(/\s+/g, " ");
}

/** A Date cell, "20/11/2026", "20/11/26" or "20/11" (this year) → "2026-11-20"; anything else → "". */
function dateKey(v, tz) {
  if (v instanceof Date && !isNaN(v)) return Utilities.formatDate(v, tz, "yyyy-MM-dd");
  const m = String(v || "").trim().match(/^(\d{1,2})[\/.\-](\d{1,2})(?:[\/.\-](\d{2,4}))?$/);
  if (!m) return "";
  let y = m[3] ? Number(m[3]) : Number(Utilities.formatDate(new Date(), tz, "yyyy"));
  if (y < 100) y += 2000;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return "";
  return y + "-" + pad(mo) + "-" + pad(d);
}

function eachNight(from, to, fn) {
  for (let n = from, i = 0; n < to && i < 400; n = addDays(n, 1), i++) fn(n);
}

const addDays = (key, k) => new Date(Date.parse(key + "T00:00:00Z") + k * 86400000).toISOString().slice(0, 10);
const todayKey = (tz) => Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
const toDate = (key, tz) => Utilities.parseDate(key, tz, "yyyy-MM-dd");
const short = (s) => String(s).slice(0, 16);
const pad = (n) => (n < 10 ? "0" : "") + n;

function esc(v) {
  return v == null ? "" : String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}
function text(s) {
  return ContentService.createTextOutput(s);
}
function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
