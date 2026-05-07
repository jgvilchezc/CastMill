"use client";

import { useState, useEffect } from "react";
import { Download, X, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (isInstalled || (!deferredPrompt && !isIOS)) return null;

  const handleClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setDeferredPrompt(null);
    }
  };

  return (
    <>
      <Button
        onClick={handleClick}
        variant="ghost"
        className="font-medium text-white hover:bg-white/10 flex items-center gap-2 px-3"
      >
        <Download className="w-4 h-4 shrink-0" />
        <span className="hidden sm:inline">Install App</span>
      </Button>

      {showIOSGuide && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-sm p-6 relative shadow-[8px_8px_0_0_var(--color-primary)]">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-heading font-black text-xl uppercase tracking-tight text-white mb-4">
              Install on iPhone
            </h3>
            <ol className="space-y-4 text-zinc-300 font-mono text-sm">
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold shrink-0">1.</span>
                <span>
                  Abre esta página en{" "}
                  <strong className="text-white">Safari</strong> y toca el botón{" "}
                  <Share className="w-4 h-4 inline mx-1 text-primary" />
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold shrink-0">2.</span>
                <span>
                  Desliza y toca{" "}
                  <strong className="text-white">
                    &ldquo;Añadir a pantalla de inicio&rdquo;
                  </strong>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary font-bold shrink-0">3.</span>
                <span>
                  Toca <strong className="text-white">&ldquo;Añadir&rdquo;</strong>{" "}
                  — Expandcast aparece como app en tu iPhone
                </span>
              </li>
            </ol>
            <Button
              onClick={() => setShowIOSGuide(false)}
              className="mt-6 w-full bg-primary text-primary-foreground rounded-none font-bold"
            >
              Entendido
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
