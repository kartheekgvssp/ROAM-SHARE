import React, { useState } from 'react';
import { Trip, UserProfile } from '../types';
import { DatePickerInput } from './DatePickerInput';
import { formatDateDDMMYYYY, getCleanSixDigitTripCode } from '../lib/dateUtils';
import {
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Plus,
  Compass,
  ArrowRight,
  Clock,
  X,
  Share2,
  Trash2,
} from 'lucide-react';

interface TripSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  recentTrips: Trip[];
  activeTrip: Trip | null;
  onCreateTrip: (newTripData: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onSelectTrip: (tripId: string) => void;
  onJoinTripByCode: (tripCode: string) => Promise<boolean>;
  onDeleteTrip?: (tripId: string) => Promise<void>;
}

export const TripSelectorModal: React.FC<TripSelectorModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  recentTrips,
  activeTrip,
  onCreateTrip,
  onSelectTrip,
  onJoinTripByCode,
  onDeleteTrip,
}) => {
  const [tab, setTab] = useState<'create' | 'join' | 'recent'>('create');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]
  );
  const [currency, setCurrency] = useState('$');
  const [budget, setBudget] = useState('');
  const [participants, setParticipants] = useState<string[]>([currentUser.name, 'User B']);
  const [newParticipantInput, setNewParticipantInput] = useState('');

  const [tripCodeInput, setTripCodeInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddParticipant = () => {
    const trimmed = newParticipantInput.trim();
    if (trimmed && !participants.includes(trimmed)) {
      setParticipants([...participants, trimmed]);
      setNewParticipantInput('');
    }
  };

  const handleRemoveParticipant = (index: number) => {
    if (participants.length <= 1) return;
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) {
      setError('Please provide a destination name');
      return;
    }
    if (participants.length === 0) {
      setError('Add at least one participant');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onCreateTrip({
        destination: destination.trim(),
        startDate,
        endDate,
        currency,
        budget: budget ? parseFloat(budget) : 0,
        status: 'active',
        createdBy: currentUser.name,
        participants,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create trip');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = tripCodeInput.trim().toUpperCase();
    if (!code) {
      setError('Please enter a Trip Code');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      // Try uppercase first, then original
      let success = await onJoinTripByCode(code);
      if (!success && code !== tripCodeInput.trim()) {
        success = await onJoinTripByCode(tripCodeInput.trim());
      }
      if (success) {
        onClose();
      } else {
        setError(`Trip with code "${code}" was not found. Please double-check.`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not find trip');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 sm:p-6 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Manage Trips</h2>
              <p className="text-xs text-gray-500">Create new destination, switch, or join by code</p>
            </div>
          </div>
          {activeTrip && (
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="mt-4 flex rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => {
              setTab('create');
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2 text-xs sm:text-sm font-semibold transition ${
              tab === 'create'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            + New Destination
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('join');
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2 text-xs sm:text-sm font-semibold transition ${
              tab === 'join'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Join by Code
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('recent');
              setError(null);
            }}
            className={`flex-1 rounded-lg py-2 text-xs sm:text-sm font-semibold transition ${
              tab === 'recent'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Saved Trips ({recentTrips.length})
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-600 border border-red-100">
            {error}
          </div>
        )}

        {/* TAB 1: CREATE TRIP */}
        {tab === 'create' && (
          <form onSubmit={handleCreate} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Trip Destination
              </label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g., Tokyo & Kyoto, Japan or Goa Beach"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <DatePickerInput
                  value={startDate}
                  onChange={setStartDate}
                  label="Start Date"
                />
              </div>
              <div>
                <DatePickerInput
                  value={endDate}
                  onChange={setEndDate}
                  label="End Date"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 py-2.5 px-3 text-sm text-gray-900 focus:border-emerald-500 focus:outline-hidden bg-white"
                >
                  <option value="$">USD ($)</option>
                  <option value="₹">INR (₹)</option>
                  <option value="€">EUR (€)</option>
                  <option value="£">GBP (£)</option>
                  <option value="¥">JPY (¥)</option>
                  <option value="CAD $">CAD ($)</option>
                  <option value="AUD $">AUD ($)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Budget (Optional)
                </label>
                <div className="relative">
                  <DollarSign className="pointer-events-none absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g., 2000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 focus:border-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Participants */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Trip Participants ({participants.length})
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {participants.map((p, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 border border-emerald-200"
                  >
                    <Users className="w-3 h-3 text-emerald-600" />
                    <span>{p}</span>
                    {participants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveParticipant(idx)}
                        className="ml-1 text-emerald-500 hover:text-emerald-800"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add another member (e.g., User B, Alex)"
                  value={newParticipantInput}
                  onChange={(e) => setNewParticipantInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddParticipant();
                    }
                  }}
                  className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-500 focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleAddParticipant}
                  className="rounded-xl bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 active:scale-98 transition disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Creating Trip...' : 'Create Destination & Start'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* TAB 2: JOIN BY CODE */}
        {tab === 'join' && (
          <form onSubmit={handleJoin} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Enter Small Unique Trip Code
              </label>
              <div className="relative">
                <Share2 className="pointer-events-none absolute left-3 top-3 w-4 h-4 text-emerald-600" />
                <input
                  type="text"
                  required
                  placeholder="e.g. 7K9M2P"
                  value={tripCodeInput}
                  onChange={(e) => setTripCodeInput(e.target.value.toUpperCase())}
                  className="w-full font-mono font-bold tracking-wider rounded-xl border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                Enter the 6-character code created by another participant on their device to sync trip expenses in real time.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 active:scale-98 transition disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Connecting...' : 'Join Trip & Sync'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* TAB 3: RECENT TRIPS */}
        {tab === 'recent' && (
          <div className="mt-4 max-h-72 overflow-y-auto space-y-2">
            {recentTrips.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No saved trips yet. Create your first destination!
              </div>
            ) : (
              recentTrips.map((trip) => {
                const isCurrent = activeTrip?.id === trip.id;
                return (
                  <div
                    key={trip.id}
                    onClick={() => {
                      onSelectTrip(trip.id);
                      onClose();
                    }}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition ${
                      isCurrent
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-gray-900 text-sm">{trip.destination}</h4>
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Code: {trip.code || getCleanSixDigitTripCode(trip.id)}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            trip.status === 'ended'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {trip.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1 font-mono text-[11px] text-gray-700">
                          <Calendar className="w-3 h-3 text-emerald-600" />
                          {formatDateDDMMYYYY(trip.startDate)} &rarr; {formatDateDDMMYYYY(trip.endDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {trip.participants?.length || 1} people
                        </span>
                        {trip.budget ? (
                          <span className="font-medium text-gray-700">
                            Budget: {trip.currency}
                            {trip.budget}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTrip(trip.id);
                          onClose();
                        }}
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition ${
                          isCurrent
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {isCurrent ? 'Active' : 'Open'}
                      </button>
                      {onDeleteTrip && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete trip "${trip.destination}" permanently?`)) {
                              await onDeleteTrip(trip.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Delete trip"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
