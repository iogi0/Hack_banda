"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AccessibleButton } from "@/components/Common/AccessibleButton";
import { MobileLayout } from "@/components/Layout/MobileLayout";
import { TopSafeArea } from "@/components/Layout/TopSafeArea";
import { DICTIONARIES } from "@/lib/i18n/dictionaries";
import type { Locale, PublicUser } from "@/lib/types";

function tFor(locale: Locale, key: string) {
  return DICTIONARIES[locale][key] ?? DICTIONARIES.en[key] ?? key;
}

export function LocaleHomeClient({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const text = await res.text();
        const data = text ? (JSON.parse(text) as { user?: PublicUser | null }) : {};
        if (!cancelled) {
          setUser(data.user ?? null);
        }
      } catch {
        if (!cancelled) setUser(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user || typeof window === "undefined") return;

    const shouldRedirect = window.sessionStorage.getItem("openarm_post_auth_redirect");
    if (shouldRedirect !== "1") return;

    window.sessionStorage.removeItem("openarm_post_auth_redirect");
    router.replace("/dashboard");
  }, [router, user]);

  const t = (key: string) => tFor(locale, key);

  return (
    <MobileLayout appShell className="app-screen gap-3 overflow-y-auto">
      <TopSafeArea />
      <section className="animate-rise overflow-hidden rounded-[28px] border border-black/8 bg-[linear-gradient(160deg,#111111_0%,#050505_58%,#1b1b1b_100%)] px-4 py-4 text-white shadow-[0_18px_40px_rgba(17,17,17,0.14)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px] font-semibold uppercase tracking-[0.28em] text-white/65">
            {t("app.name")}
          </p>
          <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-white/70">
            {t("landing.appBadge")}
          </span>
        </div>
        <h1 className="mt-4 max-w-[8ch] text-[1.72rem] font-black leading-[0.92] tracking-[-0.05em] sm:text-6xl">
          {t("landing.heroTitle")}
        </h1>
        <p className="mt-3 max-w-[18rem] text-[12px] leading-5 text-white/68 sm:text-base">
          {t("landing.heroBody")}
        </p>

        {user ? (
          <div className="mt-4 rounded-[22px] border border-white/10 bg-white/10 p-3.5 backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/55">
                  {user.role}
                </p>
                <p className="mt-1.5 text-lg font-black">{user.name}</p>
                <p className="mt-1 truncate text-xs text-white/70">{user.email}</p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white/80">
                {t("landing.signedIn")}
              </span>
            </div>
            <Link href="/dashboard" className="mt-3 block">
              <AccessibleButton className="min-h-[58px] w-full rounded-[18px] bg-accessible-yellow text-black hover:brightness-95">
                {t("landing.openMap")}
              </AccessibleButton>
            </Link>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/70">
            <span className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1.5">{t("landing.quickMap")}</span>
            <span className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1.5">{t("landing.quickChat")}</span>
            <span className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1.5">{t("landing.quickVoice")}</span>
          </div>
        )}
      </section>

      <section className="grid min-h-0 gap-3">
        <Link href={`/${locale}/auth/register?role=REQUESTER`} className="block">
          <div className="card-surface rounded-[22px] p-3.5 transition hover:-translate-y-0.5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-black/55">{t("landing.requesterLabel")}</p>
              <span className="rounded-full border border-accessible-red/10 bg-accessible-red/8 px-2.5 py-1 text-[11px] font-bold text-accessible-red">
                {t("landing.badgeNeedHelp")}
              </span>
            </div>
            <div className="mt-3 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-accessible-red/10 text-[1.2rem]">
                🆘
              </div>
              <div>
                <h2 className="text-[1.14rem] font-black leading-none tracking-tight">{t("auth.needHelpRole")}</h2>
                <p className="mt-1.5 text-[13px] leading-5 text-black/68">{t("landing.requesterCard")}</p>
              </div>
            </div>
          </div>
        </Link>
        <Link href={`/${locale}/auth/register?role=HELPER`} className="block">
          <div className="card-surface rounded-[22px] p-3.5 transition hover:-translate-y-0.5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-black/55">{t("landing.helperLabel")}</p>
              <span className="rounded-full border border-[#0d7a3d]/10 bg-accessible-lime/12 px-2.5 py-1 text-[11px] font-bold text-[#0d7a3d]">
                {t("landing.badgeVolunteer")}
              </span>
            </div>
            <div className="mt-3 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-accessible-lime/16 text-[1.2rem]">
                🤝
              </div>
              <div>
                <h2 className="text-[1.14rem] font-black leading-none tracking-tight">{t("auth.wantHelpRole")}</h2>
                <p className="mt-1.5 text-[13px] leading-5 text-black/68">{t("landing.helperCard")}</p>
              </div>
            </div>
          </div>
        </Link>
      </section>

      <section className="sticky bottom-0 z-20 mt-auto grid gap-3 bg-[linear-gradient(180deg,rgba(244,239,232,0)_0%,rgba(244,239,232,0.92)_22%,rgba(238,246,241,0.98)_100%)] pb-safe pt-4 backdrop-blur-sm">
        <Link href={`/${locale}/auth/login`}>
          <AccessibleButton className="min-h-[58px] w-full rounded-[18px] shadow-[0_14px_28px_rgba(17,17,17,0.12)]">
            {t("common.login")}
          </AccessibleButton>
        </Link>
        <Link href={`/${locale}/auth/register?role=REQUESTER`}>
          <AccessibleButton tone="secondary" className="min-h-[58px] w-full rounded-[18px] bg-white/96">
            {t("common.createAccount")}
          </AccessibleButton>
        </Link>
      </section>
    </MobileLayout>
  );
}
