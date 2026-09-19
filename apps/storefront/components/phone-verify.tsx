"use client";

import { useEffect, useState } from "react";
import type { OtpPurpose } from "@tradekwik/shared";
import { ClientApiError, sendOtp, verifyOtp } from "@/lib/client-api";

interface PhoneVerifyProps {
  phone: string;
  purpose: OtpPurpose;
  /** Called with the OTP token once verified (null when the number changes). */
  onVerified: (token: string | null) => void;
}

const PHONE_OK = /^(\+91)?[6-9]\d{9}$/;
const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500";

/** Send-OTP → enter code → verified. Resets when the phone changes. */
export function PhoneVerify({ phone, purpose, onVerified }: PhoneVerifyProps) {
  const [stage, setStage] = useState<"idle" | "sent" | "verified">("idle");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStage("idle");
    setCode("");
    setDevCode(null);
    setError(null);
    onVerified(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const validPhone = PHONE_OK.test(phone.trim());

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const res = await sendOtp({ phone: phone.trim(), purpose });
      setStage("sent");
      setCooldown(res.resendAfter);
      setDevCode(res.devCode ?? null);
      setInfo(
        `Code sent. You have ${res.attemptsAllowed} tries. ${
          res.sendsLeftToday > 0
            ? `${res.sendsLeftToday} more code${res.sendsLeftToday === 1 ? "" : "s"} can be sent to this number today.`
            : "This was the last code for this number today."
        }`,
      );
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Could not send the code.");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      const res = await verifyOtp({ phone: phone.trim(), purpose, code: code.trim() });
      setStage("verified");
      onVerified(res.otpToken);
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Could not verify the code.");
    } finally {
      setBusy(false);
    }
  }

  if (stage === "verified") {
    return <p className="text-sm font-medium text-green-700">✓ Mobile number verified</p>;
  }

  return (
    <div className="grid gap-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      {stage === "idle" ? (
        <button
          type="button"
          disabled={!validPhone || busy}
          onClick={send}
          className="justify-self-start rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send OTP to this number"}
        </button>
      ) : (
        <div className="grid gap-2 sm:grid-cols-[160px_auto_auto] sm:items-end">
          <div>
            <label htmlFor="otp-code" className="mb-1 block text-sm font-medium text-stone-700">Enter the 6-digit code</label>
            <input
              id="otp-code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              autoComplete="one-time-code"
              className={inputClass}
            />
          </div>
          <button
            type="button"
            disabled={code.length !== 6 || busy}
            onClick={verify}
            className="rounded-full bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-50"
          >
            {busy ? "Checking…" : "Verify"}
          </button>
          <button
            type="button"
            disabled={cooldown > 0 || busy}
            onClick={send}
            className="text-sm text-stone-500 hover:text-blue-700 disabled:opacity-50"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
          </button>
          {info && <p className="text-xs text-stone-500 sm:col-span-3">{info}</p>}
          {devCode && (
            <p className="text-xs text-amber-700 sm:col-span-3">
              Dev mode: your code is <span className="font-mono font-semibold">{devCode}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
