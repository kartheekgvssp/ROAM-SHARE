import React, { useState, useEffect } from 'react';
import { Expense, ExpenseCategory, Trip } from '../types';
import { DatePickerInput } from './DatePickerInput';
import { ReceiptScannerModal, ScannedReceiptData } from './ReceiptScannerModal';
import {
  Utensils,
  Car,
  Home,
  Compass,
  ShoppingBag,
  MoreHorizontal,
  X,
  Plus,
  Users,
  FileText,
  Camera,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip;
  currentUserName: string;
  onSaveExpense: (
    expenseData: Omit<Expense, 'id' | 'createdAt' | 'tripId' | 'syncedToSheet'>
  ) => Promise<void>;
  editingExpense?: Expense | null;
  initialScannedData?: ScannedReceiptData | null;
}

const CATEGORIES: { label: ExpenseCategory; icon: React.ElementType }[] = [
  { label: 'Food', icon: Utensils },
  { label: 'Transport', icon: Car },
  { label: 'Lodging', icon: Home },
  { label: 'Activities', icon: Compass },
  { label: 'Shopping', icon: ShoppingBag },
  { label: 'Misc', icon: MoreHorizontal },
];

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  onClose,
  trip,
  currentUserName,
  onSaveExpense,
  editingExpense,
  initialScannedData,
}) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Food');
  const [paidBy, setPaidBy] = useState(currentUserName);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [splitWith, setSplitWith] = useState<string[]>(trip.participants || []);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Scanner modal state & OCR feedback
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [ocrSuccessNotice, setOcrSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    if (editingExpense) {
      setDescription(editingExpense.description);
      setAmount(editingExpense.amount.toString());
      setCategory(editingExpense.category);
      setPaidBy(editingExpense.paidBy);
      setDate(editingExpense.date);
      setSplitWith(editingExpense.splitWith || trip.participants);
      setNotes(editingExpense.notes || '');
      setOcrSuccessNotice(null);
    } else if (initialScannedData) {
      setDescription(initialScannedData.description);
      setAmount(initialScannedData.amount.toString());
      setCategory(initialScannedData.category);
      setPaidBy(trip.participants.includes(currentUserName) ? currentUserName : trip.participants[0]);
      setDate(initialScannedData.date);
      setSplitWith(trip.participants);
      setNotes(initialScannedData.notes || '');
      setOcrSuccessNotice(
        `Receipt scanned: ${initialScannedData.description} (${trip.currency}${initialScannedData.amount.toFixed(2)})`
      );
    } else {
      setDescription('');
      setAmount('');
      setCategory('Food');
      setPaidBy(trip.participants.includes(currentUserName) ? currentUserName : trip.participants[0]);
      setDate(new Date().toISOString().split('T')[0]);
      setSplitWith(trip.participants);
      setNotes('');
      setOcrSuccessNotice(null);
    }
  }, [editingExpense, initialScannedData, isOpen, trip, currentUserName]);

  if (!isOpen) return null;

  const handleReceiptScanned = (scanned: ScannedReceiptData) => {
    setAmount(scanned.amount > 0 ? scanned.amount.toFixed(2) : '');
    setDescription(scanned.description);
    setDate(scanned.date);
    setCategory(scanned.category);
    if (scanned.notes) {
      setNotes(scanned.notes);
    }
    setOcrSuccessNotice(
      `Extracted: ${scanned.description} - ${trip.currency}${scanned.amount.toFixed(2)}`
    );
    setError(null);
  };

  const handleToggleSplit = (participant: string) => {
    if (splitWith.includes(participant)) {
      if (splitWith.length === 1) return; // Keep at least one person sharing
      setSplitWith(splitWith.filter((p) => p !== participant));
    } else {
      setSplitWith([...splitWith, participant]);
    }
  };

  const handleSelectAllSplit = () => {
    setSplitWith([...trip.participants]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!description.trim()) {
      setError('Please enter a description for the expense');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }
    if (splitWith.length === 0) {
      setError('Select at least one participant sharing the bill');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSaveExpense({
        description: description.trim(),
        amount: parsedAmount,
        category,
        paidBy,
        date,
        splitWith,
        notes: notes.trim() ? notes.trim() : '',
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-gray-950/80 backdrop-blur-xs animate-fadeIn overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh] h-auto my-auto overflow-hidden border border-gray-100">
          {/* Sticky Header with Always-Visible High-Contrast Close Button */}
          <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white z-20">
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-gray-900 truncate">
                  {editingExpense ? 'Edit Expense' : 'Add New Expense'}
                </h2>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {trip.destination}
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate">Record item &amp; who shares the cost</p>
            </div>

            {/* High-Contrast Touch-Friendly Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0 border border-gray-200 shadow-2xs"
              title="Close form"
              aria-label="Close"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Form wrapper */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
              {/* Quick AI OCR Camera Scan Banner Button */}
              {!editingExpense && (
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-700/20 active:scale-98 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div className="text-left min-w-0">
                      <div className="text-xs font-black tracking-wide flex items-center gap-1.5">
                        <span>Scan Receipt with Camera</span>
                        <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse shrink-0" />
                      </div>
                      <div className="text-[11px] text-emerald-100 font-medium truncate">
                        Auto-fill amount, merchant, date &amp; category
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold bg-white/20 px-2.5 py-1 rounded-xl shrink-0">
                    Scan &rarr;
                  </span>
                </button>
              )}

              {/* OCR Auto-Populated Success Feedback Banner */}
              {ocrSuccessNotice && (
                <div className="flex items-center justify-between gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-900 animate-fadeIn">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate font-semibold">{ocrSuccessNotice}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOcrSuccessNotice(null)}
                    className="text-emerald-700 hover:text-emerald-900 text-xs font-bold shrink-0 cursor-pointer"
                  >
                    &times;
                  </button>
                </div>
              )}

              {error && (
                <div className="rounded-2xl bg-red-50 p-2.5 text-xs text-red-600 border border-red-100 font-semibold">
                  {error}
                </div>
              )}

              {/* Amount and Currency */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Amount ({trip.currency}) *
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-2.5 text-lg font-black text-emerald-600 font-mono">
                    {trip.currency}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 py-2.5 pl-12 pr-3 text-xl font-black text-gray-900 focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 transition font-mono bg-white"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Description / Merchant *
                </label>
                <div className="relative">
                  <FileText className="pointer-events-none absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dinner, Taxi, Hotel, Grocery"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm text-gray-900 focus:border-emerald-500 focus:outline-hidden transition bg-white"
                  />
                </div>
              </div>

              {/* Category Chips */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.label;
                    return (
                      <button
                        key={cat.label}
                        type="button"
                        onClick={() => setCategory(cat.label)}
                        className={`flex flex-col items-center justify-center p-2 rounded-2xl border text-xs font-medium transition cursor-pointer ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-500/20 shadow-2xs'
                            : 'border-gray-200/90 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-4 h-4 mb-1" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payer and Date in 2-Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Paid By
                  </label>
                  <select
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 py-2.5 px-3 text-sm text-gray-900 font-bold focus:border-emerald-500 focus:outline-hidden bg-white cursor-pointer"
                  >
                    {trip.participants.map((p) => (
                      <option key={p} value={p}>
                        {p} {p === currentUserName ? '(You)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <DatePickerInput
                    value={date}
                    onChange={setDate}
                    label="Expense Date"
                  />
                </div>
              </div>

              {/* Split With Participants */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Split With ({splitWith.length} of {trip.participants.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllSplit}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-bold cursor-pointer"
                  >
                    Select All
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 p-2 rounded-2xl bg-gray-50 border border-gray-100">
                  {trip.participants.map((p) => {
                    const isChecked = splitWith.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleToggleSplit(p)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          isChecked
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <Users className="w-3 h-3" />
                        <span>{p}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1 text-[11px] text-gray-400">
                  Cost per person: {trip.currency}
                  {amount && !isNaN(parseFloat(amount)) && splitWith.length > 0
                    ? (parseFloat(amount) / splitWith.length).toFixed(2)
                    : '0.00'}
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Notes &amp; Details (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Receipt items, tax/tip, or payment method"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 py-2.5 px-3 text-sm text-gray-900 focus:border-emerald-500 focus:outline-hidden transition bg-white"
                />
              </div>
            </div>

            {/* Pinned Sticky Footer Actions */}
            <div className="p-3 sm:px-6 sm:py-3.5 bg-gray-50 border-t border-gray-100 shrink-0 z-20 flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="py-3 px-4 rounded-2xl border border-gray-300 bg-white hover:bg-gray-100 active:bg-gray-200 text-xs sm:text-sm font-bold text-gray-700 transition cursor-pointer shrink-0 shadow-2xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 py-3 text-sm font-black text-white shadow-md shadow-emerald-700/20 transition disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>
                  {isSubmitting
                    ? 'Saving...'
                    : editingExpense
                    ? 'Update Expense'
                    : 'Save Expense Record'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Camera OCR Receipt Scanner Modal */}
      <ReceiptScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        currency={trip.currency}
        onReceiptScanned={handleReceiptScanned}
      />
    </>
  );
};
