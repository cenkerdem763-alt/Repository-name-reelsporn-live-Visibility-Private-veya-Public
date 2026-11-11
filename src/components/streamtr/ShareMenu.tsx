import { useState } from "react";
import { Check, Copy, MessageCircle, Send, Share2 } from "lucide-react";

type ShareMenuVariant = "button" | "icon" | "menu-item";

type ShareMenuProps = {
  title: string;
  url?: string;
  variant?: ShareMenuVariant;
  className?: string;
  onShared?: () => void;
};

function getShareUrl(url?: string) {
  if (url) return url;
  if (typeof window === "undefined") return "";
  return window.location.href;
}

function openShareTarget(url: string) {
  window.open(url, "_blank", "noopener,noreferrer,width=720,height=620");
}

export function ShareMenu({ title, url, variant = "button", className = "", onShared }: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareUrl = getShareUrl(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(shareUrl);

  const copyLink = async () => {
    await navigator.clipboard?.writeText(shareUrl).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
    onShared?.();
  };

  const nativeShare = async () => {
    if (!navigator.share) {
      setOpen((value) => !value);
      return;
    }

    await navigator.share({ title, url: shareUrl }).catch(() => undefined);
    onShared?.();
  };

  const shareOptions = [
    {
      label: copied ? "Kopyalandı" : "Linki kopyala",
      icon: copied ? Check : Copy,
      onClick: copyLink,
    },
    {
      label: "WhatsApp",
      icon: MessageCircle,
      onClick: () => {
        openShareTarget(`https://wa.me/?text=${encodeURIComponent(`${title} ${shareUrl}`)}`);
        onShared?.();
      },
    },
    {
      label: "Telegram",
      icon: Send,
      onClick: () => {
        openShareTarget(`https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`);
        onShared?.();
      },
    },
    {
      label: "X'te paylaş",
      icon: Share2,
      onClick: () => {
        openShareTarget(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`);
        onShared?.();
      },
    },
  ];

  if (variant === "menu-item") {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={`flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-foreground transition hover:bg-accent ${className}`}
          aria-expanded={open}
        >
          <Share2 className="h-4 w-4" />
          Paylaş
        </button>
        {open && (
          <div className="absolute right-full top-0 z-50 mr-2 w-44 rounded-md border border-white/10 bg-popover p-1.5 shadow-[0_18px_44px_rgba(0,0,0,0.34)]">
            {shareOptions.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={option.onClick}
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-foreground transition hover:bg-accent"
              >
                <option.icon className="h-4 w-4" />
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={variant === "icon" ? nativeShare : () => setOpen((value) => !value)}
        onContextMenu={(event) => {
          if (variant !== "icon") return;
          event.preventDefault();
          setOpen((value) => !value);
        }}
        className={
          variant === "icon"
            ? `grid h-10 w-10 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.08] text-white/90 backdrop-blur-md transition hover:bg-white/[0.14] active:scale-95 ${className}`
            : `inline-flex h-9 items-center justify-center gap-2 rounded-md bg-secondary px-3 text-sm font-semibold text-secondary-foreground transition hover:bg-secondary/80 ${className}`
        }
        aria-label="Paylaş"
        aria-expanded={open}
      >
        <Share2 className="h-4 w-4" />
        {variant === "button" && <span>{copied ? "Kopyalandı" : "Paylaş"}</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-48 rounded-md border border-white/10 bg-popover p-2 shadow-[0_18px_44px_rgba(0,0,0,0.34)]">
          <div className="px-2 pb-2 text-xs font-bold text-muted-foreground">Paylaş</div>
          {shareOptions.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={option.onClick}
              className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm text-foreground transition hover:bg-accent"
            >
              <option.icon className="h-4 w-4" />
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
