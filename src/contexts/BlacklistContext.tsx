"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { blacklistAPI } from '@/lib/api';

interface BlacklistContextType {
  blacklistSet: Set<string>;
  isLoading: boolean;
  error: string | null;
  refreshBlacklist: () => Promise<void>;
  normalizePhone: (phone?: string) => string;
}

const BlacklistContext = createContext<BlacklistContextType | undefined>(undefined);

interface BlacklistProviderProps {
  children: ReactNode;
}

export function BlacklistProvider({ children }: BlacklistProviderProps) {
  const [blacklistSet, setBlacklistSet] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const normalizePhone = (phone?: string) => (phone || "").replace(/[^0-9]/g, "");

  const refreshBlacklist = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await blacklistAPI.getAll();
      const entries = res.data?.data?.entries || [];
      setBlacklistSet(new Set(entries.map((e: any) => e.phone)));
    } catch (err) {
      setError('Failed to load blacklist');
      console.error('Failed to load blacklist:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshBlacklist();
  }, []);

  const value = {
    blacklistSet,
    isLoading,
    error,
    refreshBlacklist,
    normalizePhone,
  };

  return (
    <BlacklistContext.Provider value={value}>
      {children}
    </BlacklistContext.Provider>
  );
}

export function useBlacklist() {
  const context = useContext(BlacklistContext);
  if (context === undefined) {
    throw new Error('useBlacklist must be used within a BlacklistProvider');
  }
  return context;
}