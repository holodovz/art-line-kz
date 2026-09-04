import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useWallet } from "@/contexts/WalletContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { ArrowUpRight, ArrowDownLeft, RefreshCw, Eye, EyeOff, Copy, ExternalLink, TrendingUp, AlertTriangle, Wallet, QrCode, Send, Clock, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function fmtBalance(v: string, decimals = 2) {
  const n = Number(v);
  if (isNaN(n)) return v;
  return n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: decimals });
}
function shortAddr(a: string | null) {
  if (!a) return "—";
  return `${a.slice(0,6)}…${a.slice(-4)}`;
}

export default function Dashboard() {
  const { state, address, network, isDemo, balances, refreshBalances, balancesLoading } = useWallet();
  const { toast } = useToast();
  const [hide, setHide] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const assetsQ = trpc.assets.list.useQuery(undefined, { refetchOnWindowFocus: false });
  const txQ = trpc.transactions.list.useQuery({ limit: 5 }, { refetchOnWindowFocus: false });

  // pull to refresh
  const startY = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { startY.current = e.touches[0].clientY; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    const dy = e.changedTouches[0].clientY - startY.current;
    if (dy > 80 && window.scrollY === 0) {
      setRefreshing(true);
      refreshBalances();
      assetsQ.refetch().finally(() => setTimeout(() => setRefreshing(false), 800));
      toast({ title: "Обновление..." });
    }
    startY.current = null;
  };

  const totalUsd = (() => {
    if (!assetsQ.data) return null;
    const waves = Number(assetsQ.data.find(a => a.id === "WAVES")?.balance ?? 0);
    const usdt = Number(assetsQ.data.find(a => a.id === "USDT")?.balance ?? 0);
    // waves price ~2.18
    return (waves * 2.18 + usdt).toFixed(2);
  })();

  const copyAddr = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    toast({ title: "Адрес скопирован" });
    try { navigator.vibrate?.(15); } catch {}
  };

  const isLoading = assetsQ.isLoading || txQ.isLoading;
  const hasError = assetsQ.error || txQ.error;

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="space-y-6 animate-[fade-in_0.4s]">
      {/* Pull indicator */}
      {refreshing && <div className="flex justify-center py-2"><Loader2 className="w-5 h-5 animate-spin text-[#24D7B2]" /></div>}

      {/* Demo banner */}
      {isDemo && (
        <div className="rounded-2xl bg-gradient-to-r from-[#4F7CFF]/20 to-[#24D7B2]/20 border border-[#4F7CFF]/30 p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#4F7CFF] grid place-items-center"><Eye className="w-4 h-4 text-white" /></div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white">Демо-режим</div>
            <div className="text-xs text-[#A6B1CC]">Показаны демонстрационные данные. Подключите WX.Network для реальных операций.</div>
          </div>
          <Badge variant="outline" className="bg-white/5 text-[#A6B1CC] border-white/10">DEMO</Badge>
        </div>
      )}

      {/* Header portfolio */}
      <div className="rounded-[24px] bg-gradient-to-br from-[#151C31] via-[#1B2440] to-[#0B1020] border border-white/[0.06] p-5 lg:p-7 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#24D7B2]/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-[#4F7CFF]/10 blur-3xl" />
        </div>

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs tracking-[0.14em] uppercase text-[#A6B1CC] font-medium flex items-center gap-2">
              Общий баланс портфеля
              <button onClick={() => setHide(v=>!v)} className="w-7 h-7 rounded-full bg-white/5 grid place-items-center haptic">
                {hide ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            {isLoading ? <Skeleton className="h-10 w-48 mt-2 rounded-xl" /> : (
              <div className="mt-2 flex items-baseline gap-3">
                <div className="text-[32px] lg:text-[42px] font-extrabold tracking-tight leading-none">
                  {hide ? "••••" : (totalUsd ? `$${Number(totalUsd).toLocaleString("ru-RU")}` : "—")}
                </div>
                <span className="text-sm text-[#4CD98A] flex items-center gap-1 bg-[#4CD98A]/10 px-2 py-1 rounded-full border border-[#4CD98A]/20"><TrendingUp className="w-3.5 h-3.5" />+3.2%</span>
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className={`px-2.5 py-1 rounded-full font-medium border ${state==="connected" ? "bg-[#4CD98A]/10 text-[#4CD98A] border-[#4CD98A]/20" : "bg-white/5 text-[#A6B1CC] border-white/10"}`}>
                <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${state==="connected" ? "bg-[#4CD98A]" : "bg-[#A6B1CC]"}`} />
                {state==="connected" ? "WX.Network • Подключён" : state==="connecting" ? "Подключение…" : isDemo ? "Демо • Не подключён" : "Не подключён"}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[#A6B1CC]">Сеть: {network === "mainnet" ? "Waves Mainnet" : "Testnet"}</span>
              {balances?.isStale && <span className="px-2.5 py-1 rounded-full bg-[#FF6677]/10 text-[#FF6677] border border-[#FF6677]/20 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Устаревшие данные</span>}
            </div>
          </div>

          <div className="flex gap-2">
            <Link href="/send"><Button className="h-11 rounded-xl bg-[#24D7B2] text-[#0B1020] font-bold hover:bg-[#1ec9a5] shadow-lg haptic"><Send className="w-4 h-4 mr-2" /> Отправить</Button></Link>
            <Link href="/receive"><Button variant="secondary" className="h-11 rounded-xl bg-white text-[#0B1020] font-bold hover:bg-white/90 haptic"><QrCode className="w-4 h-4 mr-2" /> Получить</Button></Link>
            <Button variant="ghost" size="icon" onClick={refreshBalances} className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 haptic"><RefreshCw className={`w-4 h-4 ${balancesLoading ? "animate-spin" : ""}`} /></Button>
          </div>
        </div>

        {/* Address card */}
        <div className="relative mt-6 p-3 rounded-2xl bg-[#0B1020] border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#24D7B2] to-[#4F7CFF] grid place-items-center text-white font-bold">{address ? address[2].toUpperCase() : "?"}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] tracking-[0.1em] uppercase text-[#A6B1CC]">Адрес кошелька</div>
            <div className="text-sm font-mono font-medium truncate">{address ?? "Не подключён — нажмите Подключить в профиле"}</div>
            {balances?.lastUpdated && <div className="text-[11px] text-[#A6B1CC] flex items-center gap-1"><Clock className="w-3 h-3" /> Синхронизация: {new Date(balances.lastUpdated).toLocaleString("ru-RU")} {balances.isStale && "• из кэша"}</div>}
          </div>
          <Button onClick={copyAddr} size="icon" variant="ghost" className="rounded-xl bg-white/5 haptic"><Copy className="w-4 h-4" /></Button>
        </div>

        {balances?.warning && (
          <div className="mt-3 text-xs text-[#FFD166] bg-[#FFD166]/10 border border-[#FFD166]/20 rounded-xl p-2.5 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {balances.warning}
          </div>
        )}
      </div>

      {/* Assets cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">Активы</h2>
          <Link href="/assets" className="text-xs text-[#24D7B2] font-medium flex items-center gap-1">Все активы <ArrowUpRight className="w-3.5 h-3.5" /></Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-[140px] rounded-[20px]" />
            <Skeleton className="h-[140px] rounded-[20px]" />
          </div>
        ) : hasError ? (
          <Card className="rounded-[20px] bg-[#151C31] border-white/10 p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-[#FF6677] mx-auto" />
            <div className="mt-2 font-semibold">Ошибка загрузки</div>
            <div className="text-sm text-[#A6B1CC] mt-1">{(assetsQ.error as any)?.message ?? "Не удалось загрузить активы"}</div>
            <Button onClick={() => assetsQ.refetch()} className="mt-4 rounded-xl bg-[#24D7B2] text-[#0B1020]">Повторить</Button>
          </Card>
        ) : assetsQ.data?.length === 0 ? (
          <Card className="rounded-[20px] bg-[#151C31] border-white/10 p-8 text-center border-dashed">
            <Wallet className="w-10 h-10 text-[#A6B1CC] mx-auto" />
            <div className="mt-3 font-semibold">Нет активов</div>
            <div className="text-sm text-[#A6B1CC]">Подключите кошелёк, чтобы увидеть WAVES и USDT</div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {assetsQ.data?.map(asset => (
              <Card key={asset.id} className="rounded-[20px] bg-[#151C31] border-white/[0.06] p-4 card-hover relative overflow-hidden">
                {asset.isStale && <div className="absolute top-3 right-3 text-[10px] px-2 py-1 rounded-full bg-[#FF6677]/15 text-[#FF6677] border border-[#FF6677]/20">Кэш</div>}
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl grid place-items-center font-extrabold text-sm ${asset.id==="WAVES" ? "bg-[#4F7CFF] text-white" : "bg-[#24D7B2] text-[#0B1020]"}`}>
                    {asset.id==="WAVES" ? "W" : "$"}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold flex items-center gap-2">{asset.symbol} <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-white/5 text-[#A6B1CC] border border-white/5">{asset.network}</span></div>
                    <div className="text-xs text-[#A6B1CC]">{asset.name} • {asset.decimals} decimals</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs px-2 py-1 rounded-full bg-[#4CD98A]/10 text-[#4CD98A] border border-[#4CD98A]/20">{asset.priceChange24h}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-[11px] tracking-[0.1em] uppercase text-[#A6B1CC]">Баланс</div>
                  <div className="text-[26px] font-extrabold leading-none mt-1">{hide ? "••••" : fmtBalance(asset.balance, asset.id==="WAVES" ? 4 : 2)} <span className="text-sm font-semibold text-[#A6B1CC]">{asset.symbol}</span></div>
                  <div className="text-xs text-[#A6B1CC]">≈ ${(Number(asset.balance) * Number(asset.priceUsd)).toFixed(2)} • 1 {asset.symbol} = ${asset.priceUsd}</div>
                  <div className="text-[11px] text-[#A6B1CC] mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(asset.lastUpdated).toLocaleTimeString("ru-RU")}</div>
                </div>

                {asset.note && (
                  <div className="mt-3 p-2.5 rounded-xl bg-[#0B1020] border border-white/5 text-xs">
                    <div className="font-semibold text-white">{asset.note.label}</div>
                    <div className="text-[#A6B1CC] line-clamp-2">{asset.note.note}</div>
                  </div>
                )}

                <div className="mt-4 flex gap-2">
                  <Link href="/send" className="flex-1"><Button size="sm" className="w-full rounded-xl bg-white text-[#0B1020] font-bold haptic">Отправить</Button></Link>
                  <Link href="/receive" className="flex-1"><Button size="sm" variant="outline" className="w-full rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 haptic">Получить</Button></Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent operations */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">Последние операции</h2>
          <Link href="/history" className="text-xs text-[#24D7B2] font-medium flex items-center gap-1">Вся история <ArrowUpRight className="w-3.5 h-3.5" /></Link>
        </div>

        {txQ.isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-[72px] rounded-2xl" />)}
          </div>
        ) : txQ.error ? (
          <Card className="rounded-2xl bg-[#151C31] border-white/10 p-6 text-center">
            <div className="text-sm text-[#FF6677]">Ошибка загрузки истории</div>
            <Button onClick={() => txQ.refetch()} size="sm" className="mt-3 rounded-xl">Повторить</Button>
          </Card>
        ) : !txQ.data || txQ.data.items.length === 0 ? (
          <Card className="rounded-[20px] bg-[#151C31] border-white/10 p-10 text-center border-dashed">
            <History className="w-10 h-10 text-[#A6B1CC] mx-auto opacity-50" />
            <div className="mt-3 font-semibold">История пуста</div>
            <div className="text-sm text-[#A6B1CC] max-w-sm mx-auto mt-1">Здесь появятся отправки и получения WAVES/USDT. Пока что операций нет — начните с получения средств.</div>
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/receive"><Button className="rounded-xl bg-[#24D7B2] text-[#0B1020] font-bold"><QrCode className="w-4 h-4 mr-2" /> Получить</Button></Link>
              <Link href="/send"><Button variant="outline" className="rounded-xl border-white/10"><Send className="w-4 h-4 mr-2" /> Отправить</Button></Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {txQ.data.items.map(tx => (
              <Card key={tx.id} className="rounded-2xl bg-[#151C31] border-white/[0.06] p-3 flex items-center gap-3 card-hover">
                <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${tx.type==="send" ? "bg-[#FF6677]/15 text-[#FF6677]" : "bg-[#4CD98A]/15 text-[#4CD98A]"}`}>
                  {tx.type==="send" ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{tx.asset} • {tx.type==="send" ? "Отправка" : "Получение"}</span>
                    <span className={`text-[11px] px-1.5 py-0.5 rounded-full border font-medium ${
                      tx.status==="success" ? "bg-[#4CD98A]/10 text-[#4CD98A] border-[#4CD98A]/20" :
                      tx.status==="failed" ? "bg-[#FF6677]/10 text-[#FF6677] border-[#FF6677]/20" :
                      tx.status==="processing" ? "bg-[#FFD166]/10 text-[#FFD166] border-[#FFD166]/20" :
                      "bg-white/5 text-[#A6B1CC] border-white/10"
                    }`}>{tx.status==="success" ? "Успешно" : tx.status==="failed" ? "Ошибка" : tx.status==="processing" ? "В обработке" : "Ожидание"}</span>
                    {isDemo && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#4F7CFF]/20 text-[#4F7CFF] border border-[#4F7CFF]/20">DEMO</span>}
                  </div>
                  <div className="text-xs text-[#A6B1CC] truncate">{shortAddr(tx.sender)} → {shortAddr(tx.recipient)} • {new Date(tx.createdAt).toLocaleString("ru-RU")}</div>
                  {tx.notes?.[0] && <div className="text-[11px] text-[#A6B1CC] truncate bg-[#0B1020] border border-white/5 rounded-lg px-2 py-1 mt-1">Заметка: {tx.notes[0].note}</div>}
                </div>
                <div className="text-right shrink-0">
                  <div className={`font-bold text-sm ${tx.type==="send" ? "text-white" : "text-[#4CD98A]"}`}>{tx.type==="send" ? "-" : "+"}{fmtBalance(tx.amount, 4)} {tx.asset}</div>
                  <div className="text-[11px] text-[#A6B1CC]">fee {tx.fee}</div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions footer */}
      <div className="grid grid-cols-3 gap-3">
        <Link href="/receive" className="rounded-2xl bg-[#151C31] border border-white/5 p-4 text-center card-hover haptic">
          <div className="w-10 h-10 rounded-xl bg-[#24D7B2]/15 text-[#24D7B2] grid place-items-center mx-auto"><QrCode className="w-5 h-5" /></div>
          <div className="text-sm font-semibold mt-2">Получить</div>
          <div className="text-[11px] text-[#A6B1CC]">QR и адрес</div>
        </Link>
        <Link href="/send" className="rounded-2xl bg-[#151C31] border border-white/5 p-4 text-center card-hover haptic">
          <div className="w-10 h-10 rounded-xl bg-[#4F7CFF]/15 text-[#4F7CFF] grid place-items-center mx-auto"><Send className="w-5 h-5" /></div>
          <div className="text-sm font-semibold mt-2">Отправить</div>
          <div className="text-[11px] text-[#A6B1CC]">WAVES/USDT</div>
        </Link>
        <button onClick={refreshBalances} className="rounded-2xl bg-[#151C31] border border-white/5 p-4 text-center card-hover haptic">
          <div className="w-10 h-10 rounded-xl bg-white/5 grid place-items-center mx-auto"><RefreshCw className={`w-5 h-5 ${balancesLoading ? "animate-spin" : ""}`} /></div>
          <div className="text-sm font-semibold mt-2">Обновить</div>
          <div className="text-[11px] text-[#A6B1CC]">Баланс</div>
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 text-[11px] text-[#A6B1CC] py-2">
        <ShieldCheck className="w-4 h-4 text-[#24D7B2]" /> Ключи хранятся в Keeper — CryptoBank не имеет доступа к приватным ключам
      </div>
    </div>
  );
}

function History(props: any) { return null; }
