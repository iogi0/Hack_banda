"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { CategoryIcon } from "@/components/Common/CategoryIcon";
import { useLocalePath } from "@/lib/i18n/useLocalePath";
import { safeVibrate } from "@/lib/vibration";
import type { HelpRequestDTO } from "@/lib/types";

const URGENCY_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-700/40",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700/40",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-700/40",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-700/40",
};

/* ─── IDLE: toggle + scrollable request list ─── */
function IdleSheet({
  isOnline,
  onToggle,
  requests,
  onAccept,
  busy,
}: {
  isOnline: boolean;
  onToggle: () => void;
  requests: HelpRequestDTO[];
  onAccept: (id: string) => Promise<void>;
  busy: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3">
      {/* Online toggle */}
      <button
        type="button"
        onClick={() => { onToggle(); safeVibrate(20); }}
        className={`relative flex w-full items-center justify-between rounded-[22px] px-5 py-4 text-xl font-black transition-all duration-200 ${
          isOnline
            ? "bg-accessible-lime text-black shadow-lg shadow-accessible-lime/30"
            : "bg-[var(--openarm-surface)] border border-[var(--openarm-border)] text-[var(--openarm-text)]"
        }`}
        aria-label={t("helper.toggle_online")}
        aria-pressed={isOnline}
      >
        <span className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${isOnline ? "bg-black status-pulse" : "bg-[var(--openarm-muted)]"}`} />
          {isOnline ? t("helper.toggle_online") : t("helper.toggle_online")}
        </span>
        <span className={`rounded-full px-3 py-1 text-sm font-black ${
          isOnline ? "bg-black/15 text-black" : "bg-[var(--openarm-muted)]/20 text-[var(--openarm-muted)]"
        }`}>
          {isOnline ? "ON" : "OFF"}
        </span>
      </button>

      {/* Nearby requests list */}
      {isOnline && (
        <div className="flex flex-col gap-2">
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <span className="text-4xl opacity-30">🔍</span>
              <p className="text-sm font-semibold text-[var(--openarm-muted)]">
                {t("helper.noRequests")}
              </p>
            </div>
          ) : (
            requests.map((req) => (
              <div
                key={req._id}
                className="request-card flex items-center gap-3 rounded-[20px] border border-[var(--openarm-border)] bg-[var(--openarm-surface)] p-3.5 shadow-sm"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--openarm-bg)] dark:bg-white/8 text-xl">
                  <CategoryIcon category={req.category} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-bold text-[var(--openarm-text)] leading-tight">{req.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-[var(--openarm-muted)] truncate">{req.requester_name}</span>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${URGENCY_COLORS[req.urgency] ?? URGENCY_COLORS.medium}`}>
                      {req.urgency}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => { void onAccept(req._id); safeVibrate(25); }}
                  className="shrink-0 rounded-[16px] bg-black dark:bg-accessible-yellow px-4 py-2.5 text-sm font-bold text-white dark:text-black shadow-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
                  aria-label={`${t("helper.accept_help")} – ${req.title}`}
                >
                  {t("helper.accept_help")}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {!isOnline && (
        <p className="text-center text-sm text-[var(--openarm-muted)] py-4">
          {t("helper.goOnlineToSeeRequests") ?? "Go online to see nearby requests"}
        </p>
      )}
    </div>
  );
}

/* ─── ACTIVE (in_progress) ─── */
function ActiveSheet({
  request,
  distanceMetres,
  canComplete,
  onComplete,
  onRelease,
  busy,
}: {
  request: HelpRequestDTO;
  distanceMetres: number;
  canComplete: boolean;
  onComplete: () => Promise<void>;
  onRelease: () => Promise<void>;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const { href } = useLocalePath();
  const eta = Math.ceil(distanceMetres / 70);

  return (
    <div className="flex flex-col gap-3">
      {/* Active badge */}
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-accessible-lime status-pulse" />
        <span className="text-xs font-bold uppercase tracking-widest text-accessible-lime">
          {t("helper.active")}
        </span>
      </div>

      {/* Request info card */}
      <div className="rounded-[20px] border border-[var(--openarm-border)] bg-[var(--openarm-surface)] p-4 shadow-sm">
        <p className="text-lg font-black text-[var(--openarm-text)] leading-tight">{request.title}</p>
        {request.description ? (
          <p className="mt-1.5 text-sm text-[var(--openarm-muted)] leading-snug line-clamp-2">{request.description}</p>
        ) : null}
        <div className="mt-2">
          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase ${URGENCY_COLORS[request.urgency] ?? URGENCY_COLORS.medium}`}>
            {request.urgency}
          </span>
        </div>
      </div>

      {/* Distance + ETA chips */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-[18px] bg-accessible-yellow/20 dark:bg-accessible-yellow/10 border border-accessible-yellow/30 p-3 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--openarm-muted)]">
            {t("helper.distance").replace("{distance}", "") || "Distance"}
          </p>
          <p className="mt-0.5 text-2xl font-black text-[var(--openarm-text)]">{Math.round(distanceMetres)}м</p>
        </div>
        <div className="rounded-[18px] bg-[var(--openarm-surface)] border border-[var(--openarm-border)] p-3 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--openarm-muted)]">
            {t("helper.etaLabel") || "ETA"}
          </p>
          <p className="mt-0.5 text-2xl font-black text-[var(--openarm-text)]">{eta} хв</p>
        </div>
      </div>

      {/* Chat button */}
      <Link
        href={href(`/chat/${request._id}`)}
        className="flex min-h-[52px] items-center justify-center gap-2.5 rounded-[20px] bg-black dark:bg-accessible-yellow text-lg font-black text-white dark:text-black shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
        onClick={() => safeVibrate(20)}
      >
        💬 {t("common.chat")}
      </Link>

      {/* Complete button */}
      <button
        type="button"
        onClick={() => { void onComplete(); safeVibrate(40); }}
        disabled={!canComplete || busy}
        className={`flex min-h-[52px] w-full items-center justify-center rounded-[20px] text-lg font-black transition-all ${
          canComplete
            ? "bg-accessible-lime text-black shadow-lg shadow-accessible-lime/30 hover:scale-[1.02] active:scale-[0.98]"
            : "bg-[var(--openarm-surface)] border border-[var(--openarm-border)] text-[var(--openarm-muted)] cursor-not-allowed"
        }`}
      >
        {canComplete
          ? busy ? "⏳ Working..." : "✅ " + t("helper.complete")
          : `📍 ${t("helper.moveCloser", { distance: Math.round(distanceMetres) })}`}
      </button>

      {/* Release button */}
      <button
        type="button"
        onClick={() => { void onRelease(); safeVibrate(25); }}
        disabled={busy}
        className="flex min-h-[44px] w-full items-center justify-center rounded-[18px] bg-[var(--openarm-surface)] border border-[var(--openarm-border)] text-sm font-bold text-[var(--openarm-muted)] transition-all hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800/40 disabled:opacity-50"
      >
        {t("helper.releaseRequest") ?? "Release request"}
      </button>
    </div>
  );
}

/* ─── MAIN EXPORT ─── */
export function HelperBottomSheet({
  isOnline,
  onToggleOnline,
  requests,
  activeRequest,
  distanceMetres,
  canComplete,
  onAccept,
  onComplete,
  onRelease,
  busy,
}: {
  isOnline: boolean;
  onToggleOnline: () => void;
  requests: HelpRequestDTO[];
  activeRequest: HelpRequestDTO | null;
  distanceMetres: number;
  canComplete: boolean;
  onAccept: (id: string) => Promise<void>;
  onComplete: () => Promise<void>;
  onRelease: () => Promise<void>;
  busy: boolean;
}) {
  return (
    <div className="h-full overflow-y-auto px-4 pb-safe pt-2">
      {activeRequest ? (
        <ActiveSheet
          request={activeRequest}
          distanceMetres={distanceMetres}
          canComplete={canComplete}
          onComplete={onComplete}
          onRelease={onRelease}
          busy={busy}
        />
      ) : (
        <IdleSheet
          isOnline={isOnline}
          onToggle={onToggleOnline}
          requests={requests}
          onAccept={onAccept}
          busy={busy}
        />
      )}
    </div>
  );
}
