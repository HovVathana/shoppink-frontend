"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { driversAPI } from '@/lib/api';

interface Driver {
  id: string;
  name: string;
  phone: string;
  isActive: boolean;
}

interface DriversContextType {
  drivers: Driver[];
  activeDrivers: Driver[];
  isLoading: boolean;
  error: string | null;
  refreshDrivers: () => Promise<void>;
  retryCount: number;
}

const DriversContext = createContext<DriversContextType | undefined>(undefined);

interface DriversProviderProps {
  children: ReactNode;
}

export function DriversProvider({ children }: DriversProviderProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Compute active drivers from all drivers
  const activeDrivers = drivers.filter(driver => driver.isActive);

  const refreshDrivers = useCallback(async (attemptNumber = 0) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch all drivers and filter active ones on the client side
      // This is more efficient than making separate API calls
      const response = await driversAPI.getAll({ limit: 100 });
      const allDrivers = response.data?.drivers || [];
      setDrivers(allDrivers);
      setRetryCount(0); // Reset retry count on success
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load drivers';
      console.error('Failed to load drivers:', {
        error: err,
        status: err.response?.status,
        message: errorMessage,
        attempt: attemptNumber + 1
      });
      
      // Retry logic for network errors or 5xx errors
      const shouldRetry = attemptNumber < 2 && (
        !err.response || // Network error
        err.response.status >= 500 // Server error
      );
      
      if (shouldRetry) {
        setRetryCount(attemptNumber + 1);
        const delay = Math.min(1000 * Math.pow(2, attemptNumber), 5000); // Exponential backoff, max 5s
        console.log(`Retrying driver fetch in ${delay}ms (attempt ${attemptNumber + 2}/3)`);
        
        setTimeout(() => {
          refreshDrivers(attemptNumber + 1);
        }, delay);
      } else {
        setError(errorMessage);
        setRetryCount(0);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDrivers();
  }, [refreshDrivers]);

  // Listen for driver updates from other components
  useEffect(() => {
    // Only set up event listeners on the client side
    if (typeof window === 'undefined') return;
    
    const handleDriverUpdate = () => {
      refreshDrivers();
    };

    window.addEventListener('driversUpdated', handleDriverUpdate);
    return () => {
      window.removeEventListener('driversUpdated', handleDriverUpdate);
    };
  }, [refreshDrivers]);

  const value = {
    drivers,
    activeDrivers,
    isLoading,
    error,
    refreshDrivers,
    retryCount,
  };

  return (
    <DriversContext.Provider value={value}>
      {children}
    </DriversContext.Provider>
  );
}

export function useDrivers() {
  const context = useContext(DriversContext);
  if (context === undefined) {
    throw new Error('useDrivers must be used within a DriversProvider');
  }
  return context;
}