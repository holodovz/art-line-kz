import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useWallet } from "@/contexts/WalletContext";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Edit3, Trash2, Save, X, AlertTriangle, Wallet, Clock, Copy } from "lucide-react";

export default function AssetsPage() {
  const { address, refreshBalances } = useWallet();
  const { toast } = useToast();
  const assetsQ = trpc.assets.list.useQuery(undefined);
  const utils = trpc.useUtils();
  const upsertMut = trpc.assets.upsertNote.useMutation({
    onSuccess: () => { utils.assets.list.invalidate(); toast({ title: "Сохранено" }); },
    onError: (e) => toast({ title: "Ошибка", description: e.message, variant: "destructive" as any }),
  });
  const deleteMut = trpc.assets.deleteNote.useMutation({
    onSuccess: () => { utils.assets.list.invalidate(); toast({ title: "Заметка удалена" }); },
  });
  const refreshMut = trpc.assets.refreshBalance.useMutation();

  const [editing, setEditing] = useState<null | "WAVES" | "USDT">(null);
  const [form, setForm] = useState({ label: "", note: "" });
  const [refreshing, setRefreshing] = useState(false);

  const handleEdit = (assetId: "WAVES" | "USDT") => {
    const asset = assetsQ.data?.find(a => a.id === assetId);
    setEditing(assetId);
    setForm({ label: asset?.note?.label ?? "", note: asset?.note?.note ?? "" });
  };

  const handleSave = async () => {
    if (!editing) return;
    await upsertMut.mutateAsync({ assetId: editing, label: form.label, note: form.note });
    setEditing(null);
  };

  const handleRefresh = async () => {
    if (!address) { toast({ title: "Адрес не подключён", variant: "destructive" as any }); return; }
    setRefreshing(true);
    try {
      await refreshMut.mutateAsync({ address, network: "mainnet" });
      await assetsQ.refetch();
      refreshBalances();
      toast({ title: "Баланс обновлён" });
    } catch (e: any) {
      toast({ title: "Ошибка обновления", description: e.message, variant: "destructive" as any });
    } finally { setRefreshing(false); }
  };

  if (assetsQ.isLoading) {
    return <div className="space-y-4"><Skeleton className="h-32 rounded-[20px]" /><Skeleton className="h-32 rounded-[20px]" /></div>;
  }
  if (assetsQ.error) {
    return (
      <Card className="rounded-[20px] bg-[#151C31] border-white/10 p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-[#FF6677] mx-auto" />
        <div className="mt-2 font-semibold">Не удалось загрузить активы</div>
        <div className="text-sm text-[#A6B1CC] mt-1">{(assetsQ.error as any).message}</div>
        <Button onClick={() => assetsQ.refetch()} className="mt-4 rounded-xl bg-[#24D7B2] text-[#0B1020]">Повторить</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold">Активы</h1>
          <p className="text-sm text-[#A6B1CC]">Управление портфелем WAVES и USDT — заметки и метки хранятся локально</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} size="sm" className="rounded-xl bg-white text-[#0B1020] font-bold haptic">
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} /> Обновить баланс
        </Button>
      </div>

      {assetsQ.data?.map(asset => (
        <Card key={asset.id} className="rounded-[24px] bg-[#151C31] border-white/[0.06] overflow-hidden card-hover">
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl grid place-items-center font-extrabold ${asset.id==="WAVES" ? "bg-[#4F7CFF] text-white" : "bg-[#24D7B2] text-[#0B1020]"}`}>
                  {asset.id==="WAVES" ? "W" : "$"}
                </div>
                <div>
                  <div className="font-bold flex items-center gap-2">{asset.symbol} <Badge variant="outline" className="bg-white/5 text-[#A6B1CC] border-white/10 text-[10px]">{asset.network}</Badge></div>
                  <div className="text-xs text-[#A6B1CC]">{asset.name} • {asset.assetId ?? "WAVES native"}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] tracking-[0.1em] uppercase text-[#A6B1CC]">Цена</div>
                <div className="text-sm font-bold">${asset.priceUsd} <span className="text-[#4CD98A] text-xs">{asset.priceChange24h}</span></div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-[#0B1020] border border-white/5 p-4">
                <div className="text-[11px] tracking-[0.1em] uppercase text-[#A6B1CC]">Баланс</div>
                <div className="text-2xl font-extrabold mt-1">{Number(asset.balance).toLocaleString("ru-RU", { maximumFractionDigits: 6 })} <span className="text-sm font-semibold text-[#A6B1CC]">{asset.symbol}</span></div>
                <div className="text-xs text-[#A6B1CC] mt-1 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(asset.lastUpdated).toLocaleString("ru-RU")} {asset.isStale && <span className="text-[#FF6677]">• устарело</span>}</div>
                {asset.isStale && <div className="mt-2 text-[11px] bg-[#FF6677]/10 border border-[#FF6677]/20 text-[#FF6677] rounded-lg p-2">Показано последнее сохранённое значение — Waves Node недоступен. Попробуйте обновить позже.</div>}
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-[#24D7B2]/10 to-[#4F7CFF]/10 border border-white/5 p-4 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] tracking-[0.1em] uppercase text-[#A6B1CC]">В USD</div>
                  <div className="text-2xl font-extrabold mt-1">${(Number(asset.balance) * Number(asset.priceUsd)).toFixed(2)}</div>
                  <div className="text-xs text-[#A6B1CC]">Курс обновляется с WX.Network</div>
                </div>
                <Button onClick={() => navigator.clipboard.writeText(asset.balance)} size="sm" variant="ghost" className="mt-3 rounded-xl bg-white/5 text-xs h-8"><Copy className="w-3 h-3 mr-1" /> Копировать баланс</Button>
              </div>
            </div>

            {/* CRUD Note */}
            <div className="mt-5 rounded-2xl bg-[#0B1020] border border-white/5 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold flex items-center gap-2"><Edit3 className="w-4 h-4 text-[#24D7B2]" /> Метка и заметка</div>
                {asset.note && editing !== asset.id && (
                  <div className="flex gap-1">
                    <Button onClick={() => handleEdit(asset.id as any)} size="icon" variant="ghost" className="w-8 h-8 rounded-xl bg-white/5"><Edit3 className="w-4 h-4" /></Button>
                    <Button onClick={() => deleteMut.mutate({ assetId: asset.id as any })} size="icon" variant="ghost" className="w-8 h-8 rounded-xl bg-[#FF6677]/10 text-[#FF6677]"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                )}
              </div>

              {editing === asset.id ? (
                <div className="mt-3 space-y-3 animate-[slide-up_0.2s]">
                  <div>
                    <label className="text-xs text-[#A6B1CC]">Метка (например, “Холодный кошелёк”)</label>
                    <Input value={form.label} onChange={e=>setForm(f=>({...f, label:e.target.value}))} placeholder="Метка" maxLength={100} className="mt-1 input-dark rounded-xl" />
                  </div>
                  <div>
                    <label className="text-xs text-[#A6B1CC]">Заметка</label>
                    <Textarea value={form.note} onChange={e=>setForm(f=>({...f, note:e.target.value}))} placeholder="Заметка для портфеля..." maxLength={500} className="mt-1 input-dark rounded-xl min-h-[80px]" />
                    <div className="text-[11px] text-[#A6B1CC] text-right mt-1">{form.note.length}/500</div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={upsertMut.isPending} className="flex-1 rounded-xl bg-[#24D7B2] text-[#0B1020] font-bold"><Save className="w-4 h-4 mr-2" /> Сохранить</Button>
                    <Button onClick={() => setEditing(null)} variant="ghost" className="rounded-xl bg-white/5"><X className="w-4 h-4" /></Button>
                  </div>
                </div>
              ) : asset.note ? (
                <div className="mt-3 p-3 rounded-xl bg-[#151C31] border border-white/5">
                  <div className="text-sm font-semibold text-white">{asset.note.label || "Без метки"}</div>
                  <div className="text-sm text-[#A6B1CC] mt-1 whitespace-pre-wrap">{asset.note.note || "—"}</div>
                  <div className="text-[11px] text-[#A6B1CC] mt-2">Обновлено: {new Date(asset.note.updatedAt).toLocaleString("ru-RU")}</div>
                </div>
              ) : (
                <div className="mt-3">
                  <div className="text-sm text-[#A6B1CC] border border-dashed border-white/10 rounded-xl p-4 text-center">Заметок пока нет — добавьте метку или комментарий для удобства учёта.</div>
                  <Button onClick={() => handleEdit(asset.id as any)} size="sm" className="w-full mt-3 rounded-xl bg-white/5 text-white border border-white/10">Добавить заметку</Button>
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <Button onClick={() => { navigator.clipboard.writeText(asset.balance); }} variant="outline" className="flex-1 rounded-xl border-white/10 bg-white/5 text-white"><Wallet className="w-4 h-4 mr-2" /> Скопировать</Button>
              <Button onClick={handleRefresh} disabled={refreshing} className="flex-1 rounded-xl bg-[#24D7B2] text-[#0B1020] font-bold">Обновить Waves Node</Button>
            </div>
          </div>
        </Card>
      ))}

      <Card className="rounded-2xl bg-[#151C31] border-white/5 p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-[#FFD166] shrink-0 mt-0.5" />
        <div className="text-xs text-[#A6B1CC] leading-relaxed">
          Балансы WAVES и USDT загружаются через серверный API Waves Node. При недоступности сети показывается последнее сохранённое значение с отметкой времени. Заметки хранятся локально и не влияют на on-chain данные.
        </div>
      </Card>
    </div>
  );
}
