import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Trip } from '../types';
import { getCleanSixDigitTripCode } from '../lib/dateUtils';
import {
  Smartphone,
  QrCode,
  Copy,
  Check,
  Share2,
  X,
  Sparkles,
  CloudCheck,
  WifiOff,
  ArrowRight,
  ShieldCheck,
  Compass,
} from 'lucide-react';

interface PhoneShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | null;
}

export const PhoneShareModal: React.FC<PhoneShareModalProps> = ({
  isOpen,
  onClose,
  trip,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'qr' | 'install' | 'sync'>('qr');

  const tripCode = trip ? trip.code || getCleanSixDigitTripCode(trip.id) : '';
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}${tripCode ? `?trip=${tripCode}` : ''}`
    : '';

  useEffect(() => {
    if (isOpen && shareUrl) {
      QRCode.toDataURL(shareUrl, {
        width: 280,
        margin: 2,
        color: {
          dark: '#064e3b', // Deep emerald
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR code:', err));
    }
  }, [isOpen, shareUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(tripCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `TripSync - ${trip?.destination || 'Shared Trip'}`,
          text: `Join our trip expenses for ${trip?.destination || 'our trip'}! Trip Code: ${tripCode}`,
          url: shareUrl,
        })
        .catch(() => handleCopyLink());
    } else {
      handleCopyLink();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-gray-950/80 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh] h-auto my-auto overflow-hidden border border-gray-100">
        {/* Sticky Header with Always-Visible Close Button */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white z-20">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-sm">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-gray-900 truncate">
                Get on Your Phone &amp; Share
              </h2>
              <p className="text-xs text-gray-500 truncate">
                Scan with phone camera or share with trip friends
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0 border border-gray-200 shadow-2xs"
            title="Close"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Sub-navigation Tabs */}
        <div className="flex items-center border-b border-gray-100 px-4 sm:px-6 bg-gray-50 shrink-0 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'qr'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR Code &amp; Link</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('install')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'install'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Phone App Setup</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'sync'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Sync &amp; Data Safety</span>
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
          {/* TAB 1: QR CODE & SHARE */}
          {activeTab === 'qr' && (
            <div className="space-y-4 animate-fadeIn">
              {/* QR Code Presentation */}
              <div className="flex flex-col items-center justify-center p-5 rounded-3xl bg-gradient-to-b from-emerald-50/70 to-gray-50 border border-emerald-100/80 text-center shadow-xs">
                {qrDataUrl ? (
                  <div className="p-3 bg-white rounded-2xl shadow-md border border-gray-200/80">
                    <img
                      src={qrDataUrl}
                      alt="Scan to open TripSync on phone"
                      className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center bg-gray-100 rounded-2xl animate-pulse">
                    <QrCode className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Scan with Phone Camera
                  </span>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs">
                    Open your iPhone or Android camera, point at the code, and tap the link banner to load this trip immediately!
                  </p>
                </div>
              </div>

              {/* 6-Digit Trip Code Card */}
              {tripCode && (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-950 text-white shadow-sm border border-emerald-800">
                  <div className="min-w-0 pr-2">
                    <div className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest">
                      6-Digit Trip Code
                    </div>
                    <div className="text-xl sm:text-2xl font-black font-mono tracking-widest text-emerald-100">
                      {tripCode}
                    </div>
                    <p className="text-[11px] text-emerald-400">
                      Friends can tap &ldquo;Join Trip&rdquo; and enter this code
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 text-xs font-black transition cursor-pointer shrink-0 shadow-xs"
                  >
                    {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
              )}

              {/* Shareable Link Box */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Direct Shareable URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 font-mono text-xs rounded-xl border border-gray-200 bg-gray-50 p-2.5 text-gray-700 truncate"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 active:scale-95 text-xs font-bold text-gray-800 transition cursor-pointer shrink-0 flex items-center gap-1 shadow-2xs"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Native Share button */}
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 py-3 text-sm font-black text-white shadow-md shadow-emerald-700/20 transition cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Share via WhatsApp, Messages, or AirDrop</span>
              </button>
            </div>
          )}

          {/* TAB 2: INSTALL ON PHONE (PWA) */}
          {activeTab === 'install' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-1">
                <strong className="block text-sm font-black text-emerald-900">
                  📱 Install as a Home Screen App (No App Store Needed)
                </strong>
                <p className="text-emerald-800">
                  TripSync is a Progressive Web App (PWA). You can install it straight from your mobile browser for a full-screen, lightning-fast app experience with offline support!
                </p>
              </div>

              {/* iPhone / iPad Safari Instructions */}
              <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-2.5 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-black">
                    Apple iOS (Safari)
                  </span>
                  <span className="text-xs text-gray-500 font-medium">iPhone &amp; iPad</span>
                </div>
                <ol className="space-y-2 text-xs text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 shrink-0">
                      1
                    </span>
                    <span>
                      Open the app URL in <strong>Safari</strong> on your iPhone.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 shrink-0">
                      2
                    </span>
                    <span>
                      Tap the <strong>Share icon</strong> (the square box with an arrow pointing up at the bottom of Safari).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 shrink-0">
                      3
                    </span>
                    <span>
                      Scroll down and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong>, then tap <strong>&ldquo;Add&rdquo;</strong> in the top right.
                    </span>
                  </li>
                </ol>
              </div>

              {/* Android Chrome Instructions */}
              <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-2.5 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black">
                    Android (Chrome / Samsung)
                  </span>
                  <span className="text-xs text-gray-500 font-medium">Pixel, Samsung, OnePlus</span>
                </div>
                <ol className="space-y-2 text-xs text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 shrink-0">
                      1
                    </span>
                    <span>
                      Open the link in <strong>Google Chrome</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 shrink-0">
                      2
                    </span>
                    <span>
                      Tap the <strong>&ldquo;Install App&rdquo;</strong> banner or the <strong>3 dots (⋮)</strong> in Chrome.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 shrink-0">
                      3
                    </span>
                    <span>
                      Tap <strong>&ldquo;Install App&rdquo;</strong> or <strong>&ldquo;Add to Home Screen&rdquo;</strong> to place the TripSync icon on your home screen.
                    </span>
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: DATA RETENTION & REAL-TIME SYNC */}
          {activeTab === 'sync' && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-2 shadow-2xs">
                <div className="flex items-center gap-2 text-emerald-800 font-black text-sm">
                  <CloudCheck className="w-5 h-5 text-emerald-600" />
                  <span>Will my data be saved after 25 days?</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  <strong>Yes, absolutely!</strong> All your trips, participants, receipts, and split balances are permanently saved in your dedicated <strong>Google Firebase Firestore cloud database</strong>.
                </p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Even if you don&rsquo;t open the app for 25 days, months, or restart your phone, your data remains intact and secure. Whenever you re-open the app, your previous trips and history will load right where you left off.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-2 shadow-2xs">
                <div className="flex items-center gap-2 text-emerald-800 font-black text-sm">
                  <WifiOff className="w-5 h-5 text-emerald-600" />
                  <span>Offline-First Storage on Your Phone</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  The app also caches your active trip and recent records in your phone&rsquo;s local offline storage (LocalStorage &amp; ServiceWorker cache). You can view your expenses and fair-share calculations even while in airplane mode or with zero cell service!
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-2 shadow-2xs">
                <div className="flex items-center gap-2 text-emerald-800 font-black text-sm">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  <span>How Real-Time Sync Works with Friends</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  TripSync uses active <strong>Firestore real-time listeners (WebSockets)</strong>. The moment you or any friend logs an expense:
                </p>
                <ul className="text-xs text-gray-600 space-y-1 pl-4 list-disc">
                  <li>Everyone&rsquo;s phone updates in real-time (&lt; 200ms) with zero manual page refreshes.</li>
                  <li>Net balances (&ldquo;Owes&rdquo; vs &ldquo;Gets back&rdquo;) recompute automatically on all devices.</li>
                  <li>Offline entries automatically queue and sync to the group the second connectivity returns.</li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-2 shadow-2xs">
                <div className="flex items-center gap-2 text-emerald-800 font-black text-sm">
                  <Compass className="w-5 h-5 text-emerald-600" />
                  <span>Switching Between Previous Trips</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  You can tap the top destination button (or <strong>+ Select Trip</strong>) anytime to view your <strong>Recent Trips list</strong>. You can switch between active and concluded trips, view past settlement breakdowns, and see total spends across all your adventures.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:px-6 sm:py-3.5 bg-gray-50 border-t border-gray-100 shrink-0 z-20 flex items-center justify-between gap-2">
          <span className="text-xs text-gray-500 font-medium truncate">
            {trip ? `${trip.destination} (${tripCode})` : 'TripSync'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-2xl border border-gray-300 bg-white hover:bg-gray-100 active:bg-gray-200 text-xs sm:text-sm font-bold text-gray-700 transition cursor-pointer shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
