import React, { useState } from 'react';
import { Trip, TripSettlement } from '../types';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  ArrowRight,
  Copy,
  Check,
  FileSpreadsheet,
  X,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { getCleanSixDigitTripCode } from '../lib/dateUtils';

interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  settlement: TripSettlement;
  onEndTrip: () => Promise<void>;
  onReopenTrip: () => Promise<void>;
  onSyncToSheets: () => Promise<void>;
  hasGoogleToken: boolean;
  onConnectGoogle: () => void;
}

export const SettlementModal: React.FC<SettlementModalProps> = ({
  isOpen,
  onClose,
  trip,
  settlement,
  onEndTrip,
  onReopenTrip,
  onSyncToSheets,
  hasGoogleToken,
  onConnectGoogle,
}) => {
  const [copied, setCopied] = useState(false);
  const [settledMap, setSettledMap] = useState<Record<number, boolean>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmEnding, setConfirmEnding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const displayTripCode = trip.code || getCleanSixDigitTripCode(trip.id);

  const handleToggleSettled = (idx: number) => {
    const next = !settledMap[idx];
    setSettledMap({ ...settledMap, [idx]: next });
    if (next) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
  };

  const generateReportText = () => {
    let text = `✈️ Trip Settlement: ${trip.destination}\n`;
    text += `Trip Code: ${displayTripCode}\n`;
    text += `Dates: ${trip.startDate} to ${trip.endDate}\n`;
    text += `Total Trip Expenses: ${trip.currency}${settlement.totalSpent.toFixed(2)}\n\n`;

    text += `📊 Participant Breakdown:\n`;
    settlement.participants.forEach((p) => {
      const balanceStr =
        p.netBalance > 0
          ? `+${trip.currency}${p.netBalance.toFixed(2)} (Gets back)`
          : p.netBalance < 0
          ? `-${trip.currency}${Math.abs(p.netBalance).toFixed(2)} (Owes)`
          : `Settled ($0.00)`;
      text += `• ${p.name}: Paid ${trip.currency}${p.totalPaid.toFixed(2)} | Fair Share ${trip.currency}${p.fairShare.toFixed(2)} | ${balanceStr}\n`;
    });

    text += `\n💸 Who Pays Whom (Simplification):\n`;
    if (settlement.transactions.length === 0) {
      text += `All balances are fully settled! 🎉\n`;
    } else {
      settlement.transactions.forEach((t, i) => {
        const isPaid = settledMap[i] ? ' [PAID]' : ' [PENDING]';
        text += `• ${t.from} ➔ pays ➔ ${t.to}: ${trip.currency}${t.amount.toFixed(2)}${isPaid}\n`;
      });
    }

    if (trip.sheetUrl) {
      text += `\n📄 Google Sheet Log: ${trip.sheetUrl}\n`;
    }
    return text;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateReportText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const executeEndTrip = async () => {
    try {
      setIsProcessing(true);
      await onEndTrip();
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 },
      });
      setStatusMessage('Trip officially concluded! 🎉');
      setConfirmEnding(false);
      setTimeout(() => {
        setStatusMessage(null);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to end trip:', err);
      setStatusMessage('Error ending trip. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const executeReopenTrip = async () => {
    try {
      setIsProcessing(true);
      await onReopenTrip();
      setStatusMessage('Trip reopened successfully!');
      setTimeout(() => {
        setStatusMessage(null);
        onClose();
      }, 900);
    } catch (err) {
      console.error('Failed to reopen trip:', err);
      setStatusMessage('Error reopening trip.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-gray-950/80 backdrop-blur-xs animate-fadeIn overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl flex flex-col max-h-[90dvh] sm:max-h-[85vh] h-auto my-auto overflow-hidden border border-gray-100">
        {/* Sticky Header with Always-Visible Close Button */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white z-20">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-gray-900 truncate">
                  Trip Settlement &amp; Split
                </h2>
                <span className="font-mono text-xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {displayTripCode}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate">
                {trip.destination} &bull;{' '}
                {trip.status === 'ended' ? (
                  <span className="text-amber-700 font-bold">Trip Concluded</span>
                ) : (
                  <span className="text-emerald-700 font-bold">Trip Active</span>
                )}
              </p>
            </div>
          </div>

          {/* Large, High-Contrast Close Button - Always visible on all screens */}
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0 border border-gray-200 shadow-2xs"
            title="Close Settlement Modal"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Status Notification Toast Banner */}
        {statusMessage && (
          <div className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold text-center animate-fadeIn shrink-0">
            {statusMessage}
          </div>
        )}

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
          {/* Overview Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="rounded-2xl bg-gray-50/80 p-3 border border-gray-200/70">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Spent</div>
              <div className="text-base sm:text-lg font-black text-gray-900 mt-0.5 tracking-tight font-mono">
                {trip.currency}
                {settlement.totalSpent.toFixed(2)}
              </div>
            </div>
            <div className="rounded-2xl bg-gray-50/80 p-3 border border-gray-200/70">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fair Share / Person</div>
              <div className="text-base sm:text-lg font-black text-gray-900 mt-0.5 tracking-tight font-mono">
                {trip.currency}
                {settlement.perPersonShare.toFixed(2)}
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1 rounded-2xl bg-gray-50/80 p-3 border border-gray-200/70">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Participants</div>
              <div className="text-base sm:text-lg font-black text-gray-900 mt-0.5 tracking-tight">
                {settlement.participants.length} members
              </div>
            </div>
          </div>

          {/* Participant Balances Table (Responsive for all device sizes) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-800">
                Individual Net Balances
              </h3>
              <span className="text-[11px] text-gray-400 font-medium">Owes vs. Gets back</span>
            </div>

            <div className="space-y-2">
              {settlement.participants.map((p) => {
                const isCreditor = p.netBalance > 0.01;
                const isDebtor = p.netBalance < -0.01;
                return (
                  <div
                    key={p.name}
                    className="p-3 sm:p-3.5 rounded-2xl bg-white border border-gray-200/90 shadow-2xs transition hover:border-gray-300"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      {/* Participant Avatar & Name */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-100 to-teal-100 text-emerald-800 flex items-center justify-center text-xs font-black shrink-0">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-extrabold text-gray-900 text-sm truncate">{p.name}</span>
                      </div>

                      {/* Status Pill */}
                      <div className="flex items-center sm:justify-end">
                        {isCreditor ? (
                          <span className="inline-flex items-center gap-1.5 font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-xl text-xs whitespace-nowrap shadow-2xs">
                            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                            <span>+ Gets back {trip.currency}{p.netBalance.toFixed(2)}</span>
                          </span>
                        ) : isDebtor ? (
                          <span className="inline-flex items-center gap-1.5 font-extrabold text-rose-800 bg-rose-50 border border-rose-200/80 px-2.5 py-1 rounded-xl text-xs whitespace-nowrap shadow-2xs">
                            <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                            <span>Owes {trip.currency}{Math.abs(p.netBalance).toFixed(2)}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-xl text-xs whitespace-nowrap">
                            <Check className="w-3 h-3 text-gray-500" />
                            <span>Settled ($0.00)</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metrics Row */}
                    <div className="mt-2.5 pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs text-gray-500">
                      <div>
                        <span className="text-[11px] text-gray-400 block">Total Paid:</span>
                        <strong className="text-gray-900 font-bold font-mono">
                          {trip.currency}{p.totalPaid.toFixed(2)}
                        </strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-gray-400 block">Fair Share:</span>
                        <strong className="text-gray-900 font-bold font-mono">
                          {trip.currency}{p.fairShare.toFixed(2)}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Debt Simplification: Who Pays Whom */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-800">
                Settlement Plan (Who Pays Whom)
              </h3>
              <span className="text-[11px] text-gray-400 font-medium">
                {settlement.transactions.length} transfer{settlement.transactions.length === 1 ? '' : 's'} needed
              </span>
            </div>

            {settlement.transactions.length === 0 ? (
              <div className="rounded-2xl bg-emerald-50 p-4 text-center border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold">
                🎉 Everyone is fully settled! No payments are owed.
              </div>
            ) : (
              <div className="space-y-2">
                {settlement.transactions.map((t, idx) => {
                  const isPaid = !!settledMap[idx];
                  return (
                    <div
                      key={idx}
                      onClick={() => handleToggleSettled(idx)}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 sm:p-3.5 rounded-2xl border cursor-pointer transition ${
                        isPaid
                          ? 'border-emerald-300 bg-emerald-50/70 opacity-75'
                          : 'border-gray-200 bg-white hover:border-emerald-300 hover:shadow-xs'
                      }`}
                    >
                      {/* Participant to Participant flow */}
                      <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
                        <span className="font-extrabold text-gray-900 truncate">{t.from}</span>
                        <span className="text-[11px] text-gray-400 font-medium">pays</span>
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-extrabold text-emerald-800 truncate">{t.to}</span>
                      </div>

                      {/* Amount & Mark Settled Button */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                        <span
                          className={`text-base sm:text-lg font-black font-mono ${
                            isPaid ? 'line-through text-gray-400' : 'text-gray-900'
                          }`}
                        >
                          {trip.currency}
                          {t.amount.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          className={`text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 transition cursor-pointer ${
                            isPaid
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {isPaid ? <Check className="w-3 h-3" /> : null}
                          <span>{isPaid ? 'Settled' : 'Mark Settled'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Fixed Modal Footer with Actions and Close Button */}
        <div className="p-3 sm:px-6 sm:py-4 bg-gray-50 border-t border-gray-100 shrink-0 z-20 space-y-2">
          {/* Confirmation Box for Ending Trip (Directly inside Footer) */}
          {confirmEnding ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 animate-fadeIn">
              <div className="flex items-center gap-2 text-xs font-bold min-w-0">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Officially conclude this trip and finalize settlements?</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setConfirmEnding(false)}
                  disabled={isProcessing}
                  className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={executeEndTrip}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-xs font-black text-white shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {isProcessing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>{isProcessing ? 'Concluding...' : 'Yes, End Trip'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 rounded-2xl border border-gray-300 bg-white py-2 px-3 text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-100 active:scale-98 transition cursor-pointer shadow-2xs"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
              </button>

              {hasGoogleToken ? (
                <button
                  type="button"
                  onClick={async () => {
                    setIsProcessing(true);
                    await onSyncToSheets();
                    setIsProcessing(false);
                  }}
                  disabled={isProcessing}
                  className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 py-2 px-3 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-98 transition disabled:opacity-50 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{isProcessing ? 'Syncing...' : 'Sync to Sheets'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onConnectGoogle}
                  className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 rounded-2xl border border-gray-300 bg-white py-2 px-3 text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer shadow-2xs"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Connect Sheets</span>
                </button>
              )}

              {trip.status === 'active' ? (
                <button
                  type="button"
                  onClick={() => setConfirmEnding(true)}
                  disabled={isProcessing}
                  className="rounded-2xl bg-amber-600 hover:bg-amber-700 text-white py-2 px-3.5 text-xs sm:text-sm font-black active:scale-98 transition cursor-pointer shadow-xs whitespace-nowrap"
                  title="Officially mark this trip as ended"
                >
                  End Trip Officially
                </button>
              ) : (
                <button
                  type="button"
                  onClick={executeReopenTrip}
                  disabled={isProcessing}
                  className="rounded-2xl bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 px-3.5 text-xs sm:text-sm font-bold transition cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
                  title="Reopen trip to log more expenses"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isProcessing ? 'Reopening...' : 'Reopen Trip'}</span>
                </button>
              )}

              {/* Explicit Secondary Close Button in Footer */}
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-2xl border border-gray-300 bg-white hover:bg-gray-100 active:bg-gray-200 text-xs sm:text-sm font-bold text-gray-700 transition cursor-pointer shrink-0 shadow-2xs"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
