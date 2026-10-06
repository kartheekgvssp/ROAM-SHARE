import { Trip, Expense, UserProfile } from '../types';

const KEY_USER = 'tripsync_user_profile';
const KEY_ACTIVE_TRIP_ID = 'tripsync_active_trip_id';
const KEY_RECENT_TRIPS = 'tripsync_recent_trip_ids';
const KEY_CACHED_TRIPS = 'tripsync_cached_trips';
const KEY_EXPENSES_PREFIX = 'tripsync_expenses_';
const KEY_OFFLINE_QUEUE = 'tripsync_offline_queue';

export function getUserProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(KEY_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(KEY_USER, JSON.stringify(profile));
  } catch (err) {
    console.error('Failed to save profile in localStorage:', err);
  }
}

export function getActiveTripId(): string | null {
  try {
    return localStorage.getItem(KEY_ACTIVE_TRIP_ID);
  } catch {
    return null;
  }
}

export function setActiveTripId(tripId: string): void {
  try {
    localStorage.setItem(KEY_ACTIVE_TRIP_ID, tripId);
    // add to recent
    addRecentTripId(tripId);
  } catch (err) {
    console.error('Failed to set active trip ID:', err);
  }
}

export function getRecentTripIds(): string[] {
  try {
    const raw = localStorage.getItem(KEY_RECENT_TRIPS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentTripId(tripId: string): void {
  try {
    const existing = getRecentTripIds();
    const updated = [tripId, ...existing.filter((id) => id !== tripId)].slice(0, 15);
    localStorage.setItem(KEY_RECENT_TRIPS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to update recent trips:', err);
  }
}

export function cacheTripLocally(trip: Trip): void {
  try {
    const raw = localStorage.getItem(KEY_CACHED_TRIPS);
    const tripsMap: Record<string, Trip> = raw ? JSON.parse(raw) : {};
    tripsMap[trip.id] = trip;
    localStorage.setItem(KEY_CACHED_TRIPS, JSON.stringify(tripsMap));
  } catch (err) {
    console.error('Failed to cache trip locally:', err);
  }
}

export function getCachedTrip(tripId: string): Trip | null {
  try {
    const raw = localStorage.getItem(KEY_CACHED_TRIPS);
    if (!raw) return null;
    const tripsMap: Record<string, Trip> = JSON.parse(raw);
    return tripsMap[tripId] || null;
  } catch {
    return null;
  }
}

export function getAllCachedTrips(): Trip[] {
  try {
    const raw = localStorage.getItem(KEY_CACHED_TRIPS);
    if (!raw) return [];
    const tripsMap: Record<string, Trip> = JSON.parse(raw);
    return Object.values(tripsMap).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}

export function cacheExpensesLocally(tripId: string, expenses: Expense[]): void {
  try {
    localStorage.setItem(`${KEY_EXPENSES_PREFIX}${tripId}`, JSON.stringify(expenses));
  } catch (err) {
    console.error('Failed to cache expenses locally:', err);
  }
}

export function getCachedExpenses(tripId: string): Expense[] {
  try {
    const raw = localStorage.getItem(`${KEY_EXPENSES_PREFIX}${tripId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function queueOfflineExpense(expense: Expense): void {
  try {
    const raw = localStorage.getItem(KEY_OFFLINE_QUEUE);
    const queue: Expense[] = raw ? JSON.parse(raw) : [];
    queue.push(expense);
    localStorage.setItem(KEY_OFFLINE_QUEUE, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to queue offline expense:', err);
  }
}

export function getOfflineExpenseQueue(): Expense[] {
  try {
    const raw = localStorage.getItem(KEY_OFFLINE_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearOfflineExpenseQueue(): void {
  try {
    localStorage.removeItem(KEY_OFFLINE_QUEUE);
  } catch (err) {
    console.error('Failed to clear offline queue:', err);
  }
}
