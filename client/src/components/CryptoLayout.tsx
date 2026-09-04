import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Home, Wallet, Send, QrCode, History, Activity, User, Menu, X, Shield, LogOut, Lock, RefreshCw, Bell } from "lucide-react";
import { useWallet } from "@/contexts/WalletContext";
import { useAppLock } from "@/contexts/AppLockContext";
import { useIsMobile } from "@/hooks/useMobile";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const navItems = [
  { path: "/", label: "Главная", icon: Home },
  { path: "/assets", label: "Активы", icon: Wallet },
  { path: "/send", label: "Отправить", icon: Send },
  { path: "/receive", label: "Получить", icon: QrCode },
  { path: "/history", label: "История", icon: History },
  { path: "/diagnostics", label: "Диагностика", icon: Activity },
  { path: "/profile", label: "Профиль", icon: User },
];

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const { unlock } = useAppLock();
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const handle = () => {
    if (unlock(pin)) { setErr(""); onUnlock(); }
    else setErr("Неверный PIN");
  };
  return (
    <div className="fixed inset-0 z-[100] bg-[#0B1020] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-[#151C31] rounded-[24px] p-8 border border-white/10 shadow-2xl">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-[#24D7B2]/15 flex items-center justify-center mb-6">
          <Lock className="w-7 h-7 text-[#24D7B2]" />
        </div>
        <h1 className="text-center text-[22px] font-bold text-[#F5F8FF]">CryptoBank заблокирован</h1>
        <p className="text-center text-sm text-[#A6B1CC] mt-2">Введите PIN для разблокировки</p>
        <div className="mt-6">
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g,""))}
            placeholder="••••"
            className="w-full h-14 rounded-2xl bg-[#0B1020] border border-white/10 text-center text-2xl tracking-[0.4em] text-white placeholder:text-white/30 focus:border-[#24D7B2] outline-none"
          />
          {err && <p className="text-sm text-[#FF6677] mt-2 text-center">{err}</p>}
          <Button onClick={handle} className="w-full mt-4 h-12 rounded-2xl bg-[#24D7B2] text-[#0B1020] font-bold hover:bg-[#1ec9a5] press-feedback">Разблокировать</Button>
        </div>
        <p className="text-center text-[11px] text-[#A6B1CC] mt-4">PIN хранится локально, seed-фраза никогда не запрашивается</p>
      </div>
    </div>
  );
}

export default function CryptoLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { state, address, isDemo, refreshBalances, balancesLoading } = useWallet();
  const { isLocked, lock } = useAppLock();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { toast } = useToast();
  const [showGate, setShowGate] = useState(isLocked);

  useEffect(() => { setShowGate(isLocked); }, [isLocked]);

  // handle wallet deep link scheme display
  const handleRefresh = () => {
    // haptic
    try { navigator.vibrate?.(20); } catch {}
    refreshBalances();
    toast({ title: "Обновление баланса..." });
  };

  if (showGate) {
    return <PinGate onUnlock={() => setShowGate(false)} />;
  }

  const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
    connected: { label: "Подключён", color: "text-[#4CD98A]", dot: "bg-[#4CD98A]" },
    connecting: { label: "Подключение…", color: "text-[#FFD166]", dot: "bg-[#FFD166] animate-pulse" },
    disconnected: { label: "Не подключён", color: "text-[#A6B1CC]", dot: "bg-[#A6B1CC]" },
    expired: { label: "Сессия истекла", color: "text-[#FF6677]", dot: "bg-[#FF6677]" },
    error: { label: "Ошибка", color: "text-[#FF6677]", dot: "bg-[#FF6677]" },
  };
  const st = statusConfig[state] ?? statusConfig.disconnected;

  return (
    <div className="min-h-screen bg-[#0B1020] text-[#F5F8FF] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-[280px] shrink-0 flex-col bg-[#151C31] border-r border-white/[0.06] sticky top-0 h-screen">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#24D7B2] to-[#4F7CFF] flex items-center justify-center shadow-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-extrabold tracking-tight leading-none">CryptoBank</div>
              <div className="text-[11px] tracking-[0.14em] text-[#A6B1CC] uppercase font-medium">Waves • WX.Network</div>
            </div>
          </div>

          <div className="mt-6 p-3 rounded-2xl bg-[#0B1020] border border-white/5 flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${st.dot}`} />
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-semibold ${st.color}`}>{st.label}</div>
              <div className="text-[11px] text-[#A6B1CC] truncate">{address ? `${address.slice(0,6)}…${address.slice(-4)}` : "WX/Keeper не подключён"}</div>
            </div>
            <div className="text-[10px] px-2 py-1 rounded-full bg-white/5 text-[#A6B1CC] border border-white/5">{isDemo ? "DEMO" : "LIVE"}</div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const active = location === item.path;
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path} className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition ${active ? "bg-[#24D7B2] text-[#0B1020] shadow-lg" : "text-[#A6B1CC] hover:bg-white/5 hover:text-white"}`}>
                <Icon className={`w-[18px] h-[18px] ${active ? "text-[#0B1020]" : ""}`} />
                {item.label}
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#0B1020]/60" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2">
          <div className="flex items-center gap-2 text-[11px] text-[#A6B1CC] px-2">
            <div className="w-6 h-6 rounded-full bg-[#4F7CFF]/20 flex items-center justify-center"><Shield className="w-3.5 h-3.5 text-[#4F7CFF]" /></div>
            Seed-фразы не храним
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-[#A6B1CC] hover:text-white hover:bg-white/5" onClick={lock}>
            <Lock className="w-4 h-4 mr-2" /> Заблокировать
          </Button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-[#0B1020]/80 backdrop-blur-xl border-b border-white/[0.06] lg:border-b-0">
          <div className="flex items-center justify-between px-4 lg:px-8 h-[64px] lg:h-[72px]">
            <div className="flex items-center gap-3">
              <button onClick={() => setDrawerOpen(true)} className="lg:hidden w-9 h-9 rounded-xl bg-[#151C31] border border-white/10 grid place-items-center haptic">
                <Menu className="w-5 h-5" />
              </button>
              <div className="lg:hidden flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#24D7B2] to-[#4F7CFF] grid place-items-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-sm">CryptoBank</span>
                <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded-full bg-[#24D7B2]/15 text-[#24D7B2] border border-[#24D7B2]/20">DEMO</span>
              </div>
              <div className="hidden lg:block">
                <h1 className="text-[15px] font-semibold text-[#F5F8FF] flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                  {st.label} • Waves {isDemo ? "DEMO" : "Mainnet"}
                </h1>
                <p className="text-xs text-[#A6B1CC] truncate max-w-[420px]">{address ?? "Подключите WX.Network / Keeper для управления WAVES и USDT"}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleRefresh} variant="ghost" size="icon" className="w-9 h-9 rounded-xl bg-[#151C31] border border-white/10 haptic">
                <RefreshCw className={`w-4 h-4 ${balancesLoading ? "animate-spin" : ""}`} />
              </Button>
              <Link href="/profile" className="w-9 h-9 rounded-xl bg-[#151C31] border border-white/10 grid place-items-center haptic">
                <Bell className="w-4 h-4 text-[#A6B1CC]" />
              </Link>
              <Link href="/profile" className="hidden sm:flex w-9 h-9 rounded-full bg-gradient-to-br from-[#4F7CFF] to-[#24D7B2] text-white font-bold text-sm items-center justify-center">
                {(address?.[2] ?? "C").toUpperCase()}
              </Link>
            </div>
          </div>
          {/* Mobile status bar */}
          <div className="lg:hidden px-4 pb-3 flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full ${st.dot}`} />
            <span className={st.color + " font-medium"}>{st.label}</span>
            <span className="text-[#A6B1CC] truncate">{address ? `${address.slice(0,5)}…${address.slice(-4)}` : "Не подключён"}</span>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[#A6B1CC]">{isDemo ? "DEMO" : "WAVES"}</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 lg:px-8 py-6 pb-24 lg:pb-8 max-w-[1200px] w-full mx-auto">
          {children}
        </main>

        {/* Bottom nav mobile */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#151C31]/95 backdrop-blur-xl border-t border-white/10 bottom-nav">
          <div className="grid grid-cols-5 gap-1 px-2 py-2">
            {navItems.slice(0,5).map(item => {
              const active = location === item.path;
              const Icon = item.icon;
              return (
                <Link key={item.path} href={item.path} className={`flex flex-col items-center justify-center py-2 rounded-2xl transition haptic ${active ? "bg-[#24D7B2] text-[#0B1020]" : "text-[#A6B1CC]"}`}>
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium mt-1 leading-none">{item.label}</span>
                </Link>
              );
            })}
          </div>
          <div className="flex justify-center pb-1">
            <div className="w-32 h-1 rounded-full bg-white/10" />
          </div>
        </nav>
      </div>

      {/* Mobile drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-[300px] bg-[#0B1020] border-white/10 p-0">
          <SheetHeader className="p-6 pb-4 text-left">
            <SheetTitle className="flex items-center gap-3 text-white">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#24D7B2] to-[#4F7CFF] grid place-items-center"><Shield className="w-5 h-5 text-white" /></div>
              CryptoBank
            </SheetTitle>
            <div className="text-xs text-[#A6B1CC]">WAVES • WX.Network • Keeper</div>
          </SheetHeader>

          <div className="px-4">
            <div className="p-3 rounded-2xl bg-[#151C31] border border-white/5 flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${st.dot}`} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white">{st.label}</div>
                <div className="text-[11px] text-[#A6B1CC] truncate">{address ?? "Не подключён"}</div>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="w-8 h-8 grid place-items-center rounded-full bg-white/5"><X className="w-4 h-4" /></button>
            </div>
          </div>

          <nav className="mt-6 px-3 space-y-1">
            {navItems.map(item => {
              const active = location === item.path;
              const Icon = item.icon;
              return (
                <Link key={item.path} href={item.path} onClick={() => setDrawerOpen(false)} className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium ${active ? "bg-[#24D7B2] text-[#0B1020]" : "text-[#A6B1CC] hover:bg-white/5"}`}>
                  <Icon className="w-5 h-5" /> {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 inset-x-0 p-4 border-t border-white/5 bg-[#151C31]">
            <div className="text-[11px] text-[#A6B1CC] mb-3 flex items-center gap-2"><Shield className="w-4 h-4 text-[#24D7B2]" /> Безопасно: ключи остаются в Keeper/WX</div>
            <Button onClick={() => { setDrawerOpen(false); lock(); }} variant="secondary" className="w-full rounded-xl bg-white/5 text-white hover:bg-white/10"><Lock className="w-4 h-4 mr-2" /> Заблокировать</Button>
            <Button onClick={() => { setDrawerOpen(false); (useWallet as any); }} variant="ghost" className="w-full mt-2 text-[#FF6677] hover:bg-[#FF6677]/10"><LogOut className="w-4 h-4 mr-2" /> Выйти</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
