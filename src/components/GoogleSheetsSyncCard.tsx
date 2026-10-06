import React, { useState } from 'react';
import { Trip, Expense } from '../types';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface GoogleSheetsSyncCardProps {
  trip: Trip;
  expenses: Expense[];
  hasGoogleToken: boolean;
  onConnectGoogle: () => void;
  onSyncToSheets: () => Promise<void>;
  isSyncing: boolean;
  autoSyncEnabled: boolean;
  onToggleAutoSync: (enabled: boolean) => void;
}

export const GoogleSheetsSyncCard: React.FC<GoogleSheetsSyncCardProps> = ({
  trip,
  expenses,
  hasGoogleToken,
  onConnectGoogle,
  onSyncToSheets,
  isSyncing,
  autoSyncEnabled,
  onToggleAutoSync,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleSyncClick = () => {
    // Show explicit user confirmation dialog before modifying Google Sheets
    setShowConfirmModal(true);
  };

  const handleConfirmSync = async () => {
    setShowConfirmModal(false);
    await onSyncToSheets();
  };

  return (
    <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-xs border border-gray-200/80">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">Google Sheets Sync</h3>
              {trip.sheetId ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                  Not Synced
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Automated reporting &amp; financial records logged per user (User A, User B, etc.)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!hasGoogleToken ? (
            <button
              onClick={onConnectGoogle}
              className="flex items-center gap-2 rounded-xl bg-white border border-gray-300 px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Connect Google Sheets</span>
            </button>
          ) : (
            <button
              onClick={handleSyncClick}
              disabled={isSyncing}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 active:scale-98 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync to Sheets Now'}</span>
            </button>
          )}

          {trip.sheetUrl && (
            <a
              href={trip.sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition"
              title="Open Google Spreadsheet"
            >
              <span>Open Sheet</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Status Details */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between text-xs text-gray-500 gap-2">
        <div className="flex items-center gap-3">
          <span>
            {trip.lastSyncedAt
              ? `Last synced: ${new Date(trip.lastSyncedAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : 'Never synced'}
          </span>
          <span>•</span>
          <span>{expenses.length} expenses to sync</span>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoSyncEnabled}
            onChange={(e) => onToggleAutoSync(e.target.checked)}
            className="rounded-sm border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="font-medium text-gray-700">Auto-sync on add/edit</span>
        </label>
      </div>

      {/* Confirmation Dialog before updating Google Sheet */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-emerald-700 mb-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-gray-900">
                Confirm Google Sheets Synchronization
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              This will update your Google Spreadsheet for <strong>{trip.destination}</strong> with{' '}
              <strong>{expenses.length} expense records</strong> and current settlement balances.
            </p>
            <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600 mb-5 space-y-1">
              <div>• Updates <strong>&ldquo;Expenses Log&rdquo;</strong> tab with categorized expenses and payer names</div>
              <div>• Updates <strong>&ldquo;Settlement Summary&rdquo;</strong> tab with net balances and settlement transfers</div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="w-1/2 rounded-xl border border-gray-300 py-2.5 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSync}
                className="w-1/2 rounded-xl bg-emerald-600 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-emerald-700 transition"
              >
                Confirm &amp; Sync
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
