import { useState, useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ImpersonationData {
  logId: string;
  targetUserId: string;
  targetEmail: string;
  targetFullName: string;
  originalAdminEmail: string;
}

const STORAGE_KEY = 'impersonation_data';

/**
 * Synchronous read of impersonation data from localStorage.
 * This avoids the flash/double-render caused by useState + useEffect.
 */
function getImpersonationSnapshot(): ImpersonationData | null {
  if (typeof window === 'undefined') return null;
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
      return JSON.parse(storedData);
    }
  } catch (error) {
    console.error('Failed to parse impersonation data:', error);
    localStorage.removeItem(STORAGE_KEY);
  }
  return null;
}

// For SSR (not applicable here, but good practice)
function getServerSnapshot(): ImpersonationData | null {
  return null;
}

// Subscribers for storage changes
let listeners: Array<() => void> = [];

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  
  // Listen for storage changes from other tabs
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      listeners.forEach(l => l());
    }
  };
  window.addEventListener('storage', handleStorageChange);
  
  return () => {
    listeners = listeners.filter(l => l !== listener);
    window.removeEventListener('storage', handleStorageChange);
  };
}

function notifyListeners() {
  listeners.forEach(l => l());
}

export const useImpersonation = () => {
  // Use useSyncExternalStore for synchronous, flicker-free reads
  const impersonationData = useSyncExternalStore(
    subscribe,
    getImpersonationSnapshot,
    getServerSnapshot
  );

  const isImpersonating = impersonationData !== null;

  const startImpersonation = (data: ImpersonationData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    notifyListeners();
  };

  const exitImpersonation = async () => {
    const currentData = getImpersonationSnapshot();
    if (!currentData) return;

    try {
      // Call edge function to end impersonation
      await supabase.functions.invoke('admin-impersonate', {
        body: {
          action: 'exit',
          logId: currentData.logId,
        },
      });
    } catch (error) {
      console.error('Failed to log impersonation exit:', error);
    }

    // Clear local data
    localStorage.removeItem(STORAGE_KEY);
    notifyListeners();

    // Sign out and redirect to login
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  return {
    isImpersonating,
    impersonationData,
    startImpersonation,
    exitImpersonation,
  };
};
