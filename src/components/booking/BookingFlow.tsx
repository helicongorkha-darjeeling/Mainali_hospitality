"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { hotel, rooms, type RoomSlug } from "@/content/site";
import { directThanks, frontDeskPerk, mealPlans, roomHighlights, upi, type MealPlanCode } from "@/content/booking";
import {
  addDays,
  allocateRooms,
  describeRooms,
  formatFull,
  inr,
  inventory,
  newBookingId,
  nightsBetween,
  quote,
  todayISO,
  totalCapacity,
  totalRooms,
  upiAppLinks,
  upiLink,
  detectPlatform,
  type RoomQty,
} from "@/lib/pricing";
import { loadDraft, saveDraft } from "@/lib/draft";
import { captureLead, type Lead, type LeadStage } from "@/lib/leads";
import { fullName, greetingName, titles } from "@/lib/guest";
import { Amenities, CancellationPolicy, DealPrice, PriceCard, Stepper, Ticket } from "./parts";

type Step = "rooms" | "review" | "pay" | "done";
const STEPS: { id: Step; label: string }[] = [
  { id: "rooms", label: "Rooms & meals" },
  { id: "review", label: "Review" },
  { id: "pay", label: "Payment" },
];

const isRoom = (v: string | null | undefined): v is RoomSlug => !!v && rooms.some((r) => r.slug === v);

export function BookingFlow() {
  const params = useSearchParams();

  // initial state: URL (dates, guests, room) + session draft (name, phone, email)
  const [init] = useState(() => {
    const d = loadDraft();
    const today = todayISO();
    const pIn = params.get("in") ?? d.checkIn;
    const checkIn = pIn && pIn >= today ? pIn : today;
    const pOut = params.get("out") ?? d.checkOut;
    const checkOut = pOut && pOut > checkIn ? pOut : addDays(checkIn, 1);
    const guests = Math.min(20, Math.max(1, Number(params.get("g") ?? d.guests ?? 2) || 2));
    const room = params.get("room") ?? d.room;
    return { today, checkIn, checkOut, guests, room: isRoom(room) ? room : ("" as const), title: d.title ?? "", name: d.name ?? "", phone: d.phone ?? "", email: d.email ?? "" };
  });

  const [step, setStep] = useState<Step>("rooms");
  const [checkIn, setCheckIn] = useState(init.checkIn);
  const [checkOut, setCheckOut] = useState(init.checkOut);
  const [guests, setGuests] = useState(init.guests);
  const [qty, setQty] = useState<RoomQty>(() => allocateRooms(init.guests, init.room));
  const [picked] = useState<RoomQty>(qty);
  const [plan, setPlan] = useState<MealPlanCode>("EP");
  const [title, setTitle] = useState(init.title);
  const [name, setName] = useState(init.name);
  const [phone, setPhone] = useState(init.phone);
  const [email, setEmail] = useState(init.email);
  const [notes, setNotes] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [bookingId, setBookingId] = useState("");
  const [utr, setUtr] = useState("");
  const [platform] = useState(detectPlatform);
  const [paying, setPaying] = useState(false);
  const [returned, setReturned] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // When the guest comes back from their UPI app, ask them to confirm.
  useEffect(() => {
    if (!paying) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setReturned(true);
        document.getElementById("pay-confirm")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [paying]);
  const startPay = () => setPaying(true);

  // they tapped Book and reached this page
  useEffect(() => {
    if (!init.phone) return;
    const r = allocateRooms(init.guests, init.room);
    captureLead({ phone: init.phone, name: fullName(init.title, init.name), checkIn: init.checkIn, checkOut: init.checkOut, guests: init.guests, rooms: describeRooms(r), stage: "rooms" });
  }, [init]);

  const nights = nightsBetween(checkIn, checkOut);
  const q = useMemo(() => quote(qty, guests, nights, plan), [qty, guests, nights, plan]);
  const cap = totalCapacity(qty);
  const roomsOk = totalRooms(qty) > 0 && cap >= guests;
  const mealName = mealPlans.find((m) => m.code === plan)!.name;

  const go = (s: Step) => {
    setStep(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const changeGuests = (g: number) => {
    setGuests(g);
    setQty(allocateRooms(g));
  };
  const changeCheckIn = (v: string) => {
    setCheckIn(v);
    if (checkOut <= v) setCheckOut(addDays(v, 1));
  };

  // lead row in Supabase: the same row moves forward as the guest does
  const lead = (stage: LeadStage, extra: Partial<Lead> = {}) =>
    captureLead({
      phone,
      name: fullName(title, name),
      email,
      checkIn,
      checkOut,
      guests,
      rooms: describeRooms(qty),
      mealPlan: plan,
      total: q.total,
      stage,
      ...extra,
    });

  const toReview = () => {
    if (!roomsOk) return;
    lead("review");
    go("review");
  };
  const toPay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    saveDraft({ checkIn, checkOut, guests, room: "", title, name, phone, email });
    const id = bookingId || newBookingId();
    setBookingId(id);
    lead("payment", { bookingId: id });
    go("pay");
  };
  const confirm = (e: React.FormEvent) => {
    e.preventDefault();
    lead("booked", { bookingId, upiRef: utr });
    go("done");
  };

  const summary = [
    `Booking ID: ${bookingId}`,
    `Name: ${fullName(title, name)}`,
    `Phone: ${phone}`,
    `Email: ${email}`,
    `Check-in: ${formatFull(checkIn)}`,
    `Check-out: ${formatFull(checkOut)} (${nights} night${nights > 1 ? "s" : ""})`,
    `Guests: ${guests}`,
    `Rooms: ${describeRooms(qty)}`,
    `Meal plan: ${mealName} (${plan})`,
    `Total paid: ${inr(q.total)} via UPI`,
    `UPI reference (UTR): ${utr || "not entered"}`,
    notes && `Requests: ${notes}`,
  ].filter(Boolean) as string[];

  const cta =
    step === "rooms" ? (
      <button type="button" className="btn-gold w-full" disabled={!roomsOk} onClick={toReview}>
        {totalRooms(qty) > 1 ? "Book these rooms" : "Book this room"}
      </button>
    ) : step === "review" ? (
      <button type="submit" form="guest-form" className="btn-gold w-full" disabled={!agreed}>
        Continue to payment
      </button>
    ) : null;

  return (
    <div className="bk">
      <header className="bk-head">
        <Link href="/" className="bk-brand" aria-label="Back to Hotel Teesta">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden><path d="M15 5l-7 7 7 7" /></svg>
          <span className="font-display text-xl">{hotel.name}</span>
        </Link>
        {step !== "done" && (
          <ol className="bk-steps">
            {STEPS.map((s, i) => {
              const idx = STEPS.findIndex((x) => x.id === step);
              return (
                <li key={s.id} data-state={i < idx ? "done" : i === idx ? "now" : "next"}>
                  <span>{i + 1}</span> {s.label}
                </li>
              );
            })}
          </ol>
        )}
        <a href={`tel:${hotel.phones[0].replace(/\s/g, "")}`} className="bk-help">Need help?</a>
      </header>

      <main className="bk-main">
        <section className="bk-body">
          {/* ------------------------------------------------ step 1: rooms & meals */}
          {step === "rooms" && (
            <>
              <h1 className="bk-h1">Choose your rooms</h1>
              <div className="bk-stay">
                <label className="field">
                  <span>Check-in</span>
                  <input type="date" min={init.today} value={checkIn} onChange={(e) => changeCheckIn(e.target.value)} />
                </label>
                <label className="field">
                  <span>Check-out · {nights} night{nights > 1 ? "s" : ""}</span>
                  <input type="date" min={addDays(checkIn, 1)} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
                </label>
                <label className="field">
                  <span>Guests</span>
                  <select value={guests} onChange={(e) => changeGuests(Number(e.target.value))}>
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n} guest{n > 1 ? "s" : ""}</option>
                    ))}
                  </select>
                </label>
              </div>

              <p className={`bk-fit ${roomsOk ? "" : "bk-fit-warn"}`} aria-live="polite">
                {roomsOk
                  ? `${describeRooms(qty)} · sleeps ${cap}, picked for ${guests} guest${guests > 1 ? "s" : ""}`
                  : `Add rooms: ${guests} guests need ${guests - cap} more bed${guests - cap > 1 ? "s" : ""}.`}
              </p>

              <div className="bk-rooms">
                {rooms.map((r) => (
                  <article key={r.slug} className="bk-room" data-on={qty[r.slug] > 0}>
                    <div className="bk-room-photo">
                      <Image src={r.image} alt={r.name} fill sizes="(min-width: 768px) 220px, 100vw" className="object-cover" />
                      {picked[r.slug] > 0 && <span className="bk-pick">Best fit</span>}
                    </div>
                    <div className="bk-room-info">
                      <h2 className="font-display text-3xl leading-none">{r.name}</h2>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-ivory/60">{r.occupancy}</p>
                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {[...r.features, ...roomHighlights.slice(0, 3)].map((f) => (
                          <li key={f} className="exp-chip">{f}</li>
                        ))}
                      </ul>
                      <Amenities slug={r.slug} compact />
                    </div>
                    <div className="bk-room-buy">
                      <DealPrice slug={r.slug} />
                      <Stepper
                        label={r.name}
                        value={qty[r.slug]}
                        max={inventory[r.slug]}
                        onChange={(n) => setQty((x) => ({ ...x, [r.slug]: n }))}
                      />
                    </div>
                  </article>
                ))}
              </div>

              <h2 className="bk-h2">Meals</h2>
              <div className="bk-meals" role="radiogroup" aria-label="Meal plan">
                {mealPlans.map((m) => (
                  <label key={m.code} className="bk-meal" data-on={plan === m.code}>
                    <input type="radio" name="meal" value={m.code} checked={plan === m.code} onChange={() => setPlan(m.code)} />
                    <span className="bk-meal-code">{m.code}</span>
                    <span className="bk-meal-name">{m.name}</span>
                    <span className="bk-meal-detail">{m.detail}</span>
                    <span className="bk-meal-price">{m.perGuestNight ? `+ ${inr(m.perGuestNight)} / guest / night` : "Included"}</span>
                  </label>
                ))}
              </div>

              <div className="bk-cta-inline">{cta}</div>
            </>
          )}

          {/* ------------------------------------------------ step 2: review */}
          {step === "review" && (
            <>
              <button type="button" className="bk-back" onClick={() => go("rooms")}>← Change rooms</button>
              <h1 className="bk-h1">Review your stay</h1>
              <Ticket checkIn={checkIn} checkOut={checkOut} nights={nights} qty={qty} guests={guests} mealPlanName={`${mealName} (${plan})`} />

              {rooms
                .filter((r) => qty[r.slug] > 0)
                .map((r) => (
                  <div key={r.slug} className="bk-panel">
                    <p className="bk-h3">
                      {qty[r.slug]} × {r.name} <span className="text-ivory/50">· {r.occupancy}</span>
                    </p>
                    <Amenities slug={r.slug} />
                  </div>
                ))}

              <div className="bk-panel bk-perk">
                <p className="bk-h3">{frontDeskPerk.title}</p>
                <p className="text-sm text-ivory/75">{frontDeskPerk.body}</p>
                <p className="mt-2 text-xs text-ivory/55">{hotel.pickup}</p>
              </div>

              <div className="bk-panel">
                <CancellationPolicy checkIn={checkIn} />
              </div>

              <form id="guest-form" className="bk-panel bk-guest" onSubmit={toPay} autoComplete="on">
                <p className="bk-h3">Guest details</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="field">
                    <label htmlFor="guest-name">Full name</label>
                    <div className="field-row">
                      <select aria-label="Title (optional)" autoComplete="honorific-prefix" value={title} onChange={(e) => setTitle(e.target.value)}>
                        {titles.map((t) => (
                          <option key={t} value={t}>{t || "Title"}</option>
                        ))}
                      </select>
                      <input id="guest-name" name="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                  </div>
                  <label className="field">
                    <span>Phone</span>
                    <input name="tel" type="tel" autoComplete="tel" inputMode="tel" required pattern="[0-9+\s\-]{8,16}" value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => lead("review")} />
                  </label>
                  <label className="field sm:col-span-2">
                    <span>Email · for your confirmation</span>
                    <input name="email" type="email" autoComplete="email" inputMode="email" required placeholder="you@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => lead("review")} />
                  </label>
                  <label className="field sm:col-span-2">
                    <span>Special requests (optional)</span>
                    <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Early check-in, airport pickup, extra blanket…" />
                  </label>
                </div>
                <label className="bk-agree">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} required />
                  <span>
                    I agree to the <Link href="/policies/booking-terms" target="_blank">Booking terms</Link>,{" "}
                    <Link href="/policies/cancellation" target="_blank">Cancellation &amp; refunds</Link> and{" "}
                    <Link href="/policies/privacy" target="_blank">Privacy policy</Link>.
                  </span>
                </label>
                <div className="bk-cta-inline">{cta}</div>
              </form>
            </>
          )}

          {/* ------------------------------------------------ step 3: payment */}
          {step === "pay" && (
            <>
              <button type="button" className="bk-back" onClick={() => go("review")}>← Back to review</button>
              <h1 className="bk-h1">Pay {inr(q.total)}</h1>
              <p className="text-sm text-ivory/65">Booking ID <b className="text-ivory">{bookingId}</b> · Google Pay, PhonePe, Paytm or any UPI app</p>

              <div className="bk-panel bk-pay">
                {platform === "desktop" ? (
                  <div className="bk-pay-desk">
                    <p className="bk-h3">Scan to pay {inr(q.total)}</p>
                    <p className="text-sm text-ivory/70">
                      Open Google Pay, PhonePe, Paytm or any UPI app on your phone and scan. The amount fills in by itself.
                    </p>
                    <UpiQr link={upiLink(q.total, bookingId)} />
                  </div>
                ) : (
                  <div className="bk-pay-phone">
                    <a
                      href={platform === "android" ? upiLink(q.total, bookingId) : upiAppLinks(q.total, bookingId, platform)[0].href}
                      onClick={startPay}
                      className="btn-gold bk-paynow"
                    >
                      Pay {inr(q.total)} now
                    </a>
                    <p className="bk-pay-hint">
                      {platform === "android" ? "Opens your UPI apps. Or pick one:" : "Opens Google Pay. Or pick another app:"}
                    </p>
                    <div className="bk-apps">
                      {upiAppLinks(q.total, bookingId, platform).map((app) => (
                        <a key={app.id} href={app.href} onClick={startPay} className="bk-app" data-app={app.id}>
                          <span className="bk-app-dot" aria-hidden>{app.name[0]}</span>
                          {app.name}
                        </a>
                      ))}
                      <a href={upiLink(q.total, bookingId)} onClick={startPay} className="bk-app">
                        <span className="bk-app-dot" aria-hidden>₹</span>
                        Other UPI app
                      </a>
                    </div>
                    <button type="button" className="bk-qr-toggle" onClick={() => setShowQr((v) => !v)} aria-expanded={showQr}>
                      {showQr ? "Hide QR code" : "Show QR code instead"}
                    </button>
                    {showQr && <UpiQr link={upiLink(q.total, bookingId)} />}
                  </div>
                )}
                <p className="bk-pay-methods">Pay from your bank account or a RuPay credit card linked to UPI.</p>
                <div className="bk-payee">
                  <p className="ticket-label !text-gold">Paying to</p>
                  <p className="text-ivory">
                    {upi.payeeName} <span className="text-xs text-ivory/50">· {upi.bank} merchant</span>
                  </p>
                  <CopyText text={upi.vpa} />
                </div>
              </div>

              <form id="pay-confirm" className="bk-panel" data-returned={returned} onSubmit={confirm}>
                <p className="bk-h3">{returned ? "Payment done?" : "After paying"}</p>
                <p className="text-sm text-ivory/70">
                  {returned
                    ? "If your app shows the payment as successful, confirm your booking below."
                    : "Come back here when your app shows the payment as successful."}
                </p>
                <label className="field mt-4">
                  <span>UPI reference (optional, speeds up confirmation)</span>
                  <input
                    inputMode="numeric"
                    pattern="[A-Za-z0-9]{10,22}"
                    title="The 12-digit UPI reference / UTR from your payment app"
                    placeholder="12-digit number from your UPI app"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value.replace(/\s/g, ""))}
                  />
                </label>
                <button type="submit" className="btn-gold mt-4 w-full">I&apos;ve paid · confirm booking</button>
              </form>
            </>
          )}

          {/* ------------------------------------------------ done */}
          {step === "done" && (
            <>
              <p className="eyebrow">Booking received</p>
              <h1 className="bk-h1">{greetingName(title, name) ? `${greetingName(title, name)}, we can't wait to see you!` : "We can't wait to see you!"}</h1>
              <p className="text-ivory/70">We&apos;re checking your payment and will confirm on WhatsApp and email.</p>
              <div className="bk-panel bk-direct">
                <p className="bk-h3">{directThanks.title}</p>
                <p className="text-sm text-ivory/80">{directThanks.body.replace("{saved}", inr(q.savings))}</p>
                <p className="bk-tip">
                  <span>Pro tip</span>
                  {directThanks.tip}
                </p>
              </div>
              <Ticket checkIn={checkIn} checkOut={checkOut} nights={nights} qty={qty} guests={guests} mealPlanName={`${mealName} (${plan})`} bookingId={bookingId} guestName={fullName(title, name)} />
              <div className="bk-panel">
                <p className="bk-h3">Last step: send your booking to the hotel</p>
                <p className="text-sm text-ivory/70">This sends your booking ID and UPI reference so the front desk can confirm your rooms.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    className="btn-gold"
                    target="_blank"
                    rel="noopener"
                    href={`https://wa.me/${hotel.whatsapp}?text=${encodeURIComponent(["New booking: Hotel Teesta", ...summary].join("\n"))}`}
                  >
                    Send on WhatsApp
                  </a>
                  <a
                    className="btn-ghost"
                    href={`mailto:${hotel.email}?cc=${encodeURIComponent(email)}&subject=${encodeURIComponent(`Booking ${bookingId}: ${formatFull(checkIn)}`)}&body=${encodeURIComponent(summary.join("\n"))}`}
                  >
                    Send by email
                  </a>
                  <button type="button" className="btn-ghost" onClick={() => window.print()}>Print</button>
                </div>
              </div>
              <Link href="/" className="link-gold mt-2 inline-block">Back to Hotel Teesta</Link>
            </>
          )}
        </section>

        <aside className="bk-aside">
          <PriceCard q={q} guests={guests} />
        </aside>
      </main>

      {/* mobile: total + action always in reach */}
      {cta && (
        <div className="bk-bar">
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.2em] text-ivory/55">Total</p>
            <p className="font-display text-2xl leading-none">{inr(q.total)}</p>
            {q.savings > 0 && <p className="text-[0.7rem] text-emerald-300">You save {inr(q.savings)}</p>}
          </div>
          <div className="flex-1">{cta}</div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- UPI QR + copy */
function UpiQr({ link }: { link: string }) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    let live = true;
    // loaded only when a computer user asks for the QR, so phones never download it
    import("qrcode")
      .then((m) => m.default.toString(link, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#12100d", light: "#f3ede2" } }))
      .then((s) => live && setSvg(s))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [link]);
  return (
    <div className="bk-qr" aria-label="UPI QR code">
      {svg ? <div dangerouslySetInnerHTML={{ __html: svg }} /> : <div className="bk-qr-wait" />}
      <p>Scan with any UPI app</p>
    </div>
  );
}

function CopyText({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="bk-copy"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
    >
      {text} <span>{done ? "Copied" : "Copy"}</span>
    </button>
  );
}
