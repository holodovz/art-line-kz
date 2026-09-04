import { useState, useEffect, useRef } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, AlertTriangle, CheckCircle2, Loader2, Shield, ExternalLink, Copy, X } from "lucide-react";

type Step = "form" | "preflight" | "signing" | "broadcast" | "success" | "error";

export default function SendPage() {
  const { address, isDemo, network } = useWallet();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("form");
  const [asset, setAsset] = useState<"WAVES" | "USDT">("WAVES");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [preflight, setPreflight] = useState<any>(null);
  const [txResult, setTxResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const idempotencyKey = useRef<string>("");

  // queries
  const preflightQ = trpc.send.preflight.useQuery(
    { asset, recipient: recipient.trim() || "3Pxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", amount: amount || "0", sender: address ?? undefined, message: message || undefined, network },
    { enabled: false }
  );
  const broadcastMut = trpc.send.broadcast.useMutation();

  const validate = () => {
    const errs: string[] = [];
    if (!recipient.trim()) errs.push("Адрес обязателен");
    else if (recipient.trim().length !== 35) errs.push("Адрес должен быть 35 символов");
    else if (!recipient.startsWith("3P") && !recipient.startsWith("3N")) errs.push("Адрес должен начинаться с 3P/3N");
    if (!amount) errs.push("Сумма обязательна");
    else if (isNaN(Number(amount)) || Number(amount) <= 0) errs.push("Некорректная сумма");
    else {
      const dec = asset === "WAVES" ? 8 : 6;
      const parts = amount.split(".");
      if (parts[1]?.length > dec) errs.push(`Максимум ${dec} знаков после запятой`);
    }
    if (message.length > 140) errs.push("Сообщение до 140 символов");
    return errs;
  };

  const handlePreflight = async () => {
    const errs = validate();
    if (errs.length) { toast({ title: errs[0], variant: "destructive" as any }); return; }
    if (!address) { toast({ title: "Подключите кошелёк", variant: "destructive" as any }); return; }
    if (isDemo) { toast({ title: "Демо-режим: отправка недоступна", description:"Подключите WX.Network", variant:"destructive" as any }); return; }
    setIsSubmitting(true);
    setErrorMsg(null);
    idempotencyKey.current = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    try {
      const res = await preflightQ.refetch();
      if (res.data) {
        setPreflight(res.data);
        if (!res.data.valid) {
          setErrorMsg(res.data.errors.join(", "));
          setStep("error");
        } else {
          setStep("preflight");
        }
      }
    } catch (e: any) {
      setErrorMsg(e.message);
      setStep("error");
    } finally { setIsSubmitting(false); }
  };

  const handleSignAndSend = async () => {
    if (!preflight?.valid) return;
    // prevent double click
    if (isSubmitting) return;
    setIsSubmitting(true);
    setStep("signing");
    try { navigator.vibrate?.(20); } catch {}

    // Simulate external wallet confirmation delay
    await new Promise(r => setTimeout(r, 1200));

    // Mock signature – in real would call Keeper Wallet / WalletConnect
    const mockSignature = "sig_" + Math.random().toString(36).slice(2,12) + "_" + Date.now();
    const mockPublicKey = "pub_" + Math.random().toString(36).slice(2,12) + "MockPublicKeyBase58";
    setStep("broadcast");
    try {
      const res = await broadcastMut.mutateAsync({
        asset,
        recipient: recipient.trim(),
        amount: amount.trim(),
        sender: address!,
        message: message || undefined,
        signature: mockSignature,
        publicKey: mockPublicKey,
        idempotencyKey: idempotencyKey.current,
        network,
      });
      setTxResult(res);
      setStep("success");
      toast({ title: "Успешно отправлено", description: `tx ${res.txId.slice(0,10)}…` });
      try { navigator.vibrate?.([20,30,20]); } catch {}
    } catch (e: any) {
      setErrorMsg(e.message);
      setStep("error");
      toast({ title: "Ошибка отправки", description: e.message, variant:"destructive" as any });
    } finally { setIsSubmitting(false); }
  };

  // reset on asset change
  useEffect(() => { setPreflight(null); if (step!=="form") setStep("form"); }, [asset]);

  const fee = preflight?.fee ?? (asset==="WAVES" ? "0.001" : "0.001");
  const remaining = preflight?.remainingBalance;

  return (
    <div className="max-w-[640px] mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-extrabold">Отправить</h1>
        <p className="text-sm text-[#A6B1CC]">Безопасная отправка WAVES и USDT через внешний кошелёк. Подпись выполняется в Keeper/WX — приватные ключи не покидают кошелёк.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 text-[11px]">
        {[
          { id:"form", label:"Данные" },
          { id:"preflight", label:"Проверка" },
          { id:"signing", label:"Подпись" },
          { id:"broadcast", label:"Отправка" },
          { id:"success", label:"Готово" },
        ].map((s,i) => (
          <div key={s.id} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full grid place-items-center font-bold border ${step===s.id ? "bg-[#24D7B2] text-[#0B1020] border-[#24D7B2]" : ["form","preflight","signing","broadcast","success"].indexOf(step) > i ? "bg-[#4CD98A] text-[#0B1020] border-[#4CD98A]" : "bg-white/5 text-[#A6B1CC] border-white/10"}`}>{i+1}</div>
            <span className={`hidden sm:inline font-medium ${step===s.id ? "text-white" : "text-[#A6B1CC]"}`}>{s.label}</span>
            {i<4 && <div className="flex-1 h-px bg-white/10" />}
          </div>
        ))}
      </div>

      {/* Demo guard */}
      {isDemo && (
        <Card className="rounded-2xl bg-[#4F7CFF]/10 border-[#4F7CFF]/20 p-3 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-[#4F7CFF] shrink-0" />
          <div className="text-xs text-[#A6B1CC]">Демо-режим — отправка реальных средств отключена. Подключите WX.Network в профиле, чтобы отправлять WAVES/USDT. Баланс показывается демо-данными.</div>
        </Card>
      )}

      {step==="form" && (
        <Card className="rounded-[24px] bg-[#151C31] border-white/[0.06] p-5 space-y-5">
          {/* Asset selector */}
          <div>
            <Label className="text-xs text-[#A6B1CC] tracking-[0.1em] uppercase">Актив</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {[
                { id:"WAVES", label:"WAVES", sub:"Waves • 8 dec", color:"bg-[#4F7CFF]" },
                { id:"USDT", label:"USDT", sub:"Tether • 6 dec", color:"bg-[#24D7B2]" },
              ].map(a => (
                <button key={a.id} onClick={()=>setAsset(a.id as any)} className={`p-4 rounded-2xl border text-left haptic ${asset===a.id ? "bg-white text-[#0B1020] border-white shadow-lg" : "bg-[#0B1020] border-white/10 text-white hover:bg-white/5"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl grid place-items-center font-extrabold text-sm ${a.color} text-white`}>{a.id==="WAVES" ? "W" : "$"}</div>
                    <div><div className="font-bold text-sm">{a.label}</div><div className={`text-xs ${asset===a.id ? "text-black/60" : "text-[#A6B1CC]"}`}>{a.sub}</div></div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs text-[#A6B1CC]">Адрес получателя *</Label>
            <Input value={recipient} onChange={e=>setRecipient(e.target.value)} placeholder="3P..." maxLength={35} className="mt-1 input-dark rounded-xl font-mono" />
            <div className="text-[11px] text-[#A6B1CC] mt-1">Только адреса Waves (3P/3N). Проверьте перед подписью.</div>
          </div>

          <div>
            <Label className="text-xs text-[#A6B1CC]">Сумма *</Label>
            <div className="relative mt-1">
              <Input value={amount} onChange={e=>setAmount(e.target.value.replace(/[^0-9.]/g,""))} placeholder={asset==="WAVES" ? "0.00" : "0.00"} className="input-dark rounded-xl pr-20" inputMode="decimal" />
              <div className="absolute right-1 top-1 bottom-1 px-3 rounded-lg bg-white/5 border border-white/10 grid place-items-center text-xs font-bold">{asset}</div>
            </div>
            <div className="flex gap-2 mt-2">
              {["10","50","100","MAX"].map(v => (
                <button key={v} onClick={()=> setAmount(v==="MAX" ? (asset==="WAVES" ? "1.5" : "100") : v)} className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[#A6B1CC] hover:bg-white/10 haptic">{v}</button>
              ))}
              <span className="ml-auto text-[11px] text-[#A6B1CC]">Комиссия ~{fee} WAVES</span>
            </div>
          </div>

          <div>
            <Label className="text-xs text-[#A6B1CC]">Сообщение (необязательно)</Label>
            <Textarea value={message} onChange={e=>setMessage(e.target.value)} placeholder="Назначение платежа..." maxLength={140} className="mt-1 input-dark rounded-xl min-h-[70px]" />
            <div className="text-[11px] text-[#A6B1CC] text-right">{message.length}/140</div>
          </div>

          <div className="rounded-xl bg-[#0B1020] border border-white/5 p-3 flex gap-3">
            <Shield className="w-5 h-5 text-[#24D7B2] shrink-0" />
            <div className="text-xs text-[#A6B1CC] leading-relaxed">Транзакция будет передана во внешний кошелёк (Keeper / WX.Network) для подтверждения. CryptoBank не получает приватные ключи. Подпись и broadcast выполняются только после вашего явного подтверждения.</div>
          </div>

          <Button onClick={handlePreflight} disabled={isSubmitting || !recipient || !amount} className="w-full h-12 rounded-xl bg-[#24D7B2] text-[#0B1020] font-bold hover:bg-[#1ec9a5] haptic">
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />} Продолжить • Проверить
          </Button>
        </Card>
      )}

      {step==="preflight" && preflight && (
        <Card className="rounded-[24px] bg-[#151C31] border-white/[0.06] p-5 space-y-4 animate-[slide-up_0.25s]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#4F7CFF]/20 grid place-items-center"><Shield className="w-4 h-4 text-[#4F7CFF]" /></div>
            <h3 className="font-bold">Предпросмотр (preflight)</h3>
            <Badge className={`${preflight.valid ? "bg-[#4CD98A]/15 text-[#4CD98A] border-[#4CD98A]/20" : "bg-[#FF6677]/15 text-[#FF6677] border-[#FF6677]/20"} border ml-auto`}>{preflight.valid ? "Проверка пройдена" : "Есть ошибки"}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-[#0B1020] border border-white/5 p-3">
              <div className="text-[11px] tracking-[0.1em] uppercase text-[#A6B1CC]">Актив</div>
              <div className="font-bold mt-1">{preflight.asset}</div>
              <div className="text-xs text-[#A6B1CC]">Комиссия {preflight.fee} WAVES</div>
            </div>
            <div className="rounded-xl bg-[#0B1020] border border-white/5 p-3">
              <div className="text-[11px] tracking-[0.1em] uppercase text-[#A6B1CC]">Сумма</div>
              <div className="font-bold mt-1">{preflight.amount} {preflight.asset}</div>
              <div className="text-xs text-[#A6B1CC]">Спишется {preflight.totalDeduct}</div>
            </div>
            <div className="col-span-2 rounded-xl bg-[#0B1020] border border-white/5 p-3">
              <div className="text-[11px] tracking-[0.1em] uppercase text-[#A6B1CC]">Получатель</div>
              <div className="font-mono text-sm break-all mt-1">{preflight.recipient}</div>
              <div className="text-xs text-[#A6B1CC] mt-1">Отправитель: {preflight.sender?.slice(0,8)}…{preflight.sender?.slice(-6)}</div>
            </div>
            <div className="col-span-2 rounded-xl bg-white/5 border border-white/10 p-3">
              <div className="text-xs flex justify-between"><span className="text-[#A6B1CC]">Останется после операции</span><span className="font-bold">{remaining} {preflight.asset}</span></div>
            </div>
          </div>

          {preflight.warnings?.length > 0 && (
            <div className="rounded-xl bg-[#FFD166]/10 border border-[#FFD166]/20 p-3">
              <div className="text-xs font-semibold text-[#FFD166] flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Предупреждения</div>
              <ul className="text-xs text-[#A6B1CC] list-disc pl-5 mt-1 space-y-1">{preflight.warnings.map((w:string,i:number)=><li key={i}>{w}</li>)}</ul>
            </div>
          )}
          {preflight.errors?.length > 0 && (
            <div className="rounded-xl bg-[#FF6677]/10 border border-[#FF6677]/20 p-3">
              <div className="text-xs font-semibold text-[#FF6677]">Ошибки</div>
              <ul className="text-xs text-[#A6B1CC] list-disc pl-5 mt-1 space-y-1">{preflight.errors.map((e:string,i:number)=><li key={i}>{e}</li>)}</ul>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={()=>setStep("form")} variant="ghost" className="flex-1 rounded-xl bg-white/5">Назад</Button>
            <Button onClick={handleSignAndSend} disabled={!preflight.valid || isSubmitting} className="flex-[2] h-11 rounded-xl bg-[#24D7B2] text-[#0B1020] font-bold">
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Подписать в кошельке
            </Button>
          </div>

          <div className="text-[11px] text-center text-[#A6B1CC]">На следующем шаге откроется Keeper / WX.Network для подтверждения. Не закрывайте приложение.</div>
        </Card>
      )}

      {(step==="signing" || step==="broadcast") && (
        <Card className="rounded-[24px] bg-[#151C31] border-white/[0.06] p-8 text-center animate-[fade-in_0.3s]">
          <div className="w-16 h-16 rounded-2xl bg-[#24D7B2]/15 grid place-items-center mx-auto"><Loader2 className="w-8 h-8 text-[#24D7B2] animate-spin" /></div>
          <h3 className="font-bold mt-4">{step==="signing" ? "Ожидание подписи…" : "Отправка в сеть Waves…"}</h3>
          <p className="text-sm text-[#A6B1CC] mt-2 max-w-sm mx-auto">{step==="signing" ? "Подтвердите транзакцию во внешнем кошельке. CryptoBank не имеет доступа к ключам." : "Транзакция подписана, выполняем broadcast через серверный API."}</p>
          <div className="mt-4 inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[#A6B1CC]">
            <span className="w-2 h-2 rounded-full bg-[#FFD166] animate-pulse" /> {step==="signing" ? "Ожидание подписи" : "Подписано • Отправка"}
          </div>
        </Card>
      )}

      {step==="success" && txResult && (
        <Card className="rounded-[24px] bg-[#151C31] border-[#4CD98A]/20 p-6 text-center animate-[slide-up_0.3s]">
          <div className="w-16 h-16 rounded-2xl bg-[#4CD98A]/15 grid place-items-center mx-auto"><CheckCircle2 className="w-8 h-8 text-[#4CD98A]" /></div>
          <h3 className="text-xl font-extrabold mt-4">Успешно отправлено</h3>
          <p className="text-sm text-[#A6B1CC] mt-1">{asset} • {amount} → {recipient.slice(0,6)}…{recipient.slice(-4)}</p>
          <div className="mt-4 p-3 rounded-xl bg-[#0B1020] border border-white/5 text-left">
            <div className="text-[11px] tracking-[0.1em] uppercase text-[#A6B1CC]">Tx ID</div>
            <div className="font-mono text-xs break-all mt-1">{txResult.txId}</div>
            <div className="flex gap-2 mt-3">
              <Button onClick={()=>navigator.clipboard.writeText(txResult.txId)} size="sm" variant="ghost" className="rounded-xl bg-white/5"><Copy className="w-4 h-4 mr-1" /> Копировать</Button>
              <a href={txResult.explorerUrl} target="_blank" rel="noreferrer" className="flex-1"><Button size="sm" className="w-full rounded-xl bg-[#4F7CFF] text-white"><ExternalLink className="w-4 h-4 mr-1" /> Waves Explorer</Button></a>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={()=>{setStep("form"); setRecipient(""); setAmount(""); setMessage(""); setPreflight(null);}} variant="outline" className="flex-1 rounded-xl border-white/10 bg-white/5">Новая отправка</Button>
            <Button onClick={()=>window.location.href="/history"} className="flex-1 rounded-xl bg-[#24D7B2] text-[#0B1020] font-bold">История</Button>
          </div>
        </Card>
      )}

      {step==="error" && (
        <Card className="rounded-[24px] bg-[#151C31] border-[#FF6677]/20 p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FF6677]/15 grid place-items-center mx-auto"><X className="w-8 h-8 text-[#FF6677]" /></div>
          <h3 className="font-bold mt-4">Ошибка</h3>
          <p className="text-sm text-[#A6B1CC] mt-1 break-words">{errorMsg ?? "Не удалось выполнить операцию"}</p>
          <div className="mt-4 flex gap-2">
            <Button onClick={()=>setStep("form")} className="flex-1 rounded-xl bg-white text-[#0B1020] font-bold">Исправить данные</Button>
            <Button onClick={handlePreflight} variant="outline" className="flex-1 rounded-xl border-white/10">Повторить проверку</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
