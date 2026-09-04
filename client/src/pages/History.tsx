import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpRight, Search, Filter, Calendar, ExternalLink, Edit3, Trash2, Save, X, Clock, AlertTriangle, History as HistoryIcon, Copy } from "lucide-react";

export default function HistoryPage() {
  const { toast } = useToast();
  const [assetF, setAssetF] = useState<"WAVES" | "USDT" | "all">("all");
  const [statusF, setStatusF] = useState<"all" | "success" | "failed" | "processing" | "pending">("all");
  const [typeF, setTypeF] = useState<"all" | "send" | "receive">("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editingNote, setEditingNote] = useState<{ txId:number, noteId?:number, text:string } | null>(null);

  const utils = trpc.useUtils();
  const listQ = trpc.transactions.list.useQuery({
    asset: assetF === "all" ? undefined : assetF,
    status: statusF === "all" ? undefined : statusF as any,
    type: typeF === "all" ? undefined : typeF,
    search: search || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    limit: 50,
  }, { refetchOnWindowFocus:false });

  const addNoteMut = trpc.transactions.addNote.useMutation({
    onSuccess: () => { utils.transactions.list.invalidate(); toast({ title:"Заметка добавлена" }); setEditingNote(null); },
    onError: (e)=> toast({ title:e.message, variant:"destructive" as any }),
  });
  const updateNoteMut = trpc.transactions.updateNote.useMutation({
    onSuccess: () => { utils.transactions.list.invalidate(); toast({ title:"Заметка обновлена" }); setEditingNote(null); },
  });
  const deleteNoteMut = trpc.transactions.deleteNote.useMutation({
    onSuccess: () => { utils.transactions.list.invalidate(); toast({ title:"Заметка удалена" }); },
  });

  const isLoading = listQ.isLoading;
  const items = listQ.data?.items ?? [];
  const total = listQ.data?.total ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold">История операций</h1>
          <p className="text-sm text-[#A6B1CC]">Журнал транзакций WAVES и USDT с фильтрами, заметками и ссылками на Waves Explorer</p>
        </div>
        <Badge variant="outline" className="bg-white/5 border-white/10 text-[#A6B1CC]">{total} записей</Badge>
      </div>

      {/* Filters */}
      <Card className="rounded-[20px] bg-[#151C31] border-white/[0.06] p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A6B1CC]" />
            <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Поиск по адресу, tx ID, сумме..." className="pl-9 input-dark rounded-xl" />
          </div>
          <div className="lg:col-span-2">
            <Select value={assetF} onValueChange={v=>setAssetF(v as any)}>
              <SelectTrigger className="rounded-xl bg-[#0B1020] border-white/10"><SelectValue placeholder="Актив" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все активы</SelectItem>
                <SelectItem value="WAVES">WAVES</SelectItem>
                <SelectItem value="USDT">USDT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-2">
            <Select value={statusF} onValueChange={v=>setStatusF(v as any)}>
              <SelectTrigger className="rounded-xl bg-[#0B1020] border-white/10"><SelectValue placeholder="Статус" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Любой статус</SelectItem>
                <SelectItem value="success">Успешно</SelectItem>
                <SelectItem value="processing">В обработке</SelectItem>
                <SelectItem value="pending">Ожидание</SelectItem>
                <SelectItem value="failed">Ошибка</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-2">
            <Select value={typeF} onValueChange={v=>setTypeF(v as any)}>
              <SelectTrigger className="rounded-xl bg-[#0B1020] border-white/10"><SelectValue placeholder="Тип" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="send">Отправка</SelectItem>
                <SelectItem value="receive">Получение</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-2 flex gap-2">
            <Button onClick={()=>listQ.refetch()} size="sm" className="flex-1 rounded-xl bg-[#24D7B2] text-[#0B1020] font-bold"><Filter className="w-4 h-4 mr-1" /> Применить</Button>
          </div>
          <div className="lg:col-span-6 flex gap-2">
            <div className="flex-1 relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A6B1CC]" />
              <Input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} className="pl-9 input-dark rounded-xl" placeholder="От" />
            </div>
            <div className="flex-1 relative">
              <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A6B1CC]" />
              <Input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} className="pl-9 input-dark rounded-xl" placeholder="До" />
            </div>
            {(assetF!=="all"||statusF!=="all"||typeF!=="all"||search||dateFrom||dateTo) && (
              <Button variant="ghost" size="sm" className="rounded-xl bg-white/5" onClick={()=>{setAssetF("all");setStatusF("all");setTypeF("all");setSearch("");setDateFrom("");setDateTo("");}}>Сбросить</Button>
            )}
          </div>
          <div className="lg:col-span-6 text-xs text-[#A6B1CC] flex items-center gap-2">
            <Clock className="w-4 h-4" /> Фильтры применяются локально • {items.length} показано
          </div>
        </div>
      </Card>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3,4].map(i=> <Skeleton key={i} className="h-[140px] rounded-2xl" />)}</div>
      ) : listQ.error ? (
        <Card className="rounded-2xl bg-[#151C31] border-white/10 p-8 text-center">
          <AlertTriangle className="w-8 h-8 text-[#FF6677] mx-auto" />
          <div className="font-semibold mt-2">Ошибка загрузки</div>
          <div className="text-sm text-[#A6B1CC]">{(listQ.error as any).message}</div>
          <Button onClick={()=>listQ.refetch()} className="mt-4 rounded-xl bg-[#24D7B2] text-[#0B1020]">Повторить</Button>
        </Card>
      ) : items.length===0 ? (
        <Card className="rounded-[20px] bg-[#151C31] border-white/10 p-10 text-center border-dashed">
          <HistoryIcon className="w-10 h-10 text-[#A6B1CC] mx-auto opacity-40" />
          <div className="font-semibold mt-3">Записей не найдено</div>
          <div className="text-sm text-[#A6B1CC] mt-1 max-w-md mx-auto">Попробуйте изменить фильтры или сбросить поиск. Для нового пользователя покажите демо-данные — они помечены как DEMO.</div>
          <Button onClick={()=>{setAssetF("all");setStatusF("all");setTypeF("all");setSearch("");}} variant="outline" className="mt-4 rounded-xl border-white/10 bg-white/5">Сбросить фильтры</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map(tx => (
            <Card key={tx.id} className="rounded-[20px] bg-[#151C31] border-white/[0.06] p-4 card-hover">
              <div className="flex gap-3">
                <div className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${tx.type==="send" ? "bg-[#FF6677]/15 text-[#FF6677]" : "bg-[#4CD98A]/15 text-[#4CD98A]"}`}>
                  {tx.type==="send" ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm">{tx.asset}</span>
                    <Badge variant="outline" className={`text-[11px] border ${tx.type==="send" ? "bg-[#FF6677]/10 text-[#FF6677] border-[#FF6677]/20" : "bg-[#4CD98A]/10 text-[#4CD98A] border-[#4CD98A]/20"}`}>{tx.type==="send" ? "Отправка" : "Получение"}</Badge>
                    <Badge className={`text-[11px] border ${
                      tx.status==="success" ? "bg-[#4CD98A]/15 text-[#4CD98A] border-[#4CD98A]/20" :
                      tx.status==="failed" ? "bg-[#FF6677]/15 text-[#FF6677] border-[#FF6677]/20" :
                      tx.status==="processing" ? "bg-[#FFD166]/15 text-[#FFD166] border-[#FFD166]/20" :
                      "bg-white/5 text-[#A6B1CC] border-white/10"
                    }`}>{tx.status==="success" ? "Успешно" : tx.status==="failed" ? "Ошибка" : tx.status==="processing" ? "В обработке" : "Ожидание"}</Badge>
                    <span className="text-[11px] text-[#A6B1CC]">{new Date(tx.createdAt).toLocaleString("ru-RU")}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-[#0B1020] border border-white/5 p-2.5">
                      <div className="text-[11px] tracking-[0.08em] uppercase text-[#A6B1CC]">Сумма</div>
                      <div className="font-mono font-bold mt-1">{tx.amount} {tx.asset} <span className="text-[#A6B1CC] font-normal">fee {tx.fee}</span></div>
                      {tx.message && <div className="text-[#A6B1CC] mt-1">Сообщение: {tx.message}</div>}
                    </div>
                    <div className="rounded-xl bg-[#0B1020] border border-white/5 p-2.5 space-y-1">
                      <div className="flex justify-between gap-2"><span className="text-[#A6B1CC]">От:</span><span className="font-mono truncate">{tx.sender.slice(0,12)}…{tx.sender.slice(-6)}</span></div>
                      <div className="flex justify-between gap-2"><span className="text-[#A6B1CC]">Кому:</span><span className="font-mono truncate">{tx.recipient.slice(0,12)}…{tx.recipient.slice(-6)}</span></div>
                      {tx.txId && (
                        <div className="flex items-center gap-1">
                          <span className="text-[#A6B1CC]">Tx:</span>
                          <span className="font-mono text-[11px] truncate">{tx.txId.slice(0,16)}…</span>
                          <button onClick={()=>navigator.clipboard.writeText(tx.txId!)} className="ml-auto p-1 rounded bg-white/5"><Copy className="w-3 h-3" /></button>
                          <a href={tx.explorerUrl} target="_blank" rel="noreferrer" className="p-1 rounded bg-[#4F7CFF] text-white"><ExternalLink className="w-3 h-3" /></a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes CRUD */}
                  <div className="mt-3">
                    <div className="text-xs font-semibold flex items-center gap-2"><Edit3 className="w-3.5 h-3.5 text-[#24D7B2]" /> Заметки к операции</div>
                    {(tx as any).notes?.length ? (
                      <div className="mt-2 space-y-2">
                        {(tx as any).notes.map((n:any)=> (
                          <div key={n.id} className="rounded-xl bg-white/5 border border-white/5 p-2.5 flex gap-2">
                            {editingNote?.txId===tx.id && editingNote?.noteId===n.id ? (
                              <div className="flex-1 flex gap-2">
                                <Textarea value={editingNote.text} onChange={e=>setEditingNote(s=> s ? {...s, text:e.target.value} : null)} className="flex-1 input-dark rounded-xl min-h-[60px]" maxLength={500} />
                                <div className="flex flex-col gap-1">
                                  <Button size="icon" onClick={()=> updateNoteMut.mutate({ noteId:n.id, transactionId:tx.id, note: editingNote.text })} className="w-8 h-8 rounded-xl bg-[#24D7B2] text-[#0B1020]"><Save className="w-4 h-4" /></Button>
                                  <Button size="icon" variant="ghost" onClick={()=>setEditingNote(null)} className="w-8 h-8 rounded-xl bg-white/5"><X className="w-4 h-4" /></Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex-1 text-sm text-[#F5F8FF] whitespace-pre-wrap">{n.note}</div>
                                <div className="flex gap-1 shrink-0">
                                  <Button size="icon" variant="ghost" onClick={()=>setEditingNote({ txId:tx.id, noteId:n.id, text:n.note })} className="w-7 h-7 rounded-lg bg-white/5"><Edit3 className="w-3.5 h-3.5" /></Button>
                                  <Button size="icon" variant="ghost" onClick={()=> deleteNoteMut.mutate({ noteId:n.id, transactionId:tx.id })} className="w-7 h-7 rounded-lg bg-[#FF6677]/10 text-[#FF6677]"><Trash2 className="w-3.5 h-3.5" /></Button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-[#A6B1CC] border border-dashed border-white/10 rounded-xl p-3 text-center">Заметок нет — добавьте комментарий для учёта.</div>
                    )}

                    {editingNote?.txId===tx.id && !editingNote.noteId ? (
                      <div className="mt-2 flex gap-2">
                        <Textarea value={editingNote.text} onChange={e=>setEditingNote(s=> s ? {...s, text:e.target.value} : null)} placeholder="Текст заметки..." className="flex-1 input-dark rounded-xl" maxLength={500} />
                        <div className="flex flex-col gap-1">
                          <Button size="sm" onClick={()=> addNoteMut.mutate({ transactionId:tx.id, note: editingNote.text })} disabled={!editingNote.text.trim()} className="rounded-xl bg-[#24D7B2] text-[#0B1020]"><Save className="w-4 h-4 mr-1" />Сохранить</Button>
                          <Button size="sm" variant="ghost" onClick={()=>setEditingNote(null)} className="rounded-xl bg-white/5">Отмена</Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={()=>setEditingNote({ txId:tx.id, text:"" })} className="mt-2 rounded-xl border-white/10 bg-white/5 text-xs"><Edit3 className="w-3.5 h-3.5 mr-1" /> Добавить заметку</Button>
                    )}
                  </div>
                </div>
                <div className="hidden lg:block text-right shrink-0 min-w-[110px]">
                  <div className={`font-extrabold ${tx.type==="send" ? "text-white" : "text-[#4CD98A]"}`}>{tx.type==="send" ? "-" : "+"}{tx.amount}</div>
                  <div className="text-xs text-[#A6B1CC]">{tx.asset}</div>
                  {tx.txId && <a href={tx.explorerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[#4F7CFF] mt-2 hover:underline"><ExternalLink className="w-3 h-3" /> Explorer</a>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="text-center text-[11px] text-[#A6B1CC] flex items-center justify-center gap-2">
        <Clock className="w-3 h-3" /> История обновляется при каждой успешной отправке • Кэш Waves Node может задерживаться
      </div>
    </div>
  );
}

function ArrowDownLeft(props:any){ return <ArrowUpRight {...props} style={{ transform:"rotate(90deg)"}} /> }
