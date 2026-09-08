import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Employee, Role } from '../types';
import { storageService } from '../services/storageService';

interface AuthContextType {
  currentUser: Employee;
  setCurrentUser: (user: Employee) => void;
  switchUserRole: (role: Role) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  isOnline: boolean;
  isSimulatedOffline: boolean;
  toggleSimulatedOffline: () => void;
  pendingSyncCount: number;
  triggerManualSync: () => void;
  isSyncing: boolean;
  isBiometricAuthenticated: boolean;
  promptBiometricAuth: () => Promise<boolean>;
  completeBiometricAuth: () => void;
  openBiometricModal: () => void;
  closeBiometricModal: () => void;
  showBiometricModal: boolean;
  openOAuthModal: () => void;
  closeOAuthModal: () => void;
  showOAuthModal: boolean;
  handleOAuthLogin: (provider: string) => void;
  refreshUserData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize storage seeds
  useEffect(() => {
    storageService.initStorage();
  }, []);

  const employees = storageService.getEmployees();
  // Default to Elena Vance (admin), with quick switch to Priya Sharma (employee) or David Chen (manager)
  const [currentUser, setCurrentUserState] = useState<Employee>(
    employees[0] || {
      id: 'emp-1',
      employeeCode: 'EMP-1001',
      name: 'Elena Vance',
      email: 'elena.vance@omnihr.internal',
      personalEmail: 'elena.vance@gmail.com',
      phone: '+1 (555) 234-5678',
      role: 'admin',
      designation: 'VP of People & Culture',
      department: 'Human Resources',
      location: 'San Francisco, CA',
      workMode: 'Hybrid',
      joiningDate: '2021-03-15',
      status: 'Active',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      emergencyContact: { name: 'Thomas Vance', relationship: 'Spouse', phone: '+1 555-987-6543' },
      leaveBalance: {
        EL: { total: 18, used: 4, remaining: 14 },
        CL: { total: 10, used: 2, remaining: 8 },
        SL: { total: 12, used: 1, remaining: 11 },
        PL: { total: 15, used: 0, remaining: 15 },
      },
      education: [],
      priorExperience: [],
      certifications: [],
      documents: [],
      payrollHistory: [],
    }
  );

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('omnihr_theme');
      if (stored) return stored === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('omnihr_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('omnihr_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  // Offline / Online Detection
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(storageService.isSimulatedOffline());
  const [isOnlineState, setIsOnlineState] = useState<boolean>(storageService.isOnline());
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(storageService.getPendingSyncQueue().length);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      if (!storageService.isSimulatedOffline()) {
        setIsOnlineState(true);
        triggerManualSync();
      }
    };
    const handleOffline = () => {
      setIsOnlineState(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleSimulatedOffline = () => {
    const nextStatus = !isSimulatedOffline;
    setIsSimulatedOffline(nextStatus);
    storageService.setSimulatedOffline(nextStatus);
    if (nextStatus) {
      setIsOnlineState(false);
      storageService.logAudit({
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorRole: currentUser.role,
        actionType: 'SYSTEM_BACKUP',
        description: 'Switched to Offline Mode: Local storage cache & deferred queue activated.',
      });
    } else {
      setIsOnlineState(navigator.onLine);
      triggerManualSync();
    }
  };

  const triggerManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      const count = storageService.flushSyncQueue({
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
      });
      setPendingSyncCount(0);
      setIsSyncing(false);
    }, 1200);
  };

  // Biometrics & OAuth Modals
  const [isBiometricAuthenticated, setIsBiometricAuthenticated] = useState<boolean>(true);
  const [showBiometricModal, setShowBiometricModal] = useState<boolean>(false);
  const [showOAuthModal, setShowOAuthModal] = useState<boolean>(false);
  const biometricResolverRef = useRef<((success: boolean) => void) | null>(null);

  const openBiometricModal = () => setShowBiometricModal(true);

  const closeBiometricModal = () => {
    setShowBiometricModal(false);
    if (biometricResolverRef.current) {
      biometricResolverRef.current(false);
      biometricResolverRef.current = null;
    }
  };

  const completeBiometricAuth = () => {
    setIsBiometricAuthenticated(true);
    setShowBiometricModal(false);
    if (biometricResolverRef.current) {
      biometricResolverRef.current(true);
      biometricResolverRef.current = null;
    }
  };

  const openOAuthModal = () => setShowOAuthModal(true);
  const closeOAuthModal = () => setShowOAuthModal(false);

  const promptBiometricAuth = async (): Promise<boolean> => {
    setShowBiometricModal(true);
    return new Promise((resolve) => {
      biometricResolverRef.current = resolve;
    });
  };

  const handleOAuthLogin = (provider: string) => {
    storageService.logAudit({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      actionType: 'AUTH',
      description: `Authenticated session via ${provider} Single Sign-On (OAuth 2.0 PKCE Verified)`,
    });
    setShowOAuthModal(false);
  };

  const setCurrentUser = (user: Employee) => {
    setCurrentUserState(user);
    storageService.logAudit({
      actorId: user.id,
      actorName: user.name,
      actorRole: user.role,
      actionType: 'AUTH',
      description: `User session switched to ${user.name} (${user.role.toUpperCase()}) - ${user.designation}`,
    });
  };

  const switchUserRole = (role: Role) => {
    const list = storageService.getEmployees();
    const match = list.find((e) => e.role === role);
    if (match) {
      setCurrentUser(match);
    }
  };

  const refreshUserData = () => {
    const updated = storageService.getEmployeeById(currentUser.id);
    if (updated) {
      setCurrentUserState({ ...updated });
    }
    setPendingSyncCount(storageService.getPendingSyncQueue().length);
  };

  // Subscribe to storage updates
  useEffect(() => {
    const unsubscribe = storageService.subscribe(() => {
      refreshUserData();
    });
    return unsubscribe;
  }, [currentUser.id]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        switchUserRole,
        isDarkMode,
        toggleDarkMode,
        isOnline: isOnlineState,
        isSimulatedOffline,
        toggleSimulatedOffline,
        pendingSyncCount,
        triggerManualSync,
        isSyncing,
        isBiometricAuthenticated,
        promptBiometricAuth,
        completeBiometricAuth,
        openBiometricModal,
        closeBiometricModal,
        showBiometricModal,
        openOAuthModal,
        closeOAuthModal,
        showOAuthModal,
        handleOAuthLogin,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
