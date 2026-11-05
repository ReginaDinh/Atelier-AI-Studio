import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Smartphone,
  Download,
  Share,
  PlusSquare,
  CheckCircle2,
  X,
  WifiOff,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';
import { cn } from '../lib/utils';

interface PWAInstallButtonProps {
  isEditorial?: boolean;
  isMidnight?: boolean;
  variant?: 'header' | 'sidebar' | 'icon' | 'settings';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  isEditorial = false,
  isMidnight = false,
  variant = 'sidebar',
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, isInIframe, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Hide when already running as an installed standalone PWA
  if (isInstalled) {
    return null;
  }

  const handleTrigger = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleCopyUrl = () => {
    if (!currentUrl) return;
    navigator.clipboard.writeText(currentUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <>
      {variant === 'header' ? (
        <button
          type="button"
          onClick={handleTrigger}
          className={cn(
            "h-8 px-2.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors shrink-0 leading-none",
            isEditorial
              ? "bg-white hover:bg-[#f4f4f5] border-[#e4e4e7] text-[#18181b]"
              : "bg-[#18181b] hover:bg-[#27272a] border-[#27272a] text-[#f4f4f5]"
          )}
          title={isInstallable ? "Install app to home screen (PWA)" : "View mobile installation guide"}
        >
          <Smartphone size={13} className="shrink-0 opacity-75" />
          <span className="hidden sm:inline font-medium">Install</span>
        </button>
      ) : variant === 'icon' ? (
        <button
          type="button"
          onClick={handleTrigger}
          className={cn(
            "w-7 h-7 rounded-lg inline-flex items-center justify-center transition-colors shrink-0",
            isEditorial
              ? "text-[#71717a] hover:text-[#18181b] hover:bg-[#f4f4f5]"
              : "text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#27272a]"
          )}
          title={isInstallable ? "Install app to home screen (PWA)" : "View mobile installation guide"}
        >
          <Smartphone size={14} className="shrink-0" />
        </button>
      ) : null}

      {showGuideModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4"
            onClick={() => setShowGuideModal(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl border p-4 sm:p-5 shadow-2xl space-y-3.5 animate-in fade-in zoom-in-95 duration-150',
                isEditorial
                  ? 'bg-[#fbfaf8] border-[#ded7ca] text-[#1e1d1b]'
                  : 'bg-[#101522] border-white/15 text-white'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src="/pwa-192x192.png"
                    alt="Atelier AI Studio App Icon"
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl border border-white/15 shadow-md shrink-0"
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold tracking-tight leading-snug">
                      Install Atelier AI Studio
                    </h3>
                    <p
                      className={cn(
                        'text-[11px] sm:text-xs mt-0.5 leading-snug',
                        isEditorial ? 'text-[#6b665d]' : 'text-slate-400'
                      )}
                    >
                      Standalone Full-Screen App (Android & iOS)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors shrink-0',
                    isEditorial
                      ? 'hover:bg-black/5 text-[#6b665d]'
                      : 'hover:bg-white/10 text-slate-400'
                  )}
                >
                  <X size={16} />
                </button>
              </div>

              {/* 1-Tap Native Prompt when available */}
              {isInstallable && (
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await install();
                    if (ok) setShowGuideModal(false);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <Download size={15} />
                  <span>Install Now (1-Tap)</span>
                </button>
              )}

              {/* Notice when running inside an iframe preview */}
              {!isInstallable && isInIframe && currentUrl && (
                <div
                  className={cn(
                    'p-3 rounded-xl border space-y-2 text-xs',
                    isEditorial
                      ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                      : 'bg-amber-500/10 border-amber-500/35 text-amber-200'
                  )}
                >
                  <div className="font-semibold leading-snug">
                    💡 Running inside Preview Frame
                  </div>
                  <p className="text-[11px] opacity-90 leading-relaxed">
                    Mobile browsers require opening the app in an independent tab to trigger the{' '}
                    <strong>Install App</strong> prompt.
                  </p>
                  <a
                    href={currentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'w-full py-2 px-3 rounded-lg font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-all shadow-xs',
                      isEditorial
                        ? 'bg-[#23201d] text-white hover:bg-[#34302a]'
                        : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                    )}
                  >
                    <ExternalLink size={13} />
                    <span>Open in Mobile Browser to Install</span>
                  </a>
                </div>
              )}

              <div className="space-y-2.5 text-xs">
                {/* Android Chrome Guide */}
                <div
                  className={cn(
                    'p-3 rounded-xl border space-y-1.5',
                    isAndroid
                      ? isEditorial
                        ? 'bg-amber-50/90 border-amber-300'
                        : 'bg-emerald-500/10 border-emerald-500/35'
                      : isEditorial
                      ? 'bg-white border-[#e6e2d8]'
                      : 'bg-white/[0.03] border-white/10'
                  )}
                >
                  <div className="font-bold flex items-center justify-between gap-2">
                    <span>🤖 Android (Chrome / Edge / Samsung)</span>
                    {isAndroid && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 shrink-0">
                        Your Device
                      </span>
                    )}
                  </div>
                  <ol className="space-y-1 list-decimal list-inside opacity-90 leading-relaxed text-[11px] sm:text-xs">
                    <li>
                      Open the link directly in <strong>Chrome</strong>.
                    </li>
                    <li>
                      Tap the menu icon <strong>⋮ (3 dots)</strong> in the top right.
                    </li>
                    <li>
                      Select <strong>Install app</strong> or{' '}
                      <strong>Add to Home screen</strong>.
                    </li>
                  </ol>
                </div>

                {/* iOS Safari Guide */}
                <div
                  className={cn(
                    'p-3 rounded-xl border space-y-1.5',
                    isIOS
                      ? isEditorial
                        ? 'bg-amber-50/90 border-amber-300'
                        : 'bg-sky-500/10 border-sky-500/35'
                      : isEditorial
                      ? 'bg-white border-[#e6e2d8]'
                      : 'bg-white/[0.03] border-white/10'
                  )}
                >
                  <div className="font-bold flex items-center justify-between gap-2">
                    <span>📱 iPhone / iPad (Safari)</span>
                    {isIOS && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 shrink-0">
                        Your Device
                      </span>
                    )}
                  </div>
                  <ol className="space-y-1 list-decimal list-inside opacity-90 leading-relaxed text-[11px] sm:text-xs">
                    <li>
                      Open the app URL in <strong>Safari</strong>.
                    </li>
                    <li>
                      Tap the <strong>Share</strong>{' '}
                      <Share size={12} className="inline mx-0.5 text-sky-400" /> icon on the bottom bar.
                    </li>
                    <li>
                      Scroll down and tap{' '}
                      <strong>Add to Home Screen</strong>{' '}
                      <PlusSquare size={12} className="inline mx-0.5 text-emerald-400" />.
                    </li>
                  </ol>
                </div>

                {/* Copy Direct App Link for Mobile Browser */}
                {currentUrl && (
                  <div
                    className={cn(
                      'p-2.5 rounded-xl border flex items-center justify-between gap-2',
                      isEditorial ? 'bg-[#f4f1ea] border-[#e2ddd3]' : 'bg-[#090d16] border-white/10'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-mono uppercase opacity-60">
                        Direct Mobile Browser Link
                      </div>
                      <div className="text-xs font-mono truncate mt-0.5">{currentUrl}</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyUrl}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 transition-all',
                        isEditorial
                          ? 'bg-[#23201d] text-white hover:bg-[#34302a]'
                          : 'bg-sky-600 text-white hover:bg-sky-500'
                      )}
                    >
                      {copiedUrl ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1 gap-2">
                <div className="flex items-center gap-1.5 text-[11px] opacity-75 font-medium">
                  <CheckCircle2 size={13} className="shrink-0" />
                  <span>Offline cache supported</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  className={cn(
                    'px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0',
                    isEditorial
                      ? 'bg-black/5 hover:bg-black/10 text-[#1e1d1b]'
                      : 'bg-white/10 hover:bg-white/15 text-white'
                  )}
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xl">
      <WifiOff size={14} className="shrink-0 animate-pulse" />
      <span>Offline Mode — Operating with locally cached data.</span>
    </div>
  );
};
