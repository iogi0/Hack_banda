"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { safeVibrate } from "@/lib/vibration";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { PhoneCallButton } from "./PhoneCallButton";

interface ChatMessage {
  _id: string;
  request_id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  message_type: "text" | "voice" | "system";
  created_at: string;
}

interface Props {
  requestId: string;
  selfId: string;
  partnerName?: string;
  autoReadIncomingText?: boolean;
  showHeader?: boolean;
  isCurrentUserRequester?: boolean;
  requesterIsBlind?: boolean;
}

export function ChatContainer({
  requestId,
  selfId,
  partnerName,
  autoReadIncomingText = false,
  showHeader = true,
  isCurrentUserRequester = false,
  requesterIsBlind = false,
}: Props) {
  const { t, locale } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [needsAudioTap, setNeedsAudioTap] = useState(false);
  const seenRef = useRef<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const ttsQueueRef = useRef<string[]>([]);
  const ttsPlayingRef = useRef(false);
  const audioUnlockedRef = useRef(false);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const unlockAudio = () => {
      if (audioUnlockedRef.current) return;
      audioUnlockedRef.current = true;
    };

    const events = ["pointerdown", "touchstart", "keydown", "click"];
    events.forEach((event) => {
      document.addEventListener(event, unlockAudio, { once: true, passive: true });
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, unlockAudio);
      });
    };
  }, []);

  const processQueue = useCallback(async () => {
    if (ttsPlayingRef.current || ttsQueueRef.current.length === 0) return;

    ttsPlayingRef.current = true;
    const text = ttsQueueRef.current.shift()!;

    try {
      await speakViaElevenLabs(
        text,
        locale,
        audioUnlockedRef,
        activeAudioRef,
        () => setNeedsAudioTap(true),
        () => setNeedsAudioTap(false)
      );
    } finally {
      ttsPlayingRef.current = false;
      if (ttsQueueRef.current.length > 0) {
        void processQueue();
      }
    }
  }, [locale]);

  const enqueueTTS = useCallback((text: string) => {
    if (ttsQueueRef.current.includes(text)) return;
    ttsQueueRef.current.push(text);
    void processQueue();
  }, [processQueue]);

  const mergeIncomingMessages = useCallback(
    (batch: ChatMessage[]) => {
      if (!batch.length) return;
      setMessages((prev) => {
        const next = [...prev];
        for (const m of batch) {
          if (seenRef.current.has(m._id)) continue;
          seenRef.current.add(m._id);
          next.push(m);
          if (autoReadIncomingText && m.sender_id !== selfId && m.message_type === "text") {
            safeVibrate(35);
            enqueueTTS(m.message);
          }
          if (m.sender_id !== selfId && m.message_type === "system") {
            safeVibrate([160, 80, 160]);
            notifyIncomingCall(m.message);
            playIncomingTone();
          }
        }
        return next;
      });
    },
    [autoReadIncomingText, enqueueTTS, selfId]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/chat/send?request_id=${encodeURIComponent(requestId)}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Load failed");
        if (cancelled) return;
        const initial: ChatMessage[] = data.messages ?? [];
        initial.forEach((m) => seenRef.current.add(m._id));
        setMessages(initial);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Load failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  useEffect(() => {
    let stopped = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/chat/send?request_id=${encodeURIComponent(requestId)}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Load failed");
        if (stopped) return;
        mergeIncomingMessages((data.messages ?? []) as ChatMessage[]);
        setError(null);
      } catch (e) {
        if (!stopped) {
          setError(e instanceof Error ? e.message : "Load failed");
        }
      }
    };

    const intervalId = window.setInterval(() => {
      void poll();
    }, 1500);

    return () => {
      stopped = true;
      window.clearInterval(intervalId);
    };
  }, [mergeIncomingMessages, requestId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async (text: string) => {
    const res = await fetch("/api/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_id: requestId, message: text }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Send failed");
      return;
    }
    const m: ChatMessage = data.message;
    if (!seenRef.current.has(m._id)) {
      seenRef.current.add(m._id);
      setMessages((prev) => [...prev, m]);
    }
  };

  const voiceOnlyInput = isCurrentUserRequester && requesterIsBlind;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {/* ── Header ── */}
      {showHeader && (
        <header className="card-surface sticky top-0 z-20 flex items-center justify-between gap-2 rounded-[24px] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accessible-yellow text-xl font-black text-black shadow-md">
              {partnerName?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--openarm-muted)]">
                {t("chat.title")}
              </p>
              <p className="text-base font-black text-[var(--openarm-text)] leading-tight">
                {partnerName ?? "—"}
              </p>
            </div>
          </div>
          <PhoneCallButton requestId={requestId} />
        </header>
      )}

      {/* ── Message list ── */}
      <div className="scroll-smooth-custom flex-1 rounded-[24px] bg-[var(--openarm-surface)] border border-[var(--openarm-border)] p-3">
        {/* Audio unlock banner */}
        {needsAudioTap && (
          <button
            type="button"
            onClick={() => {
              audioUnlockedRef.current = true;
              setNeedsAudioTap(false);
              void processQueue();
            }}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-[18px] bg-accessible-yellow px-4 py-3 text-center text-sm font-black text-black shadow-md"
          >
            🔊 {t("chat.tapToEnableVoice") ?? "Tap to enable voice playback"}
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="mb-3 rounded-[18px] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 p-3">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!error && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="text-5xl opacity-30">💬</div>
            <p className="text-sm font-semibold text-[var(--openarm-muted)]">
              {t("chat.empty")}
            </p>
          </div>
        )}

        {/* Messages */}
        {messages.map((m) => (
          <MessageBubble
            key={m._id}
            mine={m.sender_id === selfId}
            text={m.message}
            time={m.created_at}
            type={m.message_type}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <MessageInput
        onSend={send}
        isBlind={voiceOnlyInput}
      />
    </div>
  );
}

async function waitForUserActivation(audioUnlockedRef: MutableRefObject<boolean>) {
  if (audioUnlockedRef.current) return true;
  if (typeof document === "undefined") return false;

  return await new Promise<boolean>((resolve) => {
    const unlock = () => {
      cleanup();
      audioUnlockedRef.current = true;
      resolve(true);
    };

    const timeoutId = window.setTimeout(() => {
      cleanup();
      resolve(false);
    }, 15000);

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("keydown", unlock);
      document.removeEventListener("click", unlock);
    };

    document.addEventListener("pointerdown", unlock, { once: true, passive: true });
    document.addEventListener("touchstart", unlock, { once: true, passive: true });
    document.addEventListener("keydown", unlock, { once: true });
    document.addEventListener("click", unlock, { once: true, passive: true });
  });
}

async function speakViaElevenLabs(
  text: string,
  locale: string,
  audioUnlockedRef: MutableRefObject<boolean>,
  activeAudioRef: MutableRefObject<HTMLAudioElement | null>,
  onBlocked: () => void,
  onReady: () => void
): Promise<void> {
  try {
    const res = await fetch("/api/voice/generate-audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      await speakViaBrowser(text, locale, audioUnlockedRef);
      return;
    }
    const blob = await res.blob();
    if (!blob.size) {
      await speakViaBrowser(text, locale, audioUnlockedRef);
      return;
    }

    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    audio.preload = "auto";
    audio.src = url;
    activeAudioRef.current = audio;

    const cleanup = () => {
      if (activeAudioRef.current === audio) {
        activeAudioRef.current = null;
      }
      URL.revokeObjectURL(url);
    };

    const playAudio = async () => {
      try {
        await audio.play();
      } catch (error) {
        const notAllowed =
          error instanceof DOMException && error.name === "NotAllowedError";
        if (notAllowed) {
          onBlocked();
          const unlocked = await waitForUserActivation(audioUnlockedRef);
          if (!unlocked) {
            cleanup();
            return;
          }
          onReady();
          await audio.play();
          return;
        }
        throw error;
      }
    };

    return new Promise<void>(async (resolve) => {
      audio.onended = () => {
        onReady();
        cleanup();
        resolve();
      };
      audio.onerror = () => {
        onReady();
        cleanup();
        void speakViaBrowser(text, locale, audioUnlockedRef).then(() => resolve());
      };
      try {
        await playAudio();
      } catch {
        cleanup();
        void speakViaBrowser(text, locale, audioUnlockedRef).then(() => resolve());
      }
    });
  } catch {
    await speakViaBrowser(text, locale, audioUnlockedRef);
  }
}

function speakViaBrowser(
  text: string,
  locale: string,
  audioUnlockedRef: MutableRefObject<boolean>
): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!("speechSynthesis" in window)) return Promise.resolve();

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale === "uk" ? "uk-UA" : locale === "sk" ? "sk-SK" : "en-US";

    return new Promise<void>(async (resolve) => {
      const unlocked = await waitForUserActivation(audioUnlockedRef);
      if (!unlocked) {
        resolve();
        return;
      }
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
      setTimeout(() => resolve(), 30000);
    });
  } catch {
    return Promise.resolve();
  }
}

function notifyIncomingCall(message: string) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification("OpenArm", { body: message });
    return;
  }
  if (Notification.permission === "default") {
    void Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification("OpenArm", { body: message });
      }
    });
  }
}

function playIncomingTone() {
  if (typeof window === "undefined") return;
  safeVibrate([50, 30, 50]);
}
