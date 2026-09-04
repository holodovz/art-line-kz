import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useWallet } from "@/contexts/WalletContext";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, RefreshCw, Shield, AlertTriangle, CheckCircle2, Clock, Link as LinkIcon, Key, FileText, ExternalLink } from "lucide-react";

export default function DiagnosticsPage() {
  const { address, challenge, state, network } = useWallet();
  const { toast } = useToast();
  const diagQ = trpc.diagnostics.list.useQuery(undefined, { refetchOnWindowFocus:false });
  const reportQ = trpc.diagnostics.getReport.useQuery(undefined, { refetchOnWindowFocus:false });
  const createChallenge = trpc.wallet.createChallenge.useMutation();
  const createDiag = trpc.diagnostics.createEvent.useMutation();

  const handleCopy = async (text:string, label:string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: `${label} скопировано` });
    try { navigator.vibrate?.(15);} catch {}
  };

  const handleRecheck = async () => {
    await diagQ.refetch();
    await reportQ.refetch();
    toast({ title:"Диагностика обновлена" });
  };

  const handleCopyReport = async () => {
    if (!reportQ.data) return;
    const txt = JSON.stringify(reportQ.data, null, 2);
    await navigator.clipboard.writeText(txt);
    toast({ title:"Отчёт скопирован без секретов" });
  };

  const handleNewChallenge = async () => {
    try {
      const res = await createChallenge.mutateAsync({ network:"mainnet" });
      await createDiag.mutateAsync({ challenge: res.challenge, sessionStatus:"connecting", redirectUrl: res.redirectUrl });
      toast({ title:"Challenge создан", description: res.challenge.slice(0,20)+"…" });
      diagQ.refetch();
    } catch (e:any) { toast({ title:e.message, variant:"destructive" as any }); }
  };

  return (
    <div className="space-y-6 max-w-[900px] mx-auto">
      <div>
        <h1 className="text-xl font-extrabold">Диагностика подключения</h1>
        <p className="text-sm text-[#A6B1CC]">Безопасные технические данные WX.Network и deep link flow. Секреты и приватные ключи не отображаются.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="rounded-2xl bg-[#151C31] border-white/[0.06] p-4">
          <div className="text-xs tracking-[0.1em] uppercase text-[#A6B1CC]">Статус сессии</div>
          <div className="mt-2 flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${state==="connected" ? "bg-[#4CD98A]" : state==="connecting" ? "bg-[#FFD166] animate-pulse" : state==="error" ? "bg-[#FF6677]" : "bg-[#A6B1CC]"}`} />
            <span className="font-bold capitalize">{state}</span>
            <Badge variant="outline" className="ml-auto bg-white/5 border-white/10 text-[#A6B1CC]">{network}</Badge>
          </div>
          <div className="text-xs text-[#A6B1CC] mt-2 break-all">{address ?? "Адрес не подключён"}</div>
          <Button onClick={handleRecheck} size="sm" className="w-full mt-3 rounded-xl bg-white text-[#0B1020] font-bold"><RefreshCw className="w-4 h-4 mr-2" /> Повторная проверка</Button>
        </Card>

        <Card className="rounded-2xl bg-[#151C31] border-white/[0.06] p-4">
          <div className="text-xs tracking-[0.1em] uppercase text-[#A6B1CC]">Challenge</div>
          <div className="mt-2 font-mono text-xs break-all bg-[#0B1020] border border-white/5 rounded-xl p-2.5 min-h-[56px]">{challenge ?? "— нет активного challenge"}</div>
          <div className="text-[11px] text-[#A6B1CC] mt-2 flex items-center gap-1"><Clock className="w-3 h-3" /> Срок действия 5 мин</div>
          <Button onClick={handleNewChallenge} size="sm" variant="outline" className="w-full mt-3 rounded-xl border-white/10 bg-white/5">Создать challenge</Button>
        </Card>

        <Card className="rounded-2xl bg-[#151C31] border-white/[0.06] p-4">
          <div className="text-xs tracking-[0.1em] uppercase text-[#A6B1CC]">Deep Link</div>
          <div className="mt-2 font-mono text-xs break-all bg-[#0B1020] border border-white/5 rounded-xl p-2.5">cryptobank://wx-callback</div>
          <div className="text-[11px] text-[#A6B1CC] mt-2">Схема для возврата из Keeper/WalletConnect</div>
          <Button onClick={()=>handleCopy("cryptobank://wx-callback", "Deep link")} size="sm" variant="ghost" className="w-full mt-3 rounded-xl bg-[#24D7B2]/10 text-[#24D7B2]"><Copy className="w-4 h-4 mr-2" /> Копировать схему</Button>
        </Card>
      </div>

      <Card className="rounded-[20px] bg-[#151C31] border-white/[0.06] p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2"><FileText className="w-4 h-4 text-[#24D7B2]" /> Диагностический отчёт</h3>
          <Button onClick={handleCopyReport} size="sm" className="rounded-xl bg-[#24D7B2] text-[#0B1020] font-bold"><Copy className="w-4 h-4 mr-2" /> Копировать без секретов</Button>
        </div>
        <div className="mt-4 rounded-xl bg-[#0B1020] border border-white/5 p-4 font-mono text-xs overflow-auto max-h-[260px] whitespace-pre-wrap">
          {reportQ.isLoading ? <Skeleton className="h-32" /> : reportQ.error ? <span className="text-[#FF6677]">{(reportQ.error as any).message}</span> : JSON.stringify(reportQ.data, null, 2)}
        </div>
        <div className="text-[11px] text-[#A6B1CC] mt-2 flex items-center gap-1"><Shield className="w-3 h-3 text-[#4CD98A]" /> Отчёт не содержит seed-фраз и приватных ключей.</div>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">События диагностики</h3>
          <Button onClick={handleRecheck} size="sm" variant="ghost" className="rounded-xl bg-white/5"><RefreshCw className="w-4 h-4 mr-2" /> Обновить</Button>
        </div>

        {diagQ.isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i=> <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        ) : diagQ.error ? (
          <Card className="rounded-2xl bg-[#151C31] border-white/10 p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-[#FF6677] mx-auto" />
            <div className="text-sm mt-2">{(diagQ.error as any).message}</div>
          </Card>
        ) : !diagQ.data || (diagQ.data as any).length===0 ? (
          <Card className="rounded-2xl bg-[#151C31] border-white/10 p-8 text-center border-dashed">
            <Shield className="w-10 h-10 text-[#A6B1CC] mx-auto opacity-40" />
            <div className="font-semibold mt-3">Событий пока нет</div>
            <div className="text-sm text-[#A6B1CC]">Подключите кошелёк, чтобы увидеть challenge, signature и статусы.</div>
          </Card>
        ) : (
          <div className="space-y-3">
            {(diagQ.data as any[]).map((ev:any, idx:number)=> (
              <Card key={ev.id ?? idx} className="rounded-2xl bg-[#151C31] border-white/[0.06] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={`border text-[11px] ${
                    ev.sessionStatus==="connected" ? "bg-[#4CD98A]/15 text-[#4CD98A] border-[#4CD98A]/20" :
                    ev.sessionStatus==="connecting" ? "bg-[#FFD166]/15 text-[#FFD166] border-[#FFD166]/20" :
                    ev.sessionStatus==="error" ? "bg-[#FF6677]/15 text-[#FF6677] border-[#FF6677]/20" :
                    ev.sessionStatus==="expired" ? "bg-[#FF6677]/10 text-[#FF6677] border-[#FF6677]/20" :
                    "bg-white/5 text-[#A6B1CC] border-white/10"
                  }`}>{ev.sessionStatus}</Badge>
                  <span className="text-xs text-[#A6B1CC] flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(ev.createdAt).toLocaleString("ru-RU")}</span>
                  {ev.expiresAt && <span className="text-xs text-[#A6B1CC]">истекает {new Date(ev.expiresAt).toLocaleTimeString("ru-RU")}</span>}
                </div>
                <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-[#0B1020] border border-white/5 p-3">
                    <div className="text-[11px] tracking-[0.08em] uppercase text-[#A6B1CC] flex items-center gap-1"><Key className="w-3 h-3" /> Challenge</div>
                    <div className="font-mono break-all mt-1">{ev.challenge ?? "—"}</div>
                    {ev.challenge && <Button onClick={()=>handleCopy(ev.challenge, "Challenge")} size="sm" variant="ghost" className="mt-2 h-7 rounded-lg bg-white/5 text-[11px]"><Copy className="w-3 h-3 mr-1" /> Копировать</Button>}
                  </div>
                  <div className="rounded-xl bg-[#0B1020] border border-white/5 p-3">
                    <div className="text-[11px] tracking-[0.08em] uppercase text-[#A6B1CC] flex items-center gap-1"><Shield className="w-3 h-3" /> Signature / PublicKey</div>
                    <div className="font-mono break-all mt-1">sig: {ev.signature ?? "—"}</div>
                    <div className="font-mono break-all">pub: {ev.publicKey ?? "—"}</div>
                    <div className="font-mono break-all">addr: {ev.wxAddress ?? "—"}</div>
                  </div>
                  <div className="lg:col-span-2 rounded-xl bg-[#0B1020] border border-white/5 p-3 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-[#4F7CFF]" />
                    <span className="font-mono break-all flex-1">{ev.redirectUrl ?? "—"}</span>
                    {ev.redirectUrl && <Button onClick={()=>handleCopy(ev.redirectUrl, "Redirect URL")} size="icon" variant="ghost" className="w-8 h-8 rounded-xl bg-white/5"><Copy className="w-4 h-4" /></Button>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card className="rounded-2xl bg-[#0B1020] border-[#24D7B2]/20 p-4 flex gap-3">
        <CheckCircle2 className="w-5 h-5 text-[#4CD98A] shrink-0" />
        <div className="text-xs text-[#A6B1CC] leading-relaxed">Показываются только безопасные данные: challenge, обрезанные signature/publicKey, адрес, статусы и redirect URL. Полные секреты, seed-фразы и приватные ключи никогда не логируются и не отображаются.</div>
      </Card>
    </div>
  );
}
