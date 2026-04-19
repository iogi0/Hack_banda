"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { VoiceRequestButton } from "./VoiceRequestButton";
import { UrgencySelector } from "./UrgencySelector";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useLocalePath } from "@/lib/i18n/useLocalePath";
import { speakSafeNodesDescription } from "@/lib/speak-safe-nodes";
import { safeVibrate } from "@/lib/vibration";
import type {
  HelpRequestDTO,
  ParsedIntent,
  RequestCategory,
  RequestUrgency,
  SafeNodeDTO,
} from "@/lib/types";

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

type ComposerState = {
  title: string;
  description: string;
  category: RequestCategory;
  urgency: RequestUrgency;
  duration: string;
  a11yNotes: string;
};

const EMPTY_COMPOSER: ComposerState = {
  title: "",
  description: "",
  category: "other",
  urgency: "medium",
  duration: "30",
  a11yNotes: "",
};

const VALID_CATEGORIES: RequestCategory[] = ["shopping", "stairs", "transport", "medical", "other"];
const VALID_URGENCIES: RequestUrgency[] = ["low", "medium", "high", "critical"];

function ComposerModal({
  open,
  state,
  busy,
  onClose,
  onChange,
  onSubmit,
}: {
  open: boolean;
  state: ComposerState;
  busy: boolean;
  onClose: () => void;
  onChange: (patch: Partial<ComposerState>) => void;
  onSubmit: () => Promise<void>;
}) {
  const { t } = useTranslation();

  const categories: { value: RequestCategory; label: string }[] = useMemo(
    () => [
      { value: "shopping", label: t("request.category.shopping") },
      { value: "stairs", label: t("request.category.stairs") },
      { value: "transport", label: t("request.category.transport") },
      { value: "medical", label: t("request.category.medical") },
      { value: "other", label: t("request.category.other") },
    ],
    [t]
  );

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex h-full items-end justify-center p-3 sm:items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-surface max-h-[92dvh] w-full max-w-md overflow-hidden rounded-[34px] shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
          {/* Modal header */}
          <div className="flex items-start justify-between gap-4 border-b border-[var(--openarm-border)] px-5 py-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--openarm-muted)]">OpenArm</p>
              <h3 className="mt-1.5 text-2xl font-black text-[var(--openarm-text)]">{t("requester.modalTitle")}</h3>
              <p className="mt-1 text-sm text-[var(--openarm-muted)]">{t("requester.modalBody")}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-[var(--openarm-bg)] dark:bg-white/10 text-xl text-[var(--openarm-text)] transition hover:bg-black/10 dark:hover:bg-white/15"
              aria-label={t("requester.closeComposer")}
            >
              ✕
            </button>
          </div>

          {/* Modal body */}
          <div className="flex max-h-[calc(92dvh-110px)] flex-col gap-3 overflow-y-auto px-5 py-4">
            <div className="flex flex-col gap-1">
              <label className="form-label">{t("requester.shortTitle") || "Short title"}</label>
              <input
                className="rounded-[18px] border-2 border-[var(--openarm-border)] bg-[var(--openarm-input-bg)] px-4 py-3.5 text-base text-[var(--openarm-text)] outline-none transition focus:border-accessible-yellow"
                placeholder={t("requester.shortTitle")}
                value={state.title}
                onChange={(e) => onChange({ title: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="form-label">{t("requester.problemLabel") || "Description"}</label>
              <textarea
                rows={3}
                className="rounded-[18px] border-2 border-[var(--openarm-border)] bg-[var(--openarm-input-bg)] px-4 py-3.5 text-base text-[var(--openarm-text)] outline-none transition focus:border-accessible-yellow resize-none"
                placeholder={t("requester.problemLabel")}
                value={state.description}
                onChange={(e) => onChange({ description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="form-label">{t("requester.categoryLabel")}</label>
                <select
                  value={state.category}
                  onChange={(e) => onChange({ category: e.target.value as RequestCategory })}
                  className="rounded-[18px] border-2 border-[var(--openarm-border)] bg-[var(--openarm-input-bg)] px-4 py-3.5 text-base text-[var(--openarm-text)]"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="form-label">{t("requester.duration")}</label>
                <input
                  type="number"
                  min={5}
                  step={5}
                  value={state.duration}
                  onChange={(e) => onChange({ duration: e.target.value })}
                  className="rounded-[18px] border-2 border-[var(--openarm-border)] bg-[var(--openarm-input-bg)] px-4 py-3.5 text-base text-[var(--openarm-text)]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="form-label">{t("requester.urgencyLabel")}</label>
              <UrgencySelector value={state.urgency} onChange={(urgency) => onChange({ urgency })} />
            </div>

            <input
              className="rounded-[18px] border-2 border-[var(--openarm-border)] bg-[var(--openarm-input-bg)] px-4 py-3.5 text-base text-[var(--openarm-text)] outline-none transition focus:border-accessible-yellow"
              placeholder={t("requester.a11yNotes")}
              value={state.a11yNotes}
              onChange={(e) => onChange({ a11yNotes: e.target.value })}
            />

            <div className="mt-2 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="flex min-h-[52px] items-center justify-center rounded-[18px] bg-[var(--openarm-bg)] dark:bg-white/10 text-base font-black text-[var(--openarm-text)] transition hover:bg-black/8 dark:hover:bg-white/15 disabled:opacity-50"
              >
                {t("common.back")}
              </button>
              <button
                type="button"
                onClick={() => void onSubmit()}
                disabled={busy}
                className="flex min-h-[52px] items-center justify-center rounded-[18px] bg-black dark:bg-accessible-yellow text-xl font-black text-white dark:text-black shadow-lg transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {busy ? "⏳" : `📍 ${t("common.publish")}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── IDLE STATE ─── */
function IdleSheet({
  coords,
  onCreated,
}: {
  coords: { lat: number; lng: number };
  onCreated: (r: HelpRequestDTO) => void;
}) {
  const { t } = useTranslation();
  const [composerOpen, setComposerOpen] = useState(false);
  const [composer, setComposer] = useState<ComposerState>(EMPTY_COMPOSER);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  const updateComposer = (patch: Partial<ComposerState>) => {
    setComposer((current) => ({ ...current, ...patch }));
  };

  const resetComposer = () => {
    setComposer(EMPTY_COMPOSER);
    setComposerOpen(false);
  };

  const submitRequest = async (payload?: Partial<ParsedIntent>) => {
    const nextTitle = String(payload?.title ?? composer.title ?? "").trim();
    const nextDescription = String(payload?.description ?? composer.description ?? "").trim();
    const nextCategory = VALID_CATEGORIES.includes((payload?.category ?? composer.category) as RequestCategory)
      ? ((payload?.category ?? composer.category) as RequestCategory)
      : "other";
    const nextUrgency = VALID_URGENCIES.includes((payload?.urgency ?? composer.urgency) as RequestUrgency)
      ? ((payload?.urgency ?? composer.urgency) as RequestUrgency)
      : "medium";
    const rawDuration = Number(payload?.estimated_duration ?? composer.duration ?? 30);
    const nextDuration = Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 30;
    const nextA11yNotes = String(payload?.accessibility_notes ?? composer.a11yNotes ?? "").trim();

    setBusy(true);
    setFeedback("");
    try {
      const response = await fetch("/api/requests/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: nextTitle || nextDescription.slice(0, 48) || "Need help",
          description: nextDescription,
          category: nextCategory,
          urgency: nextUrgency,
          estimated_duration: nextDuration,
          accessibility_notes: nextA11yNotes,
          lat: coords.lat,
          lng: coords.lng,
        }),
      });
      const data = await readJson<{ error?: string; request?: HelpRequestDTO }>(response);
      if (!response.ok || !data?.request) {
        setFeedback(data?.error ?? t("requester.createFailed"));
        return false;
      }

      onCreated(data.request);
      resetComposer();
      setFeedback(t("requester.requestPublished"));
      safeVibrate(30);
      return true;
    } finally {
      setBusy(false);
    }
  };

  const parseTranscript = async (transcript: string) => {
    setFeedback(t("requester.parsePending"));
    const response = await fetch("/api/voice/parse-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    });
    const data = await readJson<{ error?: string; intent?: ParsedIntent }>(response);

    if (!response.ok || !data?.intent) {
      setComposer({
        ...EMPTY_COMPOSER,
        title: transcript.slice(0, 48),
        description: transcript,
      });
      setComposerOpen(true);
      setFeedback(data?.error ?? t("requester.parseFailed"));
      return;
    }

    const intent = data.intent;
    setComposer({
      title: intent.title,
      description: intent.description,
      category: intent.category,
      urgency: intent.urgency,
      duration: String(intent.estimated_duration),
      a11yNotes: intent.accessibility_notes ?? "",
    });
    setFeedback(t("requester.submitting"));
    const created = await submitRequest(intent);
    if (created) {
      setFeedback(t("requester.voiceAutoSent"));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Main SOS button */}
      <button
        type="button"
        onClick={() => {
          setComposerOpen(true);
          safeVibrate(20);
        }}
        className="flex min-h-[72px] w-full items-center justify-center gap-3 rounded-[26px] bg-accessible-red px-5 text-white shadow-lg shadow-accessible-red/30 transition-all hover:scale-[1.01] active:scale-[0.98]"
        aria-label={t("requester.button_help")}
      >
        <span className="text-3xl" aria-hidden>🆘</span>
        <span className="text-2xl font-black tracking-tight">{t("requester.button_help")}</span>
      </button>

      <VoiceRequestButton onTranscript={parseTranscript} disabled={busy} />

      <ComposerModal
        open={composerOpen}
        state={composer}
        busy={busy}
        onClose={() => setComposerOpen(false)}
        onChange={updateComposer}
        onSubmit={async () => {
          await submitRequest();
        }}
      />

      {feedback ? (
        <div className="rounded-[16px] bg-[var(--openarm-surface)] border border-[var(--openarm-border)] px-4 py-3 text-center">
          <p className="text-sm font-semibold text-[var(--openarm-muted)]">{feedback}</p>
        </div>
      ) : null}
    </div>
  );
}

/* ─── PENDING STATE ─── */
function PendingSheet({
  request,
  safeNodes = [],
}: {
  request: HelpRequestDTO;
  safeNodes?: SafeNodeDTO[];
}) {
  const { t } = useTranslation();
  const hasNearbyServices = safeNodes.length > 0;

  useEffect(() => {
    if (hasNearbyServices) {
      void speakSafeNodesDescription(safeNodes, "uk");
    }
  }, [safeNodes, hasNearbyServices]);

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {/* Animated spinner */}
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-accessible-yellow border-t-transparent" />
        <span className="text-2xl">🔍</span>
      </div>

      <div>
        <p className="text-xl font-black text-[var(--openarm-text)]">{t("requester.waiting")}</p>
        <p className="mt-1 text-sm text-[var(--openarm-muted)]">
          {t("requester.waitingSubtitle") ?? "Looking for a nearby volunteer..."}
        </p>
      </div>

      {/* Request preview card */}
      <div className="w-full rounded-[20px] border border-[var(--openarm-border)] bg-[var(--openarm-surface)] p-4 text-left shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--openarm-muted)]">
          {t("requester.pendingTitle")}
        </p>
        <p className="mt-1.5 text-base font-bold text-[var(--openarm-text)]">{request.title}</p>
        <div className="mt-2">
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border ${
            request.urgency === "critical" ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/40"
            : request.urgency === "high" ? "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300"
            : "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300"
          }`}>
            {request.urgency}
          </span>
        </div>
      </div>

      {hasNearbyServices && (
        <div className="w-full rounded-[20px] border border-accessible-blue/20 dark:border-accessible-blue/15 bg-blue-50 dark:bg-blue-900/20 p-4 text-left">
          <p className="text-xs font-bold text-accessible-blue dark:text-blue-400">
            📍 {t("requester.safeNodesNearby")}
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {safeNodes.slice(0, 3).map((node) => (
              <div key={node._id} className="rounded-[14px] bg-white dark:bg-white/8 p-3">
                <p className="font-bold text-sm text-blue-900 dark:text-blue-200">{node.name}</p>
                {node.phone && (
                  <a href={`tel:${node.phone}`} className="text-xs text-accessible-blue underline mt-0.5 block">
                    {node.phone}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── ACTIVE (in_progress) STATE ─── */
function ActiveSheet({
  request,
  onComplete,
  onCancel,
  busy,
  showChat,
}: {
  request: HelpRequestDTO;
  onComplete: () => Promise<void>;
  onCancel: () => Promise<void>;
  busy: boolean;
  showChat: boolean;
}) {
  const { t } = useTranslation();
  const { href } = useLocalePath();

  return (
    <div className="flex flex-col gap-3">
      {/* Accepted notification */}
      <div className="rounded-[20px] bg-accessible-lime/15 dark:bg-accessible-lime/10 border border-accessible-lime/30 p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-accessible-lime status-pulse" />
          <p className="text-sm font-bold text-accessible-lime dark:text-accessible-lime">
            {t("requester.acceptedTitle")}
          </p>
        </div>
        <p className="text-lg font-black text-[var(--openarm-text)]">{request.title}</p>
      </div>

      {/* Chat button */}
      {showChat && (
        <Link
          href={href(`/chat/${request._id}`)}
          className="flex min-h-[52px] items-center justify-center gap-2.5 rounded-[20px] bg-black dark:bg-accessible-yellow text-lg font-black text-white dark:text-black shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
          onClick={() => safeVibrate(20)}
        >
          💬 {t("common.chat")}
        </Link>
      )}

      {/* Done button */}
      <button
        type="button"
        onClick={() => void onComplete()}
        disabled={busy}
        className="flex min-h-[52px] w-full items-center justify-center rounded-[20px] bg-accessible-lime text-lg font-black text-black shadow-lg shadow-accessible-lime/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
      >
        {busy ? "⏳" : "✅ " + t("requester.markDone")}
      </button>

      {/* Cancel */}
      <button
        type="button"
        onClick={() => void onCancel()}
        disabled={busy}
        className="flex min-h-[44px] w-full items-center justify-center rounded-[18px] bg-[var(--openarm-surface)] border border-[var(--openarm-border)] text-sm font-bold text-[var(--openarm-muted)] transition-all hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
      >
        {t("requester.cancelRequest")}
      </button>

      <Link
        href={href("/dashboard/requester/my-requests")}
        className="text-center text-sm text-[var(--openarm-muted)] underline underline-offset-2"
      >
        {t("common.history")}
      </Link>
    </div>
  );
}

function PendingSheetActions({
  onCancel,
  busy,
}: {
  onCancel: () => Promise<void>;
  busy: boolean;
}) {
  const { t } = useTranslation();
  const { href } = useLocalePath();

  return (
    <div className="mt-3 flex flex-col gap-3">
      <button
        type="button"
        onClick={() => void onCancel()}
        disabled={busy}
        className="flex min-h-[52px] w-full items-center justify-center rounded-[20px] bg-black dark:bg-white/10 text-lg font-black text-white dark:text-[var(--openarm-text)] transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
      >
        {busy ? "⏳" : t("requester.cancelRequest")}
      </button>
      <Link
        href={href("/dashboard/requester/my-requests")}
        className="text-center text-sm text-[var(--openarm-muted)] underline underline-offset-2"
      >
        {t("common.history")}
      </Link>
    </div>
  );
}

/* ─── SAFE NODES FALLBACK ─── */
function SafeNodesSheet({ nodes }: { nodes: SafeNodeDTO[] }) {
  const { t } = useTranslation();
  return (
    <div className="mt-3 flex flex-col gap-2">
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--openarm-muted)]">
        📍 {t("requester.safeNodesNearby")}
      </p>
      <div className="flex flex-col gap-2">
        {nodes.slice(0, 3).map((node) => (
          <div key={node._id} className="rounded-[18px] border border-accessible-blue/20 dark:border-accessible-blue/15 bg-blue-50 dark:bg-blue-900/20 p-3">
            <p className="font-bold text-sm text-blue-900 dark:text-blue-200">{node.name}</p>
            {node.phone ? (
              <a
                href={`tel:${node.phone}`}
                className="text-xs text-accessible-blue underline mt-0.5 block"
              >
                {node.phone}
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── MAIN EXPORT ─── */
export function RequesterBottomSheet({
  coords,
  activeRequest,
  safeNodes,
  onCreated,
  onComplete,
  onCancel,
  isBlindRequester = false,
}: {
  coords: { lat: number; lng: number };
  activeRequest: HelpRequestDTO | null;
  safeNodes: SafeNodeDTO[];
  onCreated: (r: HelpRequestDTO) => void;
  onComplete: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  isBlindRequester?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  const wrap = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto px-4 pb-safe pt-2">
      {activeRequest?.status === "in_progress" ? (
        <ActiveSheet
          request={activeRequest}
          busy={busy}
          showChat={true}
          onComplete={() => wrap(() => onComplete(activeRequest._id))}
          onCancel={() => wrap(() => onCancel(activeRequest._id))}
        />
      ) : activeRequest?.status === "pending" ? (
        <>
          <PendingSheet request={activeRequest} safeNodes={safeNodes} />
          <PendingSheetActions busy={busy} onCancel={() => wrap(() => onCancel(activeRequest._id))} />
        </>
      ) : (
        <>
          <IdleSheet coords={coords} onCreated={onCreated} />
          {safeNodes.length > 0 ? <SafeNodesSheet nodes={safeNodes} /> : null}
        </>
      )}
    </div>
  );
}
