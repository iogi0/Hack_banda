"use client";

interface Props {
  mine: boolean;
  text: string;
  time: string;
  type?: "text" | "voice" | "system";
}

export function MessageBubble({ mine, text, time, type = "text" }: Props) {
  if (type === "system") {
    return (
      <div className="my-3 flex justify-center">
        <span className="rounded-full bg-black/10 dark:bg-white/10 px-4 py-1.5 text-xs font-semibold text-black/60 dark:text-white/60 border border-black/8 dark:border-white/8">
          {text}
        </span>
      </div>
    );
  }

  const formattedTime = new Date(time).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`my-1.5 flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`relative max-w-[80%] ${mine ? "bubble-mine" : "bubble-other"} px-4 py-3`}>
        {type === "voice" && (
          <div className={`mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${mine ? "text-white/60" : "text-black/50 dark:text-white/50"}`}>
            <span>🎤</span>
            <span>Voice</span>
          </div>
        )}
        <p className="whitespace-pre-wrap break-words text-base leading-snug">{text}</p>
        <p className={`mt-1 text-[11px] font-medium ${mine ? "text-right opacity-60" : "opacity-50"}`}>
          {formattedTime}
        </p>
      </div>
    </div>
  );
}
