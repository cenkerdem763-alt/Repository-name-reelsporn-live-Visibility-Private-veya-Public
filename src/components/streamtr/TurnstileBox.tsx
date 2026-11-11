import { useEffect, useRef } from "react";

const TURNSTILE_SITE_KEY = "0x4AAAAAADLoerSOathA8TVu";

type TurnstileWindow = Window & {
  turnstile?: {
    render: (
      container: HTMLElement,
      options: {
        sitekey: string;
        theme?: "dark" | "light" | "auto";
        callback?: (token: string) => void;
        "expired-callback"?: () => void;
        "error-callback"?: () => void;
      }
    ) => string;
    reset: (widgetId?: string) => void;
    remove: (widgetId?: string) => void;
  };
};

let scriptPromise: Promise<void> | null = null;

function loadTurnstile() {
  const turnstileWindow = window as TurnstileWindow;
  if (turnstileWindow.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile could not be loaded"));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export function TurnstileBox({ onToken }: { onToken: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let widgetId: string | undefined;
    let cancelled = false;

    loadTurnstile()
      .then(() => {
        if (cancelled || !ref.current) return;
        widgetId = (window as TurnstileWindow).turnstile?.render(ref.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "dark",
          callback: onToken,
          "expired-callback": () => onToken(""),
          "error-callback": () => onToken(""),
        });
      })
      .catch(() => onToken(""));

    return () => {
      cancelled = true;
      if (widgetId) (window as TurnstileWindow).turnstile?.remove(widgetId);
    };
  }, [onToken]);

  return (
    <div className="flex min-h-[70px] items-center justify-center overflow-hidden">
      <div ref={ref} className="w-[300px] max-w-full origin-center scale-[0.96] sm:scale-100" />
    </div>
  );
}
