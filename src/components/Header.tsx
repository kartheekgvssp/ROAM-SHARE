import React, { useState } from 'react';
import { Trip, UserProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { getCleanSixDigitTripCode } from '../lib/dateUtils';
import {
  Compass,
  User as UserIcon,
  Share2,
  Check,
  Calculator,
  ChevronDown,
  Cloud,
  CloudOff,
  Plane,
  Settings,
  Smartphone,
  QrCode,
} from 'lucide-react';

interface HeaderProps {
  trip: Trip | null;
  currentUser: UserProfile;
  onOpenTripSelector: () => void;
  onOpenEditTrip: () => void;
  onOpenUserModal: () => void;
  onOpenSettlement: () => void;
  onOpenPhoneShare: () => void;
  isOnline: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  trip,
  currentUser,
  onOpenTripSelector,
  onOpenEditTrip,
  onOpenUserModal,
  onOpenSettlement,
  onOpenPhoneShare,
  isOnline,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  const handleShareTrip = () => {
    if (!trip) return;
    const tripCode = trip.code || getCleanSixDigitTripCode(trip.id);
    const shareUrl = `${window.location.origin}${window.location.pathname}?trip=${tripCode}`;
    if (navigator.share) {
      navigator
        .share({
          title: `TripSync - ${trip.destination}`,
          text: `Join our trip expenses for ${trip.destination} with Trip Code: ${tripCode}`,
          url: shareUrl,
        })
        .catch(() => {
          navigator.clipboard.writeText(tripCode);
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 2000);
        });
    } else {
      navigator.clipboard.writeText(tripCode);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200/80 px-3 sm:px-6 py-2.5">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        {/* Left: Brand Logo & Trip Selector */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-sm shadow-emerald-600/30">
              <Plane className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-gray-900 hidden sm:inline">
              TripSync
            </span>
          </div>

          {/* Active Trip Button & Small Unique Code */}
          {trip ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onOpenTripSelector}
                className="flex items-center gap-1.5 rounded-2xl border border-gray-200 bg-gray-50/80 hover:bg-gray-100/90 py-1.5 px-2.5 text-xs sm:text-sm font-bold text-gray-900 transition truncate max-w-[125px] sm:max-w-[200px] cursor-pointer"
                title="Switch Destination"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{trip.destination}</span>
                <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const code = trip.code || getCleanSixDigitTripCode(trip.id);
                  navigator.clipboard.writeText(code);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[11px] font-bold px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer active:scale-95 shadow-2xs"
                title="Click to copy 6-digit Trip Code"
              >
                <span>Code: {trip.code || getCleanSixDigitTripCode(trip.id)}</span>
                <span className="text-[10px] opacity-75">{copiedLink ? '✓' : '📋'}</span>
              </button>
              <button
                onClick={onOpenEditTrip}
                className="p-1.5 rounded-xl border border-gray-200 bg-gray-50/80 hover:bg-gray-100 text-gray-600 hover:text-emerald-700 transition cursor-pointer"
                title="Trip &amp; Participant Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenTripSelector}
              className="flex items-center gap-1 rounded-xl bg-emerald-50 border border-emerald-200 py-1.5 px-3 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition"
            >
              <span>+ Select Trip</span>
            </button>
          )}
        </div>

        {/* Right: Actions, Settlement, User, PWA */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Get on Phone / Share Button */}
          {trip && (
            <button
              onClick={onOpenPhoneShare}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100/80 py-1.5 px-2.5 text-xs font-bold text-emerald-900 transition shadow-2xs cursor-pointer active:scale-95"
              title="Get on Your Phone (QR Code) & Share with Friends"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Phone &amp; Share</span>
              <QrCode className="w-3 h-3 text-emerald-600 opacity-80 hidden md:inline" />
            </button>
          )}

          {/* Share trip code / link button */}
          {trip && (
            <button
              onClick={onOpenPhoneShare}
              className="sm:hidden flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition shadow-2xs cursor-pointer"
              title="Share Trip Link / Code"
            >
              <Share2 className="w-3.5 h-3.5 text-gray-600" />
            </button>
          )}

          {/* End Trip / Settlement Shortcut */}
          {trip && (
            <button
              onClick={onOpenSettlement}
              className={`flex items-center gap-1 rounded-lg font-semibold py-1.5 px-2.5 text-xs sm:text-sm transition ${
                trip.status === 'ended'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>{trip.status === 'ended' ? 'Settlement' : 'End & Settle'}</span>
            </button>
          )}

          {/* PWA Install Button */}
          <PWAInstallButton compact />

          {/* User Profile Badge */}
          <button
            onClick={onOpenUserModal}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white p-1 sm:px-2.5 sm:py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50 transition"
            title="Click to change your user name"
          >
            {currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.name}
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="hidden md:inline max-w-[80px] truncate">{currentUser.name}</span>
          </button>

          {/* Online/Offline Icon */}
          <div
            className="hidden sm:flex items-center text-xs"
            title={isOnline ? 'Cloud database connected (real-time)' : 'Offline mode'}
          >
            {isOnline ? (
              <Cloud className="w-4 h-4 text-emerald-600" />
            ) : (
              <CloudOff className="w-4 h-4 text-amber-600" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
