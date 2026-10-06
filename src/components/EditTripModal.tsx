import React, { useState, useEffect } from 'react';
import { Trip, Expense } from '../types';
import { DatePickerInput } from './DatePickerInput';
import { getCleanSixDigitTripCode } from '../lib/dateUtils';
import {
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertTriangle,
  Settings,
} from 'lucide-react';

interface EditTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  expenses: Expense[];
  onUpdateTrip: (updatedTrip: Trip) => Promise<void>;
  onRenameParticipant: (oldName: string, newName: string) => Promise<void>;
  onDeleteTrip: (tripId: string) => Promise<void>;
}

export const EditTripModal: React.FC<EditTripModalProps> = ({
  isOpen,
  onClose,
  trip,
  expenses,
  onUpdateTrip,
  onRenameParticipant,
  onDeleteTrip,
}) => {
  const [destination, setDestination] = useState(trip.destination);
  const [startDate, setStartDate] = useState(trip.startDate);
  const [endDate, setEndDate] = useState(trip.endDate);
  const [currency, setCurrency] = useState(trip.currency);
  const [budget, setBudget] = useState(trip.budget ? trip.budget.toString() : '');
  const [participants, setParticipants] = useState<string[]>([...trip.participants]);
  const [newParticipant, setNewParticipant] = useState('');

  // Inline editing of participant name
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editNameVal, setEditNameVal] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDestination(trip.destination);
      setStartDate(trip.startDate);
      setEndDate(trip.endDate);
      setCurrency(trip.currency);
      setBudget(trip.budget ? trip.budget.toString() : '');
      setParticipants([...trip.participants]);
      setEditingIdx(null);
      setError(null);
      setShowDeleteConfirm(false);
    }
  }, [isOpen, trip]);

  if (!isOpen) return null;

  // Add Participant
  const handleAddParticipant = () => {
    const trimmed = newParticipant.trim();
    if (!trimmed) return;
    if (participants.map((p) => p.toLowerCase()).includes(trimmed.toLowerCase())) {
      setError(`Participant "${trimmed}" already exists.`);
      return;
    }
    setParticipants([...participants, trimmed]);
    setNewParticipant('');
    setError(null);
  };

  // Remove Participant
  const handleRemoveParticipant = (index: number) => {
    const person = participants[index];
    if (participants.length <= 1) {
      setError('A trip must have at least one participant.');
      return;
    }

    // Check if this person has logged expenses
    const paidCount = expenses.filter((e) => e.paidBy === person).length;
    if (paidCount > 0) {
      const confirmRemove = window.confirm(
        `"${person}" has logged ${paidCount} expense(s). Removing them will keep their past expenses on record, but remove them from future splits. Proceed?`
      );
      if (!confirmRemove) return;
    }

    setParticipants(participants.filter((_, i) => i !== index));
    setError(null);
  };

  // Save Inline Rename
  const handleSaveRename = async (index: number) => {
    const oldName = participants[index];
    const newName = editNameVal.trim();
    if (!newName || newName === oldName) {
      setEditingIdx(null);
      return;
    }
    if (
      participants
        .filter((_, i) => i !== index)
        .map((p) => p.toLowerCase())
        .includes(newName.toLowerCase())
    ) {
      setError(`Participant "${newName}" already exists.`);
      return;
    }

    const updated = [...participants];
    updated[index] = newName;
    setParticipants(updated);
    setEditingIdx(null);
    setError(null);

    // Trigger rename across expenses if needed
    await onRenameParticipant(oldName, newName);
  };

  // Save Trip Details
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) {
      setError('Please provide a destination name');
      return;
    }
    if (participants.length === 0) {
      setError('At least one participant is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const updatedTrip: Trip = {
        ...trip,
        destination: destination.trim(),
        startDate,
        endDate,
        currency,
        budget: budget ? parseFloat(budget) : 0,
        participants,
        updatedAt: new Date().toISOString(),
      };
      await onUpdateTrip(updatedTrip);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update trip details');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 sm:p-6 shadow-2xl my-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">Trip &amp; Participant Settings</h2>
                <button
                  type="button"
                  onClick={() => {
                    const code = trip.code || getCleanSixDigitTripCode(trip.id);
                    navigator.clipboard.writeText(code);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="font-mono text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 transition cursor-pointer"
                  title="Click to copy 6-digit Trip Code"
                >
                  {copiedCode ? 'Copied!' : `Code: ${trip.code || getCleanSixDigitTripCode(trip.id)} 📋`}
                </button>
              </div>
              <p className="text-xs text-gray-500">Edit destination, dates, currency, and members</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-red-50 p-2.5 text-xs text-red-600 border border-red-100 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Destination */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Trip Destination
            </label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                required
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Tokyo, Goa, Paris"
                className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Dates */}
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

          {/* Currency & Budget */}
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
                  placeholder="e.g. 2500"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Participant Management (Add, Edit, Delete) */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Trip Participants ({participants.length})
              </label>
              <span className="text-[11px] text-gray-500">Add, rename or remove members</span>
            </div>

            {/* List of current participants */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {participants.map((person, idx) => {
                const paidCount = expenses.filter((e) => e.paidBy === person).length;
                const isEditing = editingIdx === idx;

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-200"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 flex-1 mr-2">
                        <input
                          type="text"
                          value={editNameVal}
                          onChange={(e) => setEditNameVal(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveRename(idx);
                            } else if (e.key === 'Escape') {
                              setEditingIdx(null);
                            }
                          }}
                          className="w-full rounded-lg border border-emerald-500 bg-white px-2 py-1 text-xs text-gray-900 focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRename(idx)}
                          className="p-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                          title="Save name"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingIdx(null)}
                          className="p-1 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                          {person.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-gray-900 text-xs sm:text-sm">
                          {person}
                        </span>
                        {paidCount > 0 && (
                          <span className="text-[10px] text-gray-500 bg-gray-200/80 px-1.5 py-0.5 rounded-md">
                            {paidCount} {paidCount === 1 ? 'expense' : 'expenses'}
                          </span>
                        )}
                      </div>
                    )}

                    {!isEditing && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingIdx(idx);
                            setEditNameVal(person);
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition"
                          title="Rename participant"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {participants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveParticipant(idx)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Remove participant"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add new participant input */}
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                placeholder="Enter new member name (e.g. User C, Alex)"
                value={newParticipant}
                onChange={(e) => setNewParticipant(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddParticipant();
                  }
                }}
                className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-xs sm:text-sm text-gray-900 focus:border-emerald-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleAddParticipant}
                className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Member</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-gray-100 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 rounded-xl border border-gray-300 py-2.5 text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-emerald-700 active:scale-98 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Saving Changes...' : 'Save Trip & Participants'}
            </button>
          </div>
        </form>

        {/* Delete Trip Section */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          {!showDeleteConfirm ? (
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-gray-800">Delete Trip</h4>
                <p className="text-[11px] text-gray-500">Permanently remove this destination</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
              >
                Delete Trip...
              </button>
            </div>
          ) : (
            <div className="rounded-xl bg-red-50 p-3.5 border border-red-200">
              <h4 className="text-xs font-bold text-red-900">Are you sure?</h4>
              <p className="text-xs text-red-700 mt-1">
                This will delete &ldquo;{trip.destination}&rdquo; and all its {expenses.length} expense records.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onDeleteTrip(trip.id);
                    onClose();
                  }}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                >
                  Yes, Delete Trip
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
