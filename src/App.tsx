import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Trip,
  Expense,
  UserProfile,
  TripSettlement,
} from './types';
import {
  db,
  initAuth,
  googleSignIn,
  getAccessToken,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection,
  sanitizePayload,
} from './lib/firebase';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc,
  getDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import {
  getUserProfile,
  saveUserProfile,
  getActiveTripId,
  setActiveTripId,
  getAllCachedTrips,
  cacheTripLocally,
  cacheExpensesLocally,
  getCachedExpenses,
  getCachedTrip,
  getOfflineExpenseQueue,
  clearOfflineExpenseQueue,
  queueOfflineExpense,
} from './lib/storage';
import { calculateTripSettlement } from './lib/settlement';
import { syncTripToGoogleSheets } from './lib/googleSheets';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { generateShortTripCode, formatDateDDMMYYYY, getCleanSixDigitTripCode } from './lib/dateUtils';

import { Header } from './components/Header';
import { UserNameModal } from './components/UserNameModal';
import { TripSelectorModal } from './components/TripSelectorModal';
import { ExpenseFormModal } from './components/ExpenseFormModal';
import { ExpenseList } from './components/ExpenseList';
import { BudgetCharts } from './components/BudgetCharts';
import { SettlementModal } from './components/SettlementModal';
import { GoogleSheetsSyncCard } from './components/GoogleSheetsSyncCard';
import { EditTripModal } from './components/EditTripModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ReceiptScannerModal, ScannedReceiptData } from './components/ReceiptScannerModal';
import { PhoneShareModal } from './components/PhoneShareModal';

import {
  Plus,
  Compass,
  PieChart,
  Receipt,
  Users,
  CheckCircle2,
  Calendar,
  DollarSign,
  AlertCircle,
  FileSpreadsheet,
  Settings,
  Edit2,
  UserPlus,
  ArrowRight,
  Camera,
} from 'lucide-react';

export default function App() {
  const isOnline = useOnlineStatus();

  // User State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getUserProfile());
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(() => !getUserProfile());

  // Trip State
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [recentTrips, setRecentTrips] = useState<Trip[]>(() => getAllCachedTrips());

  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<'expenses' | 'analytics' | 'summary'>('expenses');
  const [isTripSelectorOpen, setIsTripSelectorOpen] = useState(false);
  const [isEditTripOpen, setIsEditTripOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isReceiptScannerOpen, setIsReceiptScannerOpen] = useState(false);
  const [scannedReceiptData, setScannedReceiptData] = useState<ScannedReceiptData | null>(null);
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [isPhoneShareOpen, setIsPhoneShareOpen] = useState(false);

  // Google Integration State
  const [hasGoogleToken, setHasGoogleToken] = useState<boolean>(() => !!getAccessToken());
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [autoSyncSheets, setAutoSyncSheets] = useState<boolean>(() => {
    return localStorage.getItem('tripsync_autosync') !== 'false';
  });
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // 1. Initialize Auth and test Firestore connection on mount
  useEffect(() => {
    testFirestoreConnection();

    initAuth(
      (user, token) => {
        if (token) setHasGoogleToken(true);
        if (user) {
          const profile: UserProfile = {
            name: user.displayName || user.email?.split('@')[0] || 'User',
            email: user.email || undefined,
            photoURL: user.photoURL || undefined,
            uid: user.uid,
            isGoogleUser: true,
          };
          saveUserProfile(profile);
          setCurrentUser(profile);
        }
      },
      () => {
        setHasGoogleToken(false);
      }
    );
  }, []);

  // 2. Load Initial Trip (check URL param ?trip=ID or localStorage)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paramTripId = params.get('trip');
    const targetTripId = paramTripId || getActiveTripId();

    if (targetTripId) {
      // Check cache first for instant UI response
      const cached = getCachedTrip(targetTripId);
      if (cached) {
        if (!cached.code) cached.code = getCleanSixDigitTripCode(cached.id);
        setActiveTrip(cached);
        const cachedExps = getCachedExpenses(targetTripId);
        if (cachedExps.length > 0) setExpenses(cachedExps);
      }
      loadTripFromFirestore(targetTripId);
    } else {
      // If no trips exist, check all cached trips
      const allCached = getAllCachedTrips();
      if (allCached.length > 0) {
        const first = allCached[0];
        if (!first.code) first.code = getCleanSixDigitTripCode(first.id);
        setActiveTrip(first);
        setActiveTripId(first.id);
      }
    }
  }, []);

  // 3. Real-time Firestore snapshot listener for Active Trip & its Expenses
  useEffect(() => {
    if (!activeTrip?.id) return;

    const tripId = activeTrip.id;

    // Listen to Trip Document
    const tripDocRef = doc(db, 'trips', tripId);
    const unsubTrip = onSnapshot(
      tripDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Trip;
          const updatedTrip = {
            ...data,
            id: snapshot.id,
            code: data.code || getCleanSixDigitTripCode(snapshot.id),
          };
          setActiveTrip(updatedTrip);
          cacheTripLocally(updatedTrip);
          setRecentTrips(getAllCachedTrips());
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `trips/${tripId}`);
      }
    );

    // Listen to Expenses Subcollection
    const expensesColRef = collection(db, 'trips', tripId, 'expenses');
    const unsubExpenses = onSnapshot(
      expensesColRef,
      (snapshot) => {
        const loaded: Expense[] = [];
        snapshot.forEach((d) => {
          loaded.push({ ...(d.data() as Expense), id: d.id });
        });
        setExpenses(loaded);
        cacheExpensesLocally(tripId, loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `trips/${tripId}/expenses`);
      }
    );

    return () => {
      unsubTrip();
      unsubExpenses();
    };
  }, [activeTrip?.id]);

  // 4. Sync offline queue when coming back online
  useEffect(() => {
    if (isOnline && activeTrip?.id) {
      const queue = getOfflineExpenseQueue();
      if (queue.length > 0) {
        queue.forEach(async (exp) => {
          try {
            await setDoc(doc(db, 'trips', exp.tripId, 'expenses', exp.id), exp);
          } catch (e) {
            console.error('Failed to sync queued expense:', e);
          }
        });
        clearOfflineExpenseQueue();
      }
    }
  }, [isOnline, activeTrip?.id]);

  // Calculate current settlement
  const currentSettlement = useMemo<TripSettlement>(() => {
    const participants = activeTrip?.participants || [currentUser?.name || 'User A'];
    return calculateTripSettlement(participants, expenses);
  }, [activeTrip?.participants, currentUser?.name, expenses]);

  // Load trip by ID
  const loadTripFromFirestore = async (tripId: string) => {
    try {
      const docSnap = await getDoc(doc(db, 'trips', tripId));
      if (docSnap.exists()) {
        const tripData = { ...(docSnap.data() as Trip), id: docSnap.id };
        if (!tripData.code) {
          tripData.code = getCleanSixDigitTripCode(tripData.id);
        }
        setActiveTrip(tripData);
        setActiveTripId(tripData.id);
        cacheTripLocally(tripData);
        setRecentTrips(getAllCachedTrips());
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to load trip from Firestore:', err);
      return false;
    }
  };

  // Join trip by 6-digit alphanumeric code
  const handleJoinTripByCode = async (rawCode: string): Promise<boolean> => {
    const cleanCode = rawCode.trim().toUpperCase();
    if (!cleanCode) return false;

    // 1. Check local cache first
    const cachedTrips = getAllCachedTrips();
    const matchedLocal = cachedTrips.find(
      (t) =>
        t.id.toUpperCase() === cleanCode ||
        (t.code && t.code.toUpperCase() === cleanCode) ||
        getCleanSixDigitTripCode(t.id).toUpperCase() === cleanCode
    );
    if (matchedLocal) {
      if (!matchedLocal.code) matchedLocal.code = getCleanSixDigitTripCode(matchedLocal.id);
      setActiveTrip(matchedLocal);
      setActiveTripId(matchedLocal.id);
      setExpenses(getCachedExpenses(matchedLocal.id));
      return true;
    }

    // 2. Try direct Firestore document lookup by ID
    const loaded = await loadTripFromFirestore(cleanCode);
    if (loaded) return true;

    // 3. Try querying Firestore where code == cleanCode
    try {
      const q = query(collection(db, 'trips'), where('code', '==', cleanCode));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        const docSnap = querySnap.docs[0];
        const tripData = { ...(docSnap.data() as Trip), id: docSnap.id };
        if (!tripData.code) tripData.code = cleanCode;
        setActiveTrip(tripData);
        setActiveTripId(tripData.id);
        cacheTripLocally(tripData);
        setRecentTrips(getAllCachedTrips());
        return true;
      }
    } catch (err) {
      console.warn('Query by code in Firestore failed:', err);
    }

    return false;
  };

  // Create new Trip with clean 6-digit alphanumeric code
  const handleCreateTrip = async (newTripData: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Generate clean, short, unique 6-character trip code (e.g. 7K9M2P)
    const tripCode = generateShortTripCode();
    const now = new Date().toISOString();

    const trip: Trip = {
      ...newTripData,
      id: tripCode,
      code: tripCode,
      createdAt: now,
      updatedAt: now,
    };

    // Update local immediately
    setActiveTrip(trip);
    setActiveTripId(trip.id);
    cacheTripLocally(trip);
    setRecentTrips(getAllCachedTrips());
    setExpenses([]);

    // Save to Firestore with clean 6-digit trip code
    try {
      await setDoc(doc(db, 'trips', tripCode), sanitizePayload(trip as unknown as Record<string, unknown>));
    } catch (error) {
      console.warn('Firestore trip write warning, cached locally:', error);
    }
  };

  // Save / Update Expense
  const handleSaveExpense = async (
    expenseData: Omit<Expense, 'id' | 'createdAt' | 'tripId' | 'syncedToSheet'>
  ) => {
    if (!activeTrip) return;

    const expenseId = editingExpense
      ? editingExpense.id
      : `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newExpense: Expense = {
      ...expenseData,
      id: expenseId,
      tripId: activeTrip.id,
      notes: expenseData.notes || '',
      createdAt: editingExpense ? editingExpense.createdAt : now,
      updatedAt: now,
      syncedToSheet: false,
    };

    // Optimistic local update
    const updatedExpenses = editingExpense
      ? expenses.map((e) => (e.id === expenseId ? newExpense : e))
      : [newExpense, ...expenses];

    setExpenses(updatedExpenses);
    cacheExpensesLocally(activeTrip.id, updatedExpenses);
    setEditingExpense(null);

    // 1. Ensure parent trip document exists in Firestore
    try {
      await setDoc(
        doc(db, 'trips', activeTrip.id),
        sanitizePayload(activeTrip as unknown as Record<string, unknown>),
        { merge: true }
      );
    } catch (err) {
      console.warn('Could not sync parent trip doc to Firestore:', err);
    }

    // 2. Save expense to Firestore
    const cleanPayload = sanitizePayload(newExpense as unknown as Record<string, unknown>);
    try {
      await setDoc(doc(db, 'trips', activeTrip.id, 'expenses', expenseId), cleanPayload);
    } catch (error) {
      console.warn('Could not write expense directly to Firestore, queued for offline sync:', error);
      queueOfflineExpense(newExpense);
    }

    // Auto-sync to Google Sheets if token present & autosync enabled
    const token = getAccessToken();
    if (autoSyncSheets && token) {
      try {
        const settlement = calculateTripSettlement(activeTrip.participants, updatedExpenses);
        await syncTripToGoogleSheets(token, activeTrip, updatedExpenses, settlement);
      } catch (e) {
        console.warn('Auto-sync to sheets skipped or failed:', e);
      }
    }
  };

  // Delete Expense
  const handleDeleteExpense = async (expenseId: string) => {
    if (!activeTrip) return;

    const updated = expenses.filter((e) => e.id !== expenseId);
    setExpenses(updated);
    cacheExpensesLocally(activeTrip.id, updated);

    try {
      await deleteDoc(doc(db, 'trips', activeTrip.id, 'expenses', expenseId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `trips/${activeTrip.id}/expenses/${expenseId}`);
    }
  };

  // Sync to Google Sheets
  const handleSyncToSheets = useCallback(async () => {
    if (!activeTrip) return;

    const token = getAccessToken();
    if (!token) {
      // Prompt Google Sign in
      const res = await googleSignIn();
      if (!res?.accessToken) return;
      setHasGoogleToken(true);
    }

    const currentToken = getAccessToken();
    if (!currentToken) return;

    try {
      setIsSyncingSheets(true);
      setSyncFeedback(null);
      const result = await syncTripToGoogleSheets(
        currentToken,
        activeTrip,
        expenses,
        currentSettlement
      );

      // Update trip document with sheetId & sheetUrl
      const updatedTrip: Trip = {
        ...activeTrip,
        sheetId: result.spreadsheetId,
        sheetUrl: result.spreadsheetUrl,
        lastSyncedAt: result.syncedAt,
        updatedAt: new Date().toISOString(),
      };

      setActiveTrip(updatedTrip);
      cacheTripLocally(updatedTrip);

      try {
        await updateDoc(doc(db, 'trips', activeTrip.id), {
          sheetId: result.spreadsheetId,
          sheetUrl: result.spreadsheetUrl,
          lastSyncedAt: result.syncedAt,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Could not update sheet ID in Firestore:', err);
      }

      setSyncFeedback(`Successfully synced ${result.syncedExpensesCount} expenses to Google Sheets!`);
      setTimeout(() => setSyncFeedback(null), 5000);
    } catch (err: unknown) {
      console.error('Google Sheets sync error:', err);
      alert(err instanceof Error ? err.message : 'Google Sheets sync failed.');
    } finally {
      setIsSyncingSheets(false);
    }
  }, [activeTrip, expenses, currentSettlement]);

  // End Trip Officially
  const handleEndTrip = async () => {
    if (!activeTrip) return;
    const now = new Date().toISOString();
    const tripCode = activeTrip.code || getCleanSixDigitTripCode(activeTrip.id);
    const updated: Trip = {
      ...activeTrip,
      id: activeTrip.id,
      code: tripCode,
      status: 'ended',
      settlement: currentSettlement,
      updatedAt: now,
    };
    setActiveTrip(updated);
    cacheTripLocally(updated);
    setRecentTrips(getAllCachedTrips());
    setSyncFeedback('Trip officially concluded! Settlement is finalized. 🎉');
    setTimeout(() => setSyncFeedback(null), 4000);

    try {
      await setDoc(
        doc(db, 'trips', activeTrip.id),
        sanitizePayload(updated as unknown as Record<string, unknown>),
        { merge: true }
      );
    } catch (err) {
      console.warn('Failed to update trip status in Firestore:', err);
    }

    // Also push to Google Sheets if token exists
    const token = getAccessToken();
    if (token) {
      syncTripToGoogleSheets(token, updated, expenses, currentSettlement).catch(() => null);
    }
  };

  // Reopen Trip
  const handleReopenTrip = async () => {
    if (!activeTrip) return;
    const now = new Date().toISOString();
    const tripCode = activeTrip.code || getCleanSixDigitTripCode(activeTrip.id);
    const updated: Trip = {
      ...activeTrip,
      id: activeTrip.id,
      code: tripCode,
      status: 'active',
      updatedAt: now,
    };
    setActiveTrip(updated);
    cacheTripLocally(updated);
    setRecentTrips(getAllCachedTrips());
    setSyncFeedback('Trip reopened! You can continue adding expenses.');
    setTimeout(() => setSyncFeedback(null), 4000);

    try {
      await setDoc(
        doc(db, 'trips', activeTrip.id),
        sanitizePayload(updated as unknown as Record<string, unknown>),
        { merge: true }
      );
    } catch (err) {
      console.warn('Failed to reopen trip in Firestore:', err);
    }
  };

  // Update Trip Details and Participants
  const handleUpdateTrip = async (updatedTrip: Trip) => {
    setActiveTrip(updatedTrip);
    cacheTripLocally(updatedTrip);
    setRecentTrips(getAllCachedTrips());

    try {
      await setDoc(
        doc(db, 'trips', updatedTrip.id),
        sanitizePayload(updatedTrip as unknown as Record<string, unknown>),
        { merge: true }
      );
    } catch (err) {
      console.warn('Could not update trip in Firestore:', err);
    }

    // Auto-sync to Google Sheets if token present
    const token = getAccessToken();
    if (autoSyncSheets && token) {
      try {
        const settlement = calculateTripSettlement(updatedTrip.participants, expenses);
        await syncTripToGoogleSheets(token, updatedTrip, expenses, settlement);
      } catch (e) {
        console.warn('Auto-sync to sheets skipped:', e);
      }
    }
  };

  // Rename a participant across the trip and all logged expenses
  const handleRenameParticipant = async (oldName: string, newName: string) => {
    if (!activeTrip) return;

    // 1. Update trip participants
    const updatedParticipants = activeTrip.participants.map((p) => (p === oldName ? newName : p));
    const updatedTrip: Trip = {
      ...activeTrip,
      participants: updatedParticipants,
      updatedAt: new Date().toISOString(),
    };
    setActiveTrip(updatedTrip);
    cacheTripLocally(updatedTrip);

    // 2. Update existing expenses
    const updatedExpenses = expenses.map((exp) => {
      let changed = false;
      let newPaidBy = exp.paidBy;
      if (exp.paidBy === oldName) {
        newPaidBy = newName;
        changed = true;
      }
      let newSplit = exp.splitWith;
      if (exp.splitWith && exp.splitWith.includes(oldName)) {
        newSplit = exp.splitWith.map((p) => (p === oldName ? newName : p));
        changed = true;
      }
      if (changed) {
        const updatedExp = {
          ...exp,
          paidBy: newPaidBy,
          splitWith: newSplit,
          updatedAt: new Date().toISOString(),
        };
        // Sync to Firestore
        setDoc(
          doc(db, 'trips', activeTrip.id, 'expenses', exp.id),
          sanitizePayload(updatedExp as unknown as Record<string, unknown>),
          { merge: true }
        ).catch(() => null);
        return updatedExp;
      }
      return exp;
    });

    setExpenses(updatedExpenses);
    cacheExpensesLocally(activeTrip.id, updatedExpenses);

    // Sync trip to Firestore
    try {
      await setDoc(
        doc(db, 'trips', activeTrip.id),
        sanitizePayload(updatedTrip as unknown as Record<string, unknown>),
        { merge: true }
      );
    } catch (err) {
      console.warn('Could not rename participant in Firestore:', err);
    }
  };

  // Delete Trip
  const handleDeleteTrip = async (tripId: string) => {
    try {
      await deleteDoc(doc(db, 'trips', tripId));
    } catch (err) {
      console.warn('Could not delete trip in Firestore:', err);
    }

    // Remove from local cache
    const remaining = recentTrips.filter((t) => t.id !== tripId);
    setRecentTrips(remaining);
    localStorage.removeItem(`tripsync_expenses_${tripId}`);
    try {
      const raw = localStorage.getItem('tripsync_cached_trips');
      if (raw) {
        const tripsMap = JSON.parse(raw);
        delete tripsMap[tripId];
        localStorage.setItem('tripsync_cached_trips', JSON.stringify(tripsMap));
      }
    } catch (e) {
      console.warn(e);
    }

    if (remaining.length > 0) {
      setActiveTrip(remaining[0]);
      setActiveTripId(remaining[0].id);
      setExpenses(getCachedExpenses(remaining[0].id));
    } else {
      setActiveTrip(null);
      setExpenses([]);
    }
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    setAutoSyncSheets(enabled);
    localStorage.setItem('tripsync_autosync', enabled ? 'true' : 'false');
  };

  const handleConnectGoogle = async () => {
    try {
      const res = await googleSignIn();
      if (res?.accessToken) {
        setHasGoogleToken(true);
        if (res.user) {
          const p: UserProfile = {
            name: res.user.displayName || currentUser?.name || 'User',
            email: res.user.email || undefined,
            photoURL: res.user.photoURL || undefined,
            uid: res.user.uid,
            isGoogleUser: true,
          };
          saveUserProfile(p);
          setCurrentUser(p);
        }
      }
    } catch (err) {
      console.error('Google connect error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-gray-900 pb-20 sm:pb-12">
      {/* Offline Banner */}
      <OfflineIndicator />

      {/* Top Header */}
      <Header
        trip={activeTrip}
        currentUser={currentUser || { name: 'Guest' }}
        onOpenTripSelector={() => setIsTripSelectorOpen(true)}
        onOpenEditTrip={() => setIsEditTripOpen(true)}
        onOpenUserModal={() => setIsUserModalOpen(true)}
        onOpenSettlement={() => setIsSettlementOpen(true)}
        onOpenPhoneShare={() => setIsPhoneShareOpen(true)}
        isOnline={isOnline}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Sync Feedback Toast */}
        {syncFeedback && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500 text-white p-3 text-xs sm:text-sm font-semibold shadow-md animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="flex-1">{syncFeedback}</span>
            {activeTrip?.sheetUrl && (
              <a
                href={activeTrip.sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-emerald-100 text-xs"
              >
                View Sheet
              </a>
            )}
          </div>
        )}

        {/* If no trip selected, show Empty Trip Welcome Screen */}
        {!activeTrip ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-8 sm:p-12 text-center shadow-xs">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-md mb-4">
              <Compass className="w-8 h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">
              No Active Trip Destination
            </h2>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              Welcome {currentUser?.name}! Create your destination to track daily expenses, collaborate
              in real-time across devices, split bills, and sync with Google Sheets.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => setIsTripSelectorOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Trip Destination</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Extraordinary Trip Destination Hero Header */}
            <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-950 text-white p-5 sm:p-8 shadow-2xl border border-emerald-500/25 relative overflow-hidden backdrop-blur-xl">
              {/* Luminous aurora backdrop gradients */}
              <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />
              <div className="absolute -left-16 -bottom-16 w-80 h-80 rounded-full bg-teal-500/20 blur-3xl pointer-events-none" />
              <div className="absolute right-1/3 top-1/2 w-48 h-48 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />

              {/* Decorative flight path svg line with subtle constellation dots */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M -30,100 Q 180,-30 420,80 T 900,30"
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2.5"
                  strokeDasharray="6 8"
                />
                <circle cx="180" cy="40" r="3" fill="#6ee7b7" />
                <circle cx="420" cy="80" r="4" fill="#34d399" />
                <circle cx="680" cy="55" r="3" fill="#6ee7b7" />
              </svg>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                <div className="space-y-3.5 flex-1 min-w-0">
                  {/* Top tags row */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full border backdrop-blur-md ${
                        activeTrip.status === 'ended'
                          ? 'bg-amber-400/20 text-amber-300 border-amber-400/40 shadow-xs shadow-amber-500/10'
                          : 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40 shadow-xs shadow-emerald-500/10'
                      }`}
                    >
                      <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 bg-current animate-pulse" />
                      {activeTrip.status === 'ended' ? 'Trip Concluded' : 'Trip Active'}
                    </span>

                    {/* Small Unique 6-Digit Trip Code Badge with 1-click copy */}
                    {(() => {
                      const tripCode = activeTrip.code || getCleanSixDigitTripCode(activeTrip.id);
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(tripCode);
                            setSyncFeedback(`Trip Code "${tripCode}" copied to clipboard!`);
                            setTimeout(() => setSyncFeedback(null), 3000);
                          }}
                          className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono font-bold text-emerald-200 transition active:scale-95 cursor-pointer shadow-2xs group"
                          title="Click to copy unique 6-digit Trip Code"
                        >
                          <span className="text-[10px] text-gray-300 font-sans uppercase font-semibold">Code:</span>
                          <strong className="text-white tracking-widest font-black font-mono group-hover:text-emerald-300">
                            {tripCode}
                          </strong>
                          <span className="text-[10px] text-emerald-400 opacity-80 group-hover:opacity-100">📋</span>
                        </button>
                      );
                    })()}
                  </div>

                  {/* Destination Heading */}
                  <div className="flex items-center gap-3">
                    <h1 className="font-display text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md leading-tight">
                      {activeTrip.destination}
                    </h1>
                    <button
                      type="button"
                      onClick={() => setIsEditTripOpen(true)}
                      className="p-2 sm:p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-white backdrop-blur-md transition active:scale-95 cursor-pointer shadow-sm hover:border-emerald-400/50"
                      title="Edit Trip Details &amp; Participants"
                    >
                      <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300" />
                    </button>
                  </div>

                  {/* Date format in DD-MM-YYYY & Budget */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 backdrop-blur-md px-3 py-1.5 rounded-2xl text-emerald-100 font-mono shadow-2xs">
                      <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-bold tracking-wide">
                        {formatDateDDMMYYYY(activeTrip.startDate)} &rarr;{' '}
                        {formatDateDDMMYYYY(activeTrip.endDate)}
                      </span>
                    </div>

                    {activeTrip.budget ? (
                      <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 backdrop-blur-md px-3 py-1.5 rounded-2xl font-bold text-white shadow-2xs">
                        <DollarSign className="w-4 h-4 text-teal-300 shrink-0" />
                        <span>
                          Target: {activeTrip.currency}
                          {activeTrip.budget.toLocaleString()}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {/* Interactive Participant Badges */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {activeTrip.participants.map((person) => (
                      <span
                        key={person}
                        className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-emerald-100 transition"
                      >
                        <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-300 text-slate-950 flex items-center justify-center text-[10px] font-black">
                          {person.charAt(0).toUpperCase()}
                        </div>
                        <span>{person}</span>
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => setIsEditTripOpen(true)}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/40 px-3.5 py-1.5 rounded-full text-xs font-black text-white shadow-md shadow-emerald-700/30 transition active:scale-95 cursor-pointer"
                      title="Add, rename or delete participants"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>+ Add Member</span>
                    </button>
                  </div>
                </div>

                {/* Right Side: Total Expenditure Glass Card & Add Expense Action */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between border-t lg:border-t-0 border-white/15 pt-4 lg:pt-0 gap-4 shrink-0">
                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/15 text-left lg:text-right shadow-lg min-w-[200px]">
                    <div className="text-[10px] uppercase tracking-widest text-emerald-300 font-black">
                      Total Expenditure
                    </div>
                    <div className="font-display text-3xl sm:text-4xl font-black text-white mt-1 tracking-tight">
                      <span className="text-emerald-400 mr-1 text-2xl sm:text-3xl font-extrabold">
                        {activeTrip.currency}
                      </span>
                      {currentSettlement.totalSpent.toFixed(2)}
                    </div>
                    {activeTrip.budget ? (
                      <div className="mt-2 space-y-1">
                        <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300"
                            style={{
                              width: `${Math.min(
                                Math.round((currentSettlement.totalSpent / activeTrip.budget) * 100),
                                100
                              )}%`,
                            }}
                          />
                        </div>
                        <div className="text-[11px] text-emerald-200/90 font-medium">
                          {Math.round((currentSettlement.totalSpent / activeTrip.budget) * 100)}% of target budget
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setIsReceiptScannerOpen(true);
                      }}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-3.5 text-xs sm:text-sm font-extrabold backdrop-blur-md shadow-md active:scale-95 transition cursor-pointer"
                      title="Scan receipt with camera (AI OCR)"
                    >
                      <Camera className="w-4 h-4 text-emerald-300" />
                      <span>Scan Receipt</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingExpense(null);
                        setScannedReceiptData(null);
                        setIsExpenseModalOpen(true);
                      }}
                      className="flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 px-6 py-3.5 text-sm font-black shadow-xl shadow-emerald-500/25 hover:from-emerald-300 hover:to-teal-300 active:scale-95 transition cursor-pointer"
                    >
                      <Plus className="w-5 h-5 stroke-[3]" />
                      <span>Add Expense</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Google Sheets Integration Card */}
            <GoogleSheetsSyncCard
              trip={activeTrip}
              expenses={expenses}
              hasGoogleToken={hasGoogleToken}
              onConnectGoogle={handleConnectGoogle}
              onSyncToSheets={handleSyncToSheets}
              isSyncing={isSyncingSheets}
              autoSyncEnabled={autoSyncSheets}
              onToggleAutoSync={handleToggleAutoSync}
            />

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('expenses')}
                className={`flex items-center gap-1.5 py-3 px-4 border-b-2 font-bold text-xs sm:text-sm transition ${
                  activeTab === 'expenses'
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>Expenses ({expenses.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-1.5 py-3 px-4 border-b-2 font-bold text-xs sm:text-sm transition ${
                  activeTab === 'analytics'
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <PieChart className="w-4 h-4" />
                <span>Budget &amp; Trends</span>
              </button>

              <button
                onClick={() => setActiveTab('summary')}
                className={`flex items-center gap-1.5 py-3 px-4 border-b-2 font-bold text-xs sm:text-sm transition ${
                  activeTab === 'summary'
                    ? 'border-emerald-600 text-emerald-800'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Split &amp; Balances</span>
              </button>
            </div>

            {/* Tab 1: Expenses List */}
            {activeTab === 'expenses' && (
              <ExpenseList
                trip={activeTrip}
                expenses={expenses}
                currentUserName={currentUser?.name || ''}
                onEditExpense={(exp) => {
                  setEditingExpense(exp);
                  setIsExpenseModalOpen(true);
                }}
                onDeleteExpense={handleDeleteExpense}
              />
            )}

            {/* Tab 2: Visual Charts & Analytics */}
            {activeTab === 'analytics' && (
              <BudgetCharts trip={activeTrip} expenses={expenses} />
            )}

            {/* Tab 3: Balances & Quick Split (Perfect alignment on mobile and desktop) */}
            {activeTab === 'summary' && (
              <div className="space-y-4">
                <div className="rounded-3xl bg-white p-4 sm:p-6 border border-gray-200/90 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3">
                    <div>
                      <h3 className="text-base font-black text-gray-900">Current Split Balances</h3>
                      <p className="text-xs text-gray-500">
                        Based on {expenses.length} logged expense records &bull; Fair share: {activeTrip.currency}
                        {currentSettlement.perPersonShare.toFixed(2)} / person
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSettlementOpen(true)}
                      className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-700/20 hover:bg-emerald-700 transition cursor-pointer self-start sm:self-auto"
                    >
                      Open Settlement Plan
                    </button>
                  </div>

                  {/* Individual Participant Balance Cards */}
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {currentSettlement.participants.map((p) => {
                      const isCreditor = p.netBalance > 0.01;
                      const isDebtor = p.netBalance < -0.01;

                      return (
                        <div
                          key={p.name}
                          className="rounded-2xl border border-gray-200/90 bg-white p-4 shadow-2xs hover:border-emerald-300 transition flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-100 to-teal-100 text-emerald-800 flex items-center justify-center text-xs font-black shrink-0">
                                  {p.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-extrabold text-gray-900 text-sm truncate">
                                  {p.name}
                                </span>
                              </div>

                              <div className="shrink-0">
                                {isCreditor ? (
                                  <span className="inline-flex items-center font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-xl text-xs whitespace-nowrap shadow-2xs">
                                    + Gets back {activeTrip.currency}{p.netBalance.toFixed(2)}
                                  </span>
                                ) : isDebtor ? (
                                  <span className="inline-flex items-center font-extrabold text-rose-800 bg-rose-50 border border-rose-200/80 px-2.5 py-1 rounded-xl text-xs whitespace-nowrap shadow-2xs">
                                    Owes {activeTrip.currency}{Math.abs(p.netBalance).toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-xl text-xs whitespace-nowrap">
                                    Settled ($0.00)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-400 font-medium block text-[11px]">
                                Total Paid
                              </span>
                              <span className="font-extrabold text-gray-900 text-sm font-mono">
                                {activeTrip.currency}
                                {p.totalPaid.toFixed(2)}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-gray-400 font-medium block text-[11px]">
                                Fair Share
                              </span>
                              <span className="font-extrabold text-gray-900 text-sm font-mono">
                                {activeTrip.currency}
                                {p.fairShare.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Settlement Payments preview (Who Pays Whom) */}
                <div className="rounded-3xl bg-white p-4 sm:p-6 border border-gray-200/90 shadow-2xs">
                  <div className="flex items-center justify-between mb-3.5">
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-wider text-gray-900">
                        Who Pays Whom Summary
                      </h4>
                      <p className="text-xs text-gray-500">
                        Optimal settlement transactions to balance all participants
                      </p>
                    </div>
                    <span className="text-xs font-bold text-gray-400">
                      {currentSettlement.transactions.length} transfer{currentSettlement.transactions.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {currentSettlement.transactions.length === 0 ? (
                    <div className="text-center py-8 rounded-2xl bg-gray-50 border border-dashed border-gray-200 text-xs text-gray-500">
                      🎉 All balances are currently equal. No one owes anything!
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {currentSettlement.transactions.map((t, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border border-gray-200 bg-white hover:border-emerald-300 hover:shadow-xs transition"
                        >
                          <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
                            <span className="font-black text-gray-900 truncate">{t.from}</span>
                            <span className="text-xs text-gray-400 font-medium">owes</span>
                            <ArrowRight className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="font-black text-emerald-800 truncate">{t.to}</span>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                            <span className="text-base sm:text-lg font-black text-gray-900 font-mono">
                              {activeTrip.currency}
                              {t.amount.toFixed(2)}
                            </span>
                            <span className="text-xs px-2.5 py-1 rounded-xl font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              Pending Settlement
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating Add Expense & Camera Scan Buttons on Mobile */}
      {activeTrip && (
        <div className="fixed bottom-5 right-5 sm:hidden z-30 flex items-center gap-2.5">
          <button
            onClick={() => setIsReceiptScannerOpen(true)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/95 text-emerald-400 border border-emerald-500/30 backdrop-blur-md shadow-xl active:scale-95 transition cursor-pointer"
            title="Scan Receipt with Camera"
          >
            <Camera className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              setEditingExpense(null);
              setScannedReceiptData(null);
              setIsExpenseModalOpen(true);
            }}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-700/30 active:scale-95 transition cursor-pointer"
            title="Add Expense"
          >
            <Plus className="w-7 h-7" />
          </button>
        </div>
      )}

      {/* Modals */}
      {/* 1. User Name Starting Modal */}
      <UserNameModal
        isOpen={isUserModalOpen}
        currentProfile={currentUser}
        onSave={(profile) => {
          saveUserProfile(profile);
          setCurrentUser(profile);
          setIsUserModalOpen(false);
          // If no active trip, open trip selector
          if (!activeTrip) {
            setIsTripSelectorOpen(true);
          }
        }}
        onClose={currentUser ? () => setIsUserModalOpen(false) : undefined}
      />

      {/* 2. Trip Selector Modal */}
      <TripSelectorModal
        isOpen={isTripSelectorOpen}
        onClose={() => setIsTripSelectorOpen(false)}
        currentUser={currentUser || { name: 'User A' }}
        recentTrips={recentTrips}
        activeTrip={activeTrip}
        onCreateTrip={handleCreateTrip}
        onSelectTrip={(tripId) => {
          loadTripFromFirestore(tripId);
        }}
        onJoinTripByCode={handleJoinTripByCode}
        onDeleteTrip={handleDeleteTrip}
      />

      {/* 3. Expense Form Modal */}
      {activeTrip && (
        <ExpenseFormModal
          isOpen={isExpenseModalOpen}
          onClose={() => {
            setIsExpenseModalOpen(false);
            setEditingExpense(null);
            setScannedReceiptData(null);
          }}
          trip={activeTrip}
          currentUserName={currentUser?.name || 'User A'}
          editingExpense={editingExpense}
          initialScannedData={scannedReceiptData}
          onSaveExpense={handleSaveExpense}
        />
      )}

      {/* 4. Receipt Scanner Modal */}
      {activeTrip && (
        <ReceiptScannerModal
          isOpen={isReceiptScannerOpen}
          onClose={() => setIsReceiptScannerOpen(false)}
          currency={activeTrip.currency}
          onReceiptScanned={(scanned) => {
            setScannedReceiptData(scanned);
            setEditingExpense(null);
            setIsExpenseModalOpen(true);
            setSyncFeedback(
              `Receipt scanned! Auto-populated ${scanned.description} (${activeTrip.currency}${scanned.amount.toFixed(2)})`
            );
            setTimeout(() => setSyncFeedback(null), 4000);
          }}
        />
      )}

      {/* 4. Settlement Modal */}
      {activeTrip && (
        <SettlementModal
          isOpen={isSettlementOpen}
          onClose={() => setIsSettlementOpen(false)}
          trip={activeTrip}
          settlement={currentSettlement}
          onEndTrip={handleEndTrip}
          onReopenTrip={handleReopenTrip}
          onSyncToSheets={handleSyncToSheets}
          hasGoogleToken={hasGoogleToken}
          onConnectGoogle={handleConnectGoogle}
        />
      )}

      {/* 5. Edit Trip Details & Participants Modal */}
      {activeTrip && (
        <EditTripModal
          isOpen={isEditTripOpen}
          onClose={() => setIsEditTripOpen(false)}
          trip={activeTrip}
          expenses={expenses}
          onUpdateTrip={handleUpdateTrip}
          onRenameParticipant={handleRenameParticipant}
          onDeleteTrip={handleDeleteTrip}
        />
      )}

      {/* 6. Phone QR Code & Share Modal */}
      <PhoneShareModal
        isOpen={isPhoneShareOpen}
        onClose={() => setIsPhoneShareOpen(false)}
        trip={activeTrip}
      />
    </div>
  );
}
