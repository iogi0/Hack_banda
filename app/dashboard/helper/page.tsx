"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HelperBottomSheet } from "@/components/Helper/HelperBottomSheet";
import { BurgerMenu } from "@/components/Common/BurgerMenu";
import { DarkModeToggle } from "@/components/Common/DarkModeToggle";
import { getUserLocation, distanceMetres } from "@/lib/geolocation";
import { COMPLETION_DISTANCE_METRES, KOSICE_DEFAULT } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useLocalePath } from "@/lib/i18n/useLocalePath";
import type { HelpRequestDTO, HelperPresenceDTO, PublicUser } from "@/lib/types";

const HelperMap = dynamic(() => import("@/components/Map/HelperMap"), {
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

export default function HelperDashboardPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { href } = useLocalePath();
  const [me, setMe] = useState<PublicUser | null>(null);
  const [coords, setCoords] = useState({ lat: KOSICE_DEFAULT.lat, lng: KOSICE_DEFAULT.lng });
  const [locationLabel, setLocationLabel] = useState(t("common.locationPending"));
  const [isOnline, setIsOnline] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<HelpRequestDTO[]>([]);
  const [helperMarkers, setHelperMarkers] = useState<HelperPresenceDTO[]>([]);
  const [myRequests, setMyRequests] = useState<RequestListItem[]>([]);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const activeRequest = useMemo(
    () => myRequests.find((r) => r.status === "in_progress") ?? null,
    [myRequests]
  );

  const refreshData = useCallback(
    async (lat: number, lng: number) => {
      const [meRes, myReqRes, helpersRes] = await Promise.all([
        fetch("/api/auth/me", { cache: "no-store" }),
        fetch("/api/requests/mine?status=in_progress,completed", { cache: "no-store" }),
        fetch(`/api/helpers/nearby?lat=${lat}&lng=${lng}`, { cache: "no-store" }),
      ]);

      const meData = await readJson<{ user?: PublicUser | null }>(meRes);
      if (meRes.status === 401 || meRes.status === 403) {
        router.replace(href("/auth/login"));
        return;
      }
      if (!meRes.ok || !meData?.user) return;

      const myReqData = await readJson<{ requests?: RequestListItem[] }>(myReqRes);
      const helpersData = await readJson<{ helpers?: HelperPresenceDTO[] }>(helpersRes);

      setMe(meData.user as PublicUser);
      setMyRequests((myReqData?.requests ?? []) as RequestListItem[]);
      setHelperMarkers((helpersData?.helpers ?? []) as HelperPresenceDTO[]);
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
        await refreshData(loc.lat, loc.lng);
      } catch {
        if (!cancelled) await refreshData(KOSICE_DEFAULT.lat, KOSICE_DEFAULT.lng);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshData, t]);

  useEffect(() => {
    const es = new EventSource(
      `/api/stream/requests?lat=${coords.lat}&lng=${coords.lng}`
    );
    es.onmessage = (evt) => setPendingRequests(JSON.parse(evt.data) as HelpRequestDTO[]);
    es.onerror = () => es.close();
    return () => es.close();
  }, [coords.lat, coords.lng]);

  useEffect(() => {
    const ping = async () => {
      try {
        const loc = await getUserLocation();
        setCoords({ lat: loc.lat, lng: loc.lng });
        await fetch("/api/helpers/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: loc.lat,
            lng: loc.lng,
            current_request_id: activeRequest?._id ?? null,
            is_online: isOnline,
          }),
        });
        await refreshData(loc.lat, loc.lng);
      } catch { /* ignore */ }
    };
    void ping();
    const id = setInterval(() => void ping(), 10_000);
    return () => clearInterval(id);
  }, [activeRequest?._id, isOnline, refreshData]);

  const acceptRequest = async (requestId: string) => {
    const res = await fetch("/api/requests/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: requestId }),
    });
    const data = await readJson<{ request?: HelpRequestDTO }>(res);
    if (!res.ok || !data?.request) return;
    setMyRequests((p) => [data.request as RequestListItem, ...p]);
    await refreshData(coords.lat, coords.lng);
    router.push(href(`/chat/${requestId}`));
  };

  const completeRequest = async () => {
    if (!activeRequest) return;
    setActionBusy(true);
    try {
      await fetch("/api/requests/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: activeRequest._id }),
      });
      await refreshData(coords.lat, coords.lng);
    } finally {
      setActionBusy(false);
    }
  };

  const releaseRequest = async () => {
    if (!activeRequest) return;
    setActionBusy(true);
    try {
      await fetch("/api/requests/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: activeRequest._id }),
      });
      await refreshData(coords.lat, coords.lng);
    } finally {
      setActionBusy(false);
    }
  };

  const distanceToActive = activeRequest
    ? distanceMetres(
        coords.lat, coords.lng,
        activeRequest.location.coordinates[1],
        activeRequest.location.coordinates[0]
      )
    : 0;

  const canComplete = Boolean(activeRequest) && distanceToActive <= COMPLETION_DISTANCE_METRES;
  const visiblePending = activeRequest
    ? pendingRequests.filter((r) => r._id !== activeRequest._id)
    : pendingRequests;

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

          {/* Right: Status + Karma + Dark mode */}
          <div className="flex flex-1 items-center justify-end gap-1.5">
            {me && (
              <span className="rounded-full bg-accessible-yellow px-2.5 py-1.5 text-xs font-black text-black shadow-sm">
                ⭐ {me.karma_points}
              </span>
            )}
            <span
              className={`flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-black shadow-sm ${
                isOnline
                  ? "bg-accessible-lime text-black"
                  : "bg-black/10 dark:bg-white/10 text-[var(--openarm-muted)]"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-black status-pulse" : "bg-[var(--openarm-muted)]"}`} />
              {isOnline ? t("common.online") : t("common.offline")}
            </span>
            <DarkModeToggle />
          </div>
        </div>
      </div>

      {/* ── MAP LAYER ── */}
      <div
        className="absolute inset-x-0 transition-all duration-300"
        style={{ top: `${topBarHeight}px`, bottom: bottomOffset }}
      >
        <HelperMap
          center={coords}
          requests={visiblePending}
          helpers={helperMarkers}
          activeRequest={activeRequest}
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

        <HelperBottomSheet
          isOnline={isOnline}
          onToggleOnline={() => setIsOnline((p) => !p)}
          requests={visiblePending}
          activeRequest={activeRequest}
          distanceMetres={distanceToActive}
          canComplete={canComplete}
          onAccept={acceptRequest}
          onComplete={completeRequest}
          onRelease={releaseRequest}
          busy={actionBusy}
        />
      </div>
    </div>
  );
}
