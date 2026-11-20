"use client";

import { useEffect, useRef, useState } from "react";
import { isRememberedVerified, rememberVerified, sendEmailCode, verifyEmailCode } from "@/lib/emailOtp";

export type EmailState = "unverified" | "verified" | "skipped";

type Props = {
  email: string;
  onEmail: (v: string) => void;
  onState: (s: EmailState) => void;
  onBlur?: () => void;
};

type Phase = "idle" | "sending" | "sent" | "checking" | "verified";

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
const RESEND_AFTER = 60;

/**
 * Email field with a one-time code: Send code → type the 6-digit code → Verified.
 * If the email service is down or not set up, the guest is let through (skipped) rather than blocked,
 * so a mail problem never costs a booking.
 */
export function EmailVerify({ email, onEmail, onState, onBlur }: Props) {
  const [phase, setPhase] = useState<Phase>(() => (isRememberedVerified(email) ? "verified" : "idle"));
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ text: string; tone: "ok" | "err" | "info" } | null>(null);
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onState(phase === "verified" ? "verified" : "unverified");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // resend countdown
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const change = (v: string) => {
    onEmail(v);
    if (phase !== "idle") {
      setPhase("idle");
      setCode("");
      setMsg(null);
    }
    onState(isRememberedVerified(v) ? "verified" : "unverified");
    if (isRememberedVerified(v)) setPhase("verified");
  };

  const send = async () => {
    if (!isEmail(email)) {
      setMsg({ text: "Please check your email address.", tone: "err" });
      return;
    }
    setPhase("sending");
    setMsg(null);
    const r = await sendEmailCode(email);
    if (r === "sent") {
      setPhase("sent");
      setWait(RESEND_AFTER);
      setMsg({ text: `We've emailed a code to ${email.trim()}. Check Spam or Promotions if you can't see it.`, tone: "info" });
      setTimeout(() => codeRef.current?.focus(), 50);
    } else if (r === "wait") {
      setPhase(code || wait ? "sent" : "idle");
      setWait(RESEND_AFTER);
      setMsg({ text: "A code was sent a moment ago. Please wait a minute before asking for another.", tone: "err" });
    } else if (r === "bad_email") {
      setPhase("idle");
      setMsg({ text: "That email address doesn't look right.", tone: "err" });
    } else {
      // email service not reachable or not set up: don't block the booking
      setPhase("idle");
      onState("skipped");
      setMsg({ text: "We couldn't send a code right now. You can carry on; we'll confirm your booking by WhatsApp too.", tone: "info" });
    }
  };

  const verify = async (c = code) => {
    if (c.length < 6) return;
    setPhase("checking");
    const ok = await verifyEmailCode(email, c);
    if (ok) {
      setPhase("verified");
      rememberVerified(email);
      onState("verified");
      setMsg(null);
    } else {
      setPhase("sent");
      setMsg({ text: "That code doesn't match or has expired. Check it, or send a new one.", tone: "err" });
      codeRef.current?.select();
    }
  };

  const verified = phase === "verified";

  return (
    <div className="field sm:col-span-2 ev">
      <label htmlFor="guest-email">Email · for your confirmation</label>
      <div className="ev-row">
        <input
          id="guest-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="you@gmail.com"
          value={email}
          readOnly={verified}
          onChange={(e) => change(e.target.value)}
          onBlur={onBlur}
          aria-describedby="ev-msg"
        />
        {verified ? (
          <span className="ev-ok" role="status">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            Verified
          </span>
        ) : (
          <button
            type="button"
            className="ev-send"
            onClick={send}
            disabled={phase === "sending" || phase === "checking" || wait > 0 || !email}
          >
            {phase === "sending" ? "Sending…" : phase === "idle" ? "Send code" : wait > 0 ? `Resend ${wait}s` : "Resend"}
          </button>
        )}
      </div>

      {verified && (
        <button
          type="button"
          className="ev-change"
          onClick={() => {
            setPhase("idle");
            onState("unverified");
          }}
        >
          Change email
        </button>
      )}

      {(phase === "sent" || phase === "checking") && (
        <div className="ev-code">
          <input
            ref={codeRef}
            aria-label="Code from the email"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            placeholder="Enter the code"
            value={code}
            onChange={(e) => {
              const c = e.target.value.replace(/\D/g, "").slice(0, 8);
              setCode(c);
              if (c.length === 6) verify(c);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault(); // don't submit the booking form
                verify();
              }
            }}
          />
          <button type="button" className="ev-send" onClick={() => verify()} disabled={code.length < 6 || phase === "checking"}>
            {phase === "checking" ? "Checking…" : "Verify"}
          </button>
        </div>
      )}

      {msg && (
        <p id="ev-msg" className={`ev-msg ev-${msg.tone}`} role={msg.tone === "err" ? "alert" : "status"}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
