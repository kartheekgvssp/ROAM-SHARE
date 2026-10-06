import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share2, PlusSquare, X } from 'lucide-react';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, don't show
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`flex items-center gap-1.5 rounded-lg bg-emerald-600 font-medium text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-1.5 text-xs sm:text-sm'
        }`}
        title="Install TripSync PWA app on your home screen"
      >
        <Download className="w-4 h-4" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 font-medium hover:bg-emerald-100 active:scale-95 transition-all ${
            compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-1.5 text-xs sm:text-sm'
          }`}
          title="Install TripSync on iPhone / iPad"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install PWA</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                    TS
                  </div>
                  <h3 className="font-semibold text-gray-900">Install TripSync PWA</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-full p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="my-4 space-y-3 text-sm text-gray-600">
                <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700 text-xs">
                    1
                  </span>
                  <p>
                    Tap the <span className="font-semibold inline-flex items-center gap-1 text-gray-800"><Share2 className="w-3.5 h-3.5 text-blue-600" /> Share</span> button in Safari's bottom toolbar.
                  </p>
                </div>
                <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700 text-xs">
                    2
                  </span>
                  <p>
                    Scroll down and tap <span className="font-semibold inline-flex items-center gap-1 text-gray-800"><PlusSquare className="w-3.5 h-3.5 text-gray-700" /> Add to Home Screen</span>.
                  </p>
                </div>
                <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700 text-xs">
                    3
                  </span>
                  <p>
                    Tap <strong>Add</strong> in the top right to get instant full-screen access offline!
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
