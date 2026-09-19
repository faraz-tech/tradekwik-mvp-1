"use client";

import { useEffect, useState } from "react";
import type { OtpPurpose } from "@tradekwik/shared";
import { ApiFetchError, sendOtp, verifyOtp } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PhoneVerifyProps {
  phone: string;
  purpose: OtpPurpose;
  /** Called with the OTP token once the number is verified (null if the number changes). */
  onVerified: (token: string | null) => void;
}

const PHONE_OK = /^(\+91)?[6-9]\d{9}$/;

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
      setError(e instanceof ApiFetchError ? e.message : "Could not send the code.");
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
      setError(e instanceof ApiFetchError ? e.message : "Could not verify the code.");
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
        <Button type="button" size="sm" variant="outline" disabled={!validPhone || busy} onClick={send} className="justify-self-start">
          {busy ? "Sending…" : "Send OTP to this number"}
        </Button>
      ) : (
        <div className="grid gap-2 sm:grid-cols-[160px_auto_auto] sm:items-end">
          <div className="grid gap-1">
            <Label htmlFor="otp-code">Enter the 6-digit code</Label>
            <Input
              id="otp-code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              autoComplete="one-time-code"
            />
          </div>
          <Button type="button" size="sm" disabled={code.length !== 6 || busy} onClick={verify}>
            {busy ? "Checking…" : "Verify"}
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={cooldown > 0 || busy} onClick={send}>
            {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
          </Button>
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
