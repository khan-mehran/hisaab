"use client";

import { useEffect, useState } from "react";
import { DownloadIcon, ShareIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "install-dismissed";

/**
 * "Install app" banner: uses beforeinstallprompt on Android/desktop Chrome
 * and shows Add-to-Home-Screen instructions on iOS Safari.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {}
    if (standalone || dismissed) return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
    if (isIos) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only detection after mount
      setIos(true);
      setHidden(false);
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setHidden(false);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  };

  if (hidden || (!deferred && !ios)) return null;

  return (
    <div className="mb-5 flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 p-3 text-sm">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <DownloadIcon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium">Install Hisaab</p>
        {ios ? (
          <p className="text-xs text-muted-foreground">
            Tap <ShareIcon className="inline size-3.5 align-text-bottom" /> Share, then <b>Add to Home Screen</b>.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Add it to your home screen for quick, full-screen access.</p>
        )}
      </div>
      {deferred && (
        <Button
          size="sm"
          onClick={async () => {
            await deferred.prompt();
            const { outcome } = await deferred.userChoice;
            if (outcome === "accepted") setHidden(true);
            setDeferred(null);
          }}
        >
          Install
        </Button>
      )}
      <Button variant="ghost" size="icon-sm" aria-label="Dismiss" onClick={dismiss}>
        <XIcon />
      </Button>
    </div>
  );
}
