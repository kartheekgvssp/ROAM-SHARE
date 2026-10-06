import React, { useState } from 'react';
import { UserProfile } from '../types';
import { googleSignIn } from '../lib/firebase';
import { User as UserIcon, Plane, Sparkles, CheckCircle2 } from 'lucide-react';

interface UserNameModalProps {
  currentProfile: UserProfile | null;
  onSave: (profile: UserProfile) => void;
  isOpen: boolean;
  onClose?: () => void;
}

export const UserNameModal: React.FC<UserNameModalProps> = ({
  currentProfile,
  onSave,
  isOpen,
  onClose,
}) => {
  const [name, setName] = useState(currentProfile?.name || '');
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    onSave({
      name: name.trim(),
      isGoogleUser: currentProfile?.isGoogleUser || false,
      email: currentProfile?.email,
      photoURL: currentProfile?.photoURL,
    });
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoadingGoogle(true);
      setError(null);
      const res = await googleSignIn();
      if (res?.user) {
        const displayName = res.user.displayName || res.user.email?.split('@')[0] || 'User';
        onSave({
          name: displayName,
          email: res.user.email || undefined,
          photoURL: res.user.photoURL || undefined,
          uid: res.user.uid,
          isGoogleUser: true,
        });
      }
    } catch (err: unknown) {
      console.error('Google Sign-in failed:', err);
      setError(err instanceof Error ? err.message : 'Google sign-in could not be completed.');
    } finally {
      setIsLoadingGoogle(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20 mb-4">
            <Plane className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            {currentProfile ? 'Edit Your Name' : 'Welcome to TripSync'}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Track daily trip expenses in real-time, split bills effortlessly, and sync to Google Sheets.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1">
              What is your name?
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                <UserIcon className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="e.g., User A, Kartheek, Sarah"
                maxLength={40}
                autoFocus
                className="w-full rounded-xl border border-gray-300 py-3 pl-11 pr-4 text-sm text-gray-900 focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              This name will tag your payments (e.g. &ldquo;User A paid $40&rdquo;) and sync to Google Sheets.
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600 border border-red-100">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {onClose && currentProfile && (
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 active:scale-98 transition"
            >
              <span>{currentProfile ? 'Save Name' : 'Continue to Trips'}</span>
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-gray-400 font-medium">Or connect with Google</span>
          </div>
        </div>

        {/* Official Google Sign In Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoadingGoogle}
          className="w-full flex items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white py-2.5 px-4 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50 active:bg-gray-100 transition disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
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
          <span>
            {isLoadingGoogle
              ? 'Connecting Google...'
              : currentProfile?.isGoogleUser
              ? 'Google Account Connected'
              : 'Sign in with Google for Sheets Sync'}
          </span>
          {currentProfile?.isGoogleUser && (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-auto" />
          )}
        </button>
      </div>
    </div>
  );
};
