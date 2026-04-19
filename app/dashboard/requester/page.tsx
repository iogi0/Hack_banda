"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { RequesterBottomSheet } from "@/components/Requester/RequesterBottomSheet";
import { BurgerMenu } from "@/components/Common/BurgerMenu";
import { DarkModeToggle } from "@/components/Common/DarkModeToggle";
import { getUserLocation } from "@/lib/geolocation";
import { KOSICE_DEFAULT } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useLocalePath } from "@/lib/i18n/useLocalePath";
import type { HelpRequestDTO, HelperPresenceDTO, PublicUser, SafeNodeDTO } from "@/lib/types";

const RequesterMap = dynamic(() => import("@/components/Map/RequesterMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[var(--openarm-surface)]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-accessible-yellow border-t-transparent" />
        <span className="text-sm font-semibold text-[var(--openarm-muted)]">Завантажую мапу…</span>
      </div>
    </div>
  ),
});

type RequestListItem = HelpRequestDTO & { counterparty_name?: string | null };

async function readJson<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();
  if (!text || !contentType.includes("application/json")) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export default function RequesterDashboardPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { href } = useLocalePath();
  const [me, setMe] = useState<PublicUser | null>(null);
  const [coords, setCoords] = useState({ lat: KOSICE_DEFAULT.lat, lng: KOSICE_DEFAULT.lng });
  const [locationLabel, setLocationLabel] = useState(t("common.locationPending"));
  const [requests, setRequests] = useState<RequestListItem[]>([]);
  const [helpers, setHelpers] = useState<HelperPresenceDTO[]>([]);
  const [safeNodes, setSafeNodes] = useState<SafeNodeDTO[]>([]);
  const [sheetExpanded, setSheetExpanded] = useState(false);

  const loadDashboard = useCallback(
    async (lat: number, lng: number) => {
      const [meRes, requestsRes, helpersRes, safeNodesRes] = await Promise.all([
        fetch("/api/auth/me", { cache: "no-store" }),
        fetch("/api/requests/mine?status=pending,in_progress,completed", { cache: "no-store" }),
        fetch(`/api/helpers/nearby?lat=${lat}&lng=${lng}`, { cache: "no-store" }),
        fetch(`/api/safe-nodes?lat=${lat}&lng=${lng}`, { cache: "no-store" }),
      ]);

      const meData = await readJson<{ user?: PublicUser | null }>(meRes);
      if (meRes.status === 401 || meRes.status === 403) {
        router.replace(href("/auth/login"));
        return;
      }
      if (!meRes.ok || !meData?.user) return;

      const requestsData = await readJson<{ requests?: RequestListItem[] }>(requestsRes);
      const helpersData = await readJson<{ helpers?: HelperPresenceDTO[] }>(helpersRes);
      const safeNodesData = await readJson<{ nodes?: SafeNodeDTO[] }>(safeNodesRes);

      setMe(meData.user as PublicUser);
      setRequests((requestsData?.requests ?? []) as RequestListItem[]);
      setHelpers((helpersData?.helpers ?? []) as HelperPresenceDTO[]);
      setSafeNodes((safeNodesData?.nodes ?? []) as SafeNodeDTO[]);
    },
    [href, router]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loc = await getUserLocation();
        if (cancelled) return;
        setCoords({ lat: loc.lat, lng: loc.lng });
        setLocationLabel(`${loc.lat.toFixed(3)}, ${loc.lng.toFixed(3)}`);
        await loadDashboard(loc.lat, loc.lng);
      } catch {
        if (!cancelled) await loadDashboard(KOSICE_DEFAULT.lat, KOSICE_DEFAULT.lng);
      }
    })();
    return () => { cancelled = true; };
  }, [loadDashboard, t]);

  useEffect(() => {
    const id = setInterval(() => void loadDashboard(coords.lat, coords.lng), 5000);
    return () => clearInterval(id);
  }, [coords, loadDashboard]);

  const activeRequest =
    requests.find((r) => r.status === "in_progress" || r.status === "pending") ?? null;
  const requesterNotes =
    typeof me?.accessibility_notes === "string" ? me.accessibility_notes.toLowerCase() : "";
  const isBlindRequester =
    Boolean(me?.is_blind) || /(blind|сліп|незр|nevid)/.test(requesterNotes);

  useEffect(() => {
    if (activeRequest?.status === "in_progress" && isBlindRequester && me?.is_blind) {
      router.push(href(`/chat/${activeRequest._id}`));
    }
  }, [activeRequest?._id, activeRequest?.status, isBlindRequester, me?.is_blind, router, href]);

  const completeRequest = async (requestId: string) => {
    await fetch("/api/requests/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: requestId }),
    });
    await loadDashboard(coords.lat, coords.lng);
  };

  const cancelRequest = async (requestId: string) => {
    await fetch("/api/requests/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: requestId }),
    });
    await loadDashboard(coords.lat, coords.lng);
  };

  const sheetH = sheetExpanded ? "h-[80dvh]" : "h-[30dvh] min-h-[230px]";
  const topBarHeight = 92;
  const bottomOffset = sheetExpanded ? "80dvh" : "30dvh";

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[var(--openarm-bg)]">
      {/* ── TOP BAR ── */}
      <div className="absolute left-0 right-0 top-0 z-[50] px-4 pb-3 pt-safe-top">
        <div className="flex items-center gap-2.5 rounded-[26px] bg-[var(--openarm-surface)] px-3 py-2.5 shadow-[0_16px_36px_var(--openarm-shadow-strong)] backdrop-blur-xl border border-[var(--openarm-border)]">
          {/* Left: Burger */}
          <div className="flex flex-1 items-center gap-2">
            <BurgerMenu />
          </div>

          {/* Center: Location */}
          <div className="flex-1 text-center">
            <span className="inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full bg-black/8 dark:bg-white/8 px-3 py-1.5 text-xs font-bold text-[var(--openarm-text)] shadow-sm">
              📍 {locationLabel}
            </span>
          </div>

          {/* Right: Karma + Dark mode */}
          <div className="flex flex-1 items-center justify-end gap-2">
            {me && (
              <span className="rounded-full bg-accessible-yellow px-3 py-1.5 text-xs font-black text-black shadow-sm">
                ⭐ {me.karma_points}
              </span>
            )}
            <DarkModeToggle />
          </div>
        </div>
      </div>

      {/* ── MAP LAYER ── */}
      <div
        className="absolute inset-x-0 transition-all duration-300"
        style={{ top: `${topBarHeight}px`, bottom: bottomOffset }}
      >
        <RequesterMap
          center={coords}
          requests={activeRequest ? [activeRequest] : []}
          helpers={helpers}
          safeNodes={safeNodes}
          className="h-full w-full"
        />
      </div>

      {/* ── BOTTOM SHEET ── */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-[40] card-surface rounded-t-[32px] shadow-2xl transition-all duration-300 ${sheetH}`}
      >
        {/* Drag handle */}
        <button
          type="button"
          className="mx-auto mt-3 mb-1 flex h-6 w-full items-center justify-center"
          aria-label={sheetExpanded ? t("common.close") : t("common.menu")}
          onClick={() => setSheetExpanded((p) => !p)}
        >
          <div className="h-1.5 w-10 rounded-full bg-[var(--openarm-muted)]/30" />
        </button>

        <RequesterBottomSheet
          coords={coords}
          activeRequest={activeRequest}
          safeNodes={safeNodes}
          isBlindRequester={isBlindRequester}
          onComplete={completeRequest}
          onCancel={cancelRequest}
          onCreated={(r) => {
            setRequests((p) => [r, ...p]);
            void loadDashboard(coords.lat, coords.lng);
          }}
        />
      </div>
    </div>
  );
}
