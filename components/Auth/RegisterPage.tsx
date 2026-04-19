"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { AccessibleButton } from "@/components/Common/AccessibleButton";
import { AccessibleToggle } from "@/components/Common/AccessibleToggle";
import { MobileLayout } from "@/components/Layout/MobileLayout";
import { TopSafeArea } from "@/components/Layout/TopSafeArea";
import { DEFAULT_LOCALE } from "@/lib/i18n/dictionaries";
import { localizePath } from "@/lib/i18n/locale";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useLocalePath } from "@/lib/i18n/useLocalePath";
import type { Role } from "@/lib/types";

export function RegisterPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const { href } = useLocalePath();
  const [role, setRole] = useState<Role>("REQUESTER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [isBlind, setIsBlind] = useState(false);
  const [accessibilityNotes, setAccessibilityNotes] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextRole = new URLSearchParams(window.location.search).get("role");
    if (nextRole === "REQUESTER" || nextRole === "HELPER") setRole(nextRole);
  }, []);

  const submit = () => {
    startTransition(async () => {
      setError("");
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          name,
          email,
          password,
          phone,
          language_preference: locale,
          is_blind: role === "REQUESTER" ? isBlind : false,
          accessibility_notes: accessibilityNotes,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Unable to create account.");
        return;
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("openarm_post_auth_redirect", "1");
      }
      router.replace("/dashboard");
    });
  };

  return (
    <MobileLayout>
      <TopSafeArea />

      <Link
        href={localizePath(DEFAULT_LOCALE, "/")}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-black/6 dark:bg-white/8 px-4 text-sm font-bold text-[var(--openarm-text)] transition hover:bg-black/10 dark:hover:bg-white/12"
      >
        ← {t("common.back")}
      </Link>

      <section className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-gray-900 via-black to-gray-800 px-6 py-7 text-white shadow-[0_24px_60px_rgba(17,17,17,0.30)]">
        <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-accessible-yellow/20 blur-2xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-24 w-24 rounded-full bg-accessible-lime/10 blur-xl" />

        <div className="relative">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-2xl">🤝</span>
            <span className="text-sm font-bold uppercase tracking-widest text-white/60">OpenArm</span>
          </div>
          <h1 className="text-3xl font-black leading-tight">{t("auth.registerTitle")}</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/70">{t("auth.registerSubtitle")}</p>
        </div>
      </section>

      <section className="card-surface rounded-[34px] p-5">
        <div className="mb-4">
          <p className="form-label">{t("common.role")}</p>
          <h2 className="mt-1 text-xl font-black text-[var(--openarm-text)]">
            {role === "REQUESTER" ? t("auth.needHelpRole") : t("auth.wantHelpRole")}
          </h2>
        </div>

        <AccessibleToggle
          value={role}
          onChange={setRole}
          label="Role selection"
          options={[
            { value: "REQUESTER", label: t("auth.needHelpRole") },
            { value: "HELPER", label: t("auth.wantHelpRole") },
          ]}
        />

        <div
          className={`mt-3 rounded-[18px] border px-4 py-3 text-sm ${
            role === "REQUESTER"
              ? "border-accessible-red/20 bg-red-50 text-red-800 dark:bg-red-900/15 dark:text-red-300"
              : "border-accessible-lime/20 bg-green-50 text-green-800 dark:bg-green-900/15 dark:text-green-300"
          }`}
        >
          {role === "REQUESTER"
            ? "🆘 " + (t("auth.requesterRoleHint") ?? "You'll be able to request help from nearby volunteers")
            : "🤝 " + (t("auth.helperRoleHint") ?? "You'll see and accept nearby help requests")}
        </div>

        <div className="mt-4 grid gap-3">
          <div className="flex flex-col gap-1">
            <label className="form-label">{t("common.name")}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-[var(--openarm-muted)]">👤</span>
              <input
                placeholder={t("common.name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10"
                autoComplete="name"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="form-label">{t("common.email")}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-[var(--openarm-muted)]">✉️</span>
              <input
                type="email"
                placeholder={t("common.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="form-label">{t("common.password")}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-[var(--openarm-muted)]">🔑</span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t("common.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-12"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[10px] text-sm text-[var(--openarm-muted)] transition hover:bg-black/8 dark:hover:bg-white/8"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="form-label">{t("common.phone")}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-[var(--openarm-muted)]">📱</span>
              <input
                type="tel"
                placeholder={t("common.phone")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10"
                autoComplete="tel"
              />
            </div>
          </div>

          {role === "REQUESTER" && (
            <>
              <label className="flex cursor-pointer items-start gap-3 rounded-[22px] border border-[var(--openarm-border)] bg-[var(--openarm-surface)] px-4 py-4 text-sm font-semibold text-[var(--openarm-text)] transition hover:border-accessible-yellow/40">
                <input
                  type="checkbox"
                  checked={isBlind}
                  onChange={(e) => setIsBlind(e.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded border-[var(--openarm-border)] accent-black dark:accent-accessible-yellow"
                />
                <span>
                  {t("auth.blindMode")}
                  <span className="mt-1 block text-xs font-medium text-[var(--openarm-muted)]">
                    {t("auth.blindModeHint")}
                  </span>
                </span>
              </label>

              <div className="flex flex-col gap-1">
                <label className="form-label">{t("auth.accessibility")}</label>
                <textarea
                  rows={3}
                  placeholder={t("auth.accessibility")}
                  value={accessibilityNotes}
                  onChange={(e) => setAccessibilityNotes(e.target.value)}
                  className="resize-none"
                />
              </div>
            </>
          )}

          {error && (
            <div className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800/30 dark:bg-red-900/20">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">⚠️ {error}</p>
            </div>
          )}

          <AccessibleButton onClick={submit} disabled={pending} className="w-full">
            {pending ? "⏳ " + t("auth.createLoading") : t("common.createAccount")}
          </AccessibleButton>
        </div>
      </section>

      <p className="pb-2 text-center text-sm text-[var(--openarm-muted)]">
        {t("auth.haveAccount")}{" "}
        <Link
          href={href("/auth/login")}
          className="font-bold text-[var(--openarm-text)] underline underline-offset-2"
        >
          {t("common.login")}
        </Link>
      </p>
    </MobileLayout>
  );
}
