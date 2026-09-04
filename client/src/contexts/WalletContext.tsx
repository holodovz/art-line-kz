import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";

// Types
export type WalletState = "disconnected" | "connecting" | "connected" | "expired" | "error";

type WalletContextType = {
  state: WalletState;
  address: string | null;
  publicKey: string | null;
  network: "mainnet" | "testnet";
  lastSyncAt: string | null;
  isDemo: boolean;
  isLoading: boolean;
  error: string | null;
  challenge: string | null;
  balances: { waves: string; usdt: string; lastUpdated: string; isStale: boolean; source?: string; warning?: string } | null;
  balancesLoading: boolean;
  refreshBalances: () => void;
  createChallenge: (redirectUrl?: string) => Promise<{ challenge: string; wxAuthUrl: string; deepLink: string } | null>;
  verify: (params: { challenge: string; signature: string; publicKey: string; wxAddress: string }) => Promise<boolean>;
  disconnect: () => Promise<void>;
  setState: (s: WalletState) => void;
};

const WalletContext = createContext<WalletContextType | null>(null);

const STORAGE_KEY = "cryptobank:wallet";
const CHALLENGE_KEY = "cryptobank:challenge";
const DEEP_LINK_SCHEME = "cryptobank://wx-callback";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [state, setState] = useState<WalletState>("disconnected");
  const [challenge, setChallenge] = useState<string | null>(() => {
    try { return localStorage.getItem(CHALLENGE_KEY); } catch { return null; }
  });
  const [localAddress, setLocalAddress] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { const j = JSON.parse(raw); return j.address ?? null; }
    } catch {}
    return null;
  });

  // Session query
  const sessionQuery = trpc.auth.wxSession.useQuery(undefined, {
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const balancesQuery = trpc.wallet.getBalances.useQuery(
    { address: sessionQuery.data?.address ?? localAddress ?? "3P DemoAddressMockForCryptoBankDemoMode", network: (sessionQuery.data?.network as any) ?? "mainnet" },
    { enabled: !!((sessionQuery.data?.address ?? localAddress) ), refetchOnWindowFocus: false }
  );

  const createChallengeMut = trpc.wallet.createChallenge.useMutation();
  const verifyMut = trpc.wallet.verifyChallenge.useMutation();
  const disconnectMut = trpc.wallet.disconnect.useMutation();
  const utils = trpc.useUtils();

  // sync state from server
  useEffect(() => {
    if (sessionQuery.data) {
      const s = sessionQuery.data.status as WalletState;
      if (s === "connected") {
        setState("connected");
        if (sessionQuery.data.address) {
          setLocalAddress(sessionQuery.data.address);
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ address: sessionQuery.data.address, network: sessionQuery.data.network, lastSyncAt: sessionQuery.data.lastSyncAt })); } catch {}
        }
      } else if (s === "expired") setState("expired");
      else if (s === "disconnected") {
        // if we have local address but server says disconnected, keep disconnected unless demo
        if (sessionQuery.data.isDemo) {
          // demo stays disconnected
          setState("disconnected");
        } else {
          setState("disconnected");
        }
      }
    } else if (sessionQuery.error) {
      setState("error");
    } else if (sessionQuery.isLoading) {
      setState(prev => prev === "connected" ? "connected" : "connecting");
    }
  }, [sessionQuery.data, sessionQuery.error, sessionQuery.isLoading]);

  // check deep link callback on mount – simulate handling cryptobank://wx-callback?challenge=...&signature=...&publicKey=...&address=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cbChallenge = params.get("challenge");
    const cbSignature = params.get("signature");
    const cbPublicKey = params.get("publicKey");
    const cbAddress = params.get("address") ?? params.get("wxAddress");
    const cbError = params.get("error");

    if (cbError) {
      setState("error");
      toast({ title: "Ошибка авторизации", description: cbError, variant: "destructive" as any });
    }

    if (cbChallenge && cbSignature && cbPublicKey && cbAddress) {
      // auto verify
      setState("connecting");
      verifyMut.mutate(
        { challenge: cbChallenge, signature: cbSignature, publicKey: cbPublicKey, wxAddress: cbAddress },
        {
          onSuccess: () => {
            setState("connected");
            setLocalAddress(cbAddress);
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ address: cbAddress })); } catch {}
            toast({ title: "Кошелёк подключён", description: cbAddress.slice(0, 8) + "…" + cbAddress.slice(-6) });
            utils.auth.wxSession.invalidate();
            balancesQuery.refetch();
            // clean URL
            window.history.replaceState({}, "", window.location.pathname);
          },
          onError: (e) => {
            setState("error");
            toast({ title: "Ошибка проверки подписи", description: e.message, variant: "destructive" as any });
          },
        }
      );
    }
  }, []);

  const createChallenge = useCallback(async (redirectUrl?: string) => {
    setState("connecting");
    try {
      const res = await createChallengeMut.mutateAsync({
        redirectUrl: redirectUrl ?? `${DEEP_LINK_SCHEME}?challenge=pending`,
        network: "mainnet",
      });
      setChallenge(res.challenge);
      try { localStorage.setItem(CHALLENGE_KEY, res.challenge); } catch {}
      // also auto push diagnostics via mutation is done server side
      return res;
    } catch (e: any) {
      setState("error");
      toast({ title: "Не удалось создать challenge", description: e.message, variant: "destructive" as any });
      return null;
    }
  }, [createChallengeMut]);

  const verify = useCallback(async (params: { challenge: string; signature: string; publicKey: string; wxAddress: string }) => {
    setState("connecting");
    try {
      const res = await verifyMut.mutateAsync({
        challenge: params.challenge,
        signature: params.signature,
        publicKey: params.publicKey,
        wxAddress: params.wxAddress,
      });
      setState("connected");
      setLocalAddress(res.address);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ address: res.address })); } catch {}
      utils.auth.wxSession.invalidate();
      balancesQuery.refetch();
      toast({ title: "Успешная авторизация WX.Network", description: res.address.slice(0,10)+"…"+res.address.slice(-6) });
      return true;
    } catch (e: any) {
      setState("error");
      toast({ title: "Ошибка верификации", description: e.message, variant: "destructive" as any });
      return false;
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await disconnectMut.mutateAsync();
    } catch {}
    setState("disconnected");
    setLocalAddress(null);
    setChallenge(null);
    try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(CHALLENGE_KEY); } catch {}
    utils.auth.wxSession.invalidate();
    toast({ title: "Кошелёк отключён" });
  }, []);

  const refreshBalances = useCallback(() => {
    balancesQuery.refetch();
    utils.auth.wxSession.refetch();
  }, [balancesQuery]);

  // Derive balances
  const balances = balancesQuery.data ? {
    waves: (balancesQuery.data as any).waves,
    usdt: (balancesQuery.data as any).usdt,
    lastUpdated: (balancesQuery.data as any).lastUpdated,
    isStale: (balancesQuery.data as any).isStale,
    source: (balancesQuery.data as any).source,
    warning: (balancesQuery.data as any).warning,
  } : null;

  // Manual timeout for connecting -> expired after 30s if not connected
  useEffect(() => {
    if (state !== "connecting") return;
    const t = setTimeout(() => {
      // if still connecting after 30s, mark as expired
      setState(prev => prev === "connecting" ? "expired" : prev);
    }, 30000);
    return () => clearTimeout(t);
  }, [state]);

  // Also detect challenge expiry 5 min
  useEffect(() => {
    if (!challenge) return;
    const t = setTimeout(() => {
      setState(prev => prev === "connecting" ? "expired" : prev);
    }, 5 * 60 * 1000);
    return () => clearTimeout(t);
  }, [challenge]);

  return (
    <WalletContext.Provider value={{
      state,
      address: sessionQuery.data?.address ?? localAddress,
      publicKey: (sessionQuery.data?.publicKey as any) ?? null,
      network: (sessionQuery.data?.network as any) ?? "mainnet",
      lastSyncAt: (sessionQuery.data?.lastSyncAt as any) ?? null,
      isDemo: sessionQuery.data?.isDemo ?? (!sessionQuery.data?.address),
      isLoading: sessionQuery.isLoading,
      error: (sessionQuery.error as any)?.message ?? null,
      challenge,
      balances,
      balancesLoading: balancesQuery.isFetching,
      refreshBalances,
      createChallenge,
      verify,
      disconnect,
      setState,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
