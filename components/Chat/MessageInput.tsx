"use client";

import { useRef, useState, FormEvent, KeyboardEvent } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { safeVibrate } from "@/lib/vibration";

type SpeechRecognitionResultLike = {
  transcript: string;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>>;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous?: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

type SpeechWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };

interface Props {
  onSend: (text: string) => Promise<void> | void;
  disabled?: boolean;
  isBlind?: boolean;
}

export function MessageInput({ onSend, disabled, isBlind = false }: Props) {
  const { t, locale } = useTranslation();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const localeCode = locale === "uk" ? "uk-UA" : locale === "sk" ? "sk-SK" : "en-US";

  const submitText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onSend(trimmed);
      setValue("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      safeVibrate(15);
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await submitText(value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submitText(value);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // Auto-resize textarea
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const stopListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognition.stop();
    recognitionRef.current = null;
    setListening(false);
  };

  const startListening = () => {
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;

    if (!Recognition || listening || busy) {
      return;
    }

    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = localeCode;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = async (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (!transcript) return;

      if (isBlind) {
        await submitText(transcript);
      } else {
        setValue(transcript);
      }

      recognition.stop();
    };

    recognition.onerror = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    setListening(true);
    safeVibrate(40);
    recognition.start();
  };

  const toggleListening = () => {
    if (listening) {
      stopListening();
      safeVibrate(60);
      return;
    }
    startListening();
  };

  /* ── BLIND MODE: large voice button only ── */
  if (isBlind) {
    return (
      <div className="card-surface sticky bottom-0 flex flex-col items-center justify-center gap-5 rounded-[30px] px-4 py-6">
        <div className="relative flex items-center justify-center">
          {listening && (
            <>
              <span className="absolute h-[140px] w-[140px] animate-ping rounded-full bg-accessible-red/15" />
              <span className="absolute h-[170px] w-[170px] rounded-full border border-accessible-red/15" />
            </>
          )}
          {!listening && (
            <span className="absolute h-[160px] w-[160px] rounded-full border border-black/8 dark:border-white/8" />
          )}
          <button
            type="button"
            onClick={toggleListening}
            disabled={disabled || busy}
            className={`touch-target relative flex h-[120px] w-[120px] items-center justify-center rounded-full text-5xl font-black shadow-[0_18px_40px_rgba(17,17,17,0.20)] transition-all duration-200 ${
              listening
                ? "bg-accessible-red text-white scale-105"
                : "bg-accessible-yellow text-black hover:scale-105"
            }`}
            aria-label={listening ? t("chat.stopVoice") : t("chat.voice")}
            aria-pressed={listening}
          >
            {listening ? "⏹" : "🎤"}
          </button>
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-lg font-black text-[var(--openarm-text)]">
            {listening ? t("requester.voiceListening") : t("chat.voice")}
          </p>
          <p className="text-sm text-[var(--openarm-muted)]">
            {listening ? t("chat.stopVoice") : t("requester.voiceCta")}
          </p>
        </div>
      </div>
    );
  }

  /* ── SIGHTED MODE: text + optional voice ── */
  const canSend = value.trim().length > 0 && !busy;

  return (
    <form
      onSubmit={submit}
      className="card-surface sticky bottom-0 rounded-[28px] p-2.5"
    >
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder={t("chat.placeholder")}
          disabled={disabled || busy || listening}
          aria-label={t("chat.placeholder")}
          className="flex-1 resize-none rounded-[20px] border-0 bg-[var(--openarm-input-bg)] px-4 py-3 text-base text-[var(--openarm-text)] outline-none placeholder:text-[var(--openarm-muted)] focus:ring-2 focus:ring-accessible-yellow/50 min-h-[48px] max-h-[120px] transition-all"
          style={{ height: "48px" }}
        />

        <div className="flex shrink-0 items-end gap-1.5 pb-0.5">
          {/* Voice toggle */}
          <button
            type="button"
            onClick={toggleListening}
            disabled={disabled || busy}
            className={`flex h-11 w-11 items-center justify-center rounded-[18px] text-lg font-black transition-all duration-200 ${
              listening
                ? "animate-pulse bg-accessible-red text-white shadow-lg"
                : "bg-black/8 dark:bg-white/10 text-[var(--openarm-text)] hover:bg-black/12 dark:hover:bg-white/15"
            }`}
            aria-label={listening ? t("chat.stopVoice") : t("chat.voice")}
            aria-pressed={listening}
          >
            {listening ? "⏹" : "🎤"}
          </button>

          {/* Send button */}
          <button
            type="submit"
            disabled={!canSend}
            className={`flex h-11 w-11 items-center justify-center rounded-[18px] text-lg font-black shadow-md transition-all duration-200 ${
              canSend
                ? "bg-black dark:bg-accessible-yellow text-white dark:text-black hover:scale-105 shadow-black/20 dark:shadow-accessible-yellow/30"
                : "bg-black/10 dark:bg-white/10 text-[var(--openarm-muted)] cursor-not-allowed"
            }`}
            aria-label={t("chat.send")}
          >
            ↑
          </button>
        </div>
      </div>

      {listening && (
        <div className="mt-2 flex items-center justify-center gap-1.5 pb-1">
          <span className="typing-dot h-2 w-2 rounded-full bg-accessible-red" />
          <span className="typing-dot h-2 w-2 rounded-full bg-accessible-red" />
          <span className="typing-dot h-2 w-2 rounded-full bg-accessible-red" />
          <span className="ml-1 text-xs font-semibold text-accessible-red">{t("requester.voiceListening")}</span>
        </div>
      )}
    </form>
  );
}
