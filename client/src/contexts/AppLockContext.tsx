import { createContext, useContext, useEffect, useState, useCallback } from "react";

type AppLockContextType = {
  isLocked: boolean;
  hasPin: boolean;
  theme: "dark" | "light";
  notificationsEnabled: boolean;
  setPin: (pin: string) => void;
  removePin: () => void;
  unlock: (pin: string) => boolean;
  lock: () => void;
  toggleTheme: () => void;
  toggleNotifications: () => void;
};

const AppLockContext = createContext<AppLockContextType | null>(null);
const PIN_KEY = "cryptobank:pinHash";
const THEME_KEY = "cryptobank:theme";
const NOTIF_KEY = "cryptobank:notifs";
const LOCKED_KEY = "cryptobank:locked";

function hashPin(pin: string): string {
  // simple hash – not cryptographic, for demo only, never store real seed
  let h = 0;
  for (let i=0;i<pin.length;i++) h = (h*31 + pin.charCodeAt(i)) % 999983;
  return `h_${h}_${pin.length}`;
}

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    try { return localStorage.getItem(LOCKED_KEY) === "1"; } catch { return false; }
  });
  const [pinHash, setPinHash] = useState<string | null>(() => {
    try { return localStorage.getItem(PIN_KEY); } catch { return null; }
  });
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try { const t = localStorage.getItem(THEME_KEY); return (t as any) ?? "dark"; } catch { return "dark"; }
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem(NOTIF_KEY) !== "0"; } catch { return true; }
  });

  useEffect(() => {
    try {
      if (isLocked) localStorage.setItem(LOCKED_KEY, "1");
      else localStorage.removeItem(LOCKED_KEY);
    } catch {}
  }, [isLocked]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
  }, [theme]);

  const setPin = useCallback((pin: string) => {
    const h = hashPin(pin);
    setPinHash(h);
    try { localStorage.setItem(PIN_KEY, h); } catch {}
    setIsLocked(false);
  }, []);

  const removePin = useCallback(() => {
    setPinHash(null);
    setIsLocked(false);
    try { localStorage.removeItem(PIN_KEY); localStorage.removeItem(LOCKED_KEY); } catch {}
  }, []);

  const unlock = useCallback((pin: string) => {
    if (!pinHash) return true;
    const h = hashPin(pin);
    if (h === pinHash) {
      setIsLocked(false);
      return true;
    }
    return false;
  }, [pinHash]);

  const lock = useCallback(() => {
    if (pinHash) setIsLocked(true);
  }, [pinHash]);

  const toggleTheme = useCallback(() => {
    setTheme(t => t === "dark" ? "light" : "dark");
  }, []);

  const toggleNotifications = useCallback(() => {
    setNotificationsEnabled(v => {
      const nv = !v;
      try { localStorage.setItem(NOTIF_KEY, nv ? "1" : "0"); } catch {}
      return nv;
    });
  }, []);

  return (
    <AppLockContext.Provider value={{
      isLocked: !!pinHash && isLocked,
      hasPin: !!pinHash,
      theme,
      notificationsEnabled,
      setPin,
      removePin,
      unlock,
      lock,
      toggleTheme,
      toggleNotifications,
    }}>
      {children}
    </AppLockContext.Provider>
  );
}

export function useAppLock() {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error("useAppLock must be used within AppLockProvider");
  return ctx;
}
