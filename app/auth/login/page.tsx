"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AccessibleButton } from "@/components/Common/AccessibleButton";
import { MobileLayout } from "@/components/Layout/MobileLayout";
import { TopSafeArea } from "@/components/Layout/TopSafeArea";
import { DEFAULT_LOCALE } from "@/lib/i18n/dictionaries";
import { localizePath } from "@/lib/i18n/locale";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useLocalePath } from "@/lib/i18n/useLocalePath";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { href } = useLocalePath();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      setError("");
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Unable to log in.");
        return;
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("openarm_post_auth_redirect", "1");
      }
      router.replace("/dashboard");
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") submit();
  };

  return (
    <MobileLayout appShell className="justify-between overflow-hidden">
      <TopSafeArea />

      {/* Back button */}
      <Link
        href={localizePath(DEFAULT_LOCALE, "/")}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-black/6 dark:bg-white/8 px-4 text-sm font-bold text-[var(--openarm-text)] transition hover:bg-black/10 dark:hover:bg-white/12"
      >
        ← {t("common.back")}
      </Link>

      {/* Hero section */}
      <section className="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-gray-900 via-black to-gray-800 px-6 py-7 text-white shadow-[0_24px_60px_rgba(17,17,17,0.30)]">
        {/* Decorative gradient */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-accessible-yellow/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-accessible-blue/15 blur-xl" />

        <div className="relative">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-2xl">🤝</span>
            <span className="text-sm font-bold uppercase tracking-widest text-white/60">OpenArm</span>
          </div>
          <h1 className="text-[2rem] font-black leading-tight">{t("auth.loginTitle")}</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/70">{t("auth.loginSubtitle")}</p>
        </div>
      </section>

      {/* Form card */}
      <section className="card-surface rounded-[32px] p-5">
        <div className="grid gap-3">
          {/* Email */}
          <div className="flex flex-col gap-1">
            <label className="form-label">{t("common.email")}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--openarm-muted)] text-base">✉️</span>
              <input
                type="email"
                placeholder={t("common.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10"
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <label className="form-label">{t("common.password")}</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--openarm-muted)] text-base">🔑</span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t("common.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10 pr-12"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-[10px] text-sm text-[var(--openarm-muted)] hover:bg-black/8 dark:hover:bg-white/8 transition"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-[16px] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 px-4 py-3">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">⚠️ {error}</p>
            </div>
          )}

          {/* Submit */}
          <AccessibleButton
            onClick={submit}
            disabled={pending}
            className="w-full"
          >
            {pending ? "⏳ " + t("auth.loginLoading") : t("common.login")}
          </AccessibleButton>
        </div>
      </section>

      {/* Footer */}
      <p className="pb-2 text-center text-sm text-[var(--openarm-muted)]">
        {t("auth.noAccount")}{" "}
        <Link href={href("/auth/register")} className="font-bold text-[var(--openarm-text)] underline underline-offset-2">
          {t("common.signup")}
        </Link>
      </p>
    </MobileLayout>
  );
}
