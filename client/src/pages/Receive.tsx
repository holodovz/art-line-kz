import { useState, useMemo } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Share2, AlertTriangle, Check, QrCode, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ReceivePage() {
  const { address, isDemo, network } = useWallet();
  const { toast } = useToast();
  const [asset, setAsset] = useState<"WAVES" | "USDT">("WAVES");
  const [copied, setCopied] = useState(false);
  const displayAddress = address ?? "3P DemoAddressMockForCryptoBankDemoMode — подключите кошелёк";

  const qrUrl = useMemo(() => {
    const data = address ?? "demo";
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(data)}&color=0B1020&bgcolor=F5F8FF`;
  }, [address]);

  const handleCopy = async () => {
    if (!address) { toast({ title: "Нет адреса", description: "Подключите кошелёк", variant: "destructive" as any }); return; }
    await navigator.clipboard.writeText(address);
    setCopied(true);
    toast({ title: "Адрес скопирован" });
    try { navigator.vibrate?.(15); } catch {}
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!address) { toast({ title: "Нет адреса", variant: "destructive" as any }); return; }
    const text = `Мой адрес ${asset} в сети Waves (${network}): ${address}`;
    if (navigator.share) {
      try { await navigator.share({ title: "CryptoBank — адрес получения", text }); toast({ title: "Поделились адресом" }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
      toast({ title: "Скопировано для шаринга" });
    }
    try { navigator.vibrate?.(20); } catch {}
  };

  return (
    <div className="space-y-6 max-w-[640px] mx-auto">
      <div>
        <h1 className="text-xl font-extrabold">Получить</h1>
        <p className="text-sm text-[#A6B1CC]">Покажите QR или скопируйте адрес — средства поступят на подключённый кошелёк. Проверяйте сеть и адрес перед отправкой.</p>
      </div>

      <Card className="rounded-[24px] bg-[#151C31] border-white/[0.06] p-6">
        <Tabs value={asset} onValueChange={v => setAsset(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-[#0B1020] rounded-xl p-1">
            <TabsTrigger value="WAVES" className="rounded-lg data-[state=active]:bg-[#4F7CFF] data-[state=active]:text-white">WAVES</TabsTrigger>
            <TabsTrigger value="USDT" className="rounded-lg data-[state=active]:bg-[#24D7B2] data-[state=active]:text-[#0B1020]">USDT</TabsTrigger>
          </TabsList>
          <TabsContent value="WAVES" className="mt-4">
            <div className="flex items-center gap-2 text-xs"><Badge className="bg-[#4F7CFF] text-white">WAVES</Badge> <span className="text-[#A6B1CC]">Waves Mainnet • Комиссия сети ~0.001 WAVES</span></div>
          </TabsContent>
          <TabsContent value="USDT" className="mt-4">
            <div className="flex items-center gap-2 text-xs"><Badge className="bg-[#24D7B2] text-[#0B1020]">USDT</Badge> <span className="text-[#A6B1CC]">Waves Token • ID DG2xFk…2Ad24p • Комиссия в WAVES</span></div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex flex-col items-center">
          <div className="w-[260px] h-[260px] rounded-[24px] bg-white p-4 shadow-xl relative overflow-hidden">
            <img src={qrUrl} alt="QR код адреса" className="w-full h-full object-contain" />
            <div className="absolute inset-0 pointer-events-none rounded-[24px] border border-black/5" />
            <div className="absolute bottom-2 inset-x-2 text-[10px] text-center text-black/50 font-mono">CryptoBank • Waves</div>
          </div>
          <div className="mt-4 text-center">
            <div className="text-[11px] tracking-[0.1em] uppercase text-[#A6B1CC]">Адрес кошелька • {network}</div>
            <div className="mt-1 font-mono text-sm bg-[#0B1020] border border-white/10 rounded-xl px-3 py-2 break-all max-w-[340px]">{displayAddress}</div>
            <div className="mt-2 text-xs text-[#A6B1CC] flex items-center justify-center gap-1"><Info className="w-3 h-3" /> Адрес один для WAVES и USDT в сети Waves</div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 w-full max-w-[340px]">
            <Button onClick={handleCopy} className={`h-12 rounded-xl font-bold haptic ${copied ? "bg-[#4CD98A] text-[#0B1020]" : "bg-[#24D7B2] text-[#0B1020]"}`}>
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />} {copied ? "Скопировано" : "Копировать"}
            </Button>
            <Button onClick={handleShare} variant="outline" className="h-12 rounded-xl bg-white/5 border-white/10 text-white haptic"><Share2 className="w-4 h-4 mr-2" /> Поделиться</Button>
          </div>

          {isDemo && <div className="mt-4 text-xs px-3 py-2 rounded-xl bg-[#4F7CFF]/10 border border-[#4F7CFF]/20 text-[#A6B1CC] text-center max-w-[340px]">Демо-адрес — реальные средства не поступят. Подключите WX.Network для получения.</div>}
        </div>

        <div className="mt-8 space-y-3">
          <div className="rounded-xl bg-[#FFD166]/10 border border-[#FFD166]/20 p-3 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-[#FFD166] shrink-0" />
            <div className="text-xs leading-relaxed">
              <div className="font-semibold text-[#FFD166]">Проверьте адрес и сеть перед отправкой</div>
              <div className="text-[#A6B1CC] mt-1">Отправляйте только WAVES и USDT сети Waves (WX.Network). Отправка по другой сети приведёт к потере средств. Комиссия списывается в WAVES.</div>
            </div>
          </div>
          <div className="rounded-xl bg-[#0B1020] border border-white/5 p-3 flex gap-3">
            <QrCode className="w-5 h-5 text-[#24D7B2] shrink-0" />
            <div className="text-xs text-[#A6B1CC]">
              QR обновляется автоматически при смене адреса. Для теста используйте “Поделиться” — системное окно шаринга откроется на устройстве.
            </div>
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl bg-[#151C31] border-white/5 p-4">
        <div className="text-sm font-semibold">Как получить средства?</div>
        <ol className="mt-2 text-sm text-[#A6B1CC] list-decimal pl-5 space-y-1">
          <li>Выберите актив WAVES или USDT.</li>
          <li>Скопируйте адрес или покажите QR отправителю.</li>
          <li>Попросите отправить средства только в сети Waves.</li>
          <li>После подтверждения транзакция появится в Истории.</li>
        </ol>
      </Card>
    </div>
  );
}
