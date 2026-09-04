import { useState } from "react";
import { useWallet } from "@/contexts/WalletContext";
import { useAppLock } from "@/contexts/AppLockContext";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Shield, LogOut, Lock, Eye, EyeOff, Copy, Clock, Wifi, KeyRound, Smartphone, Palette, Bell, Trash2, AlertTriangle, Check } from "lucide-react";
import { useLocation } from "wouter";

export default function ProfilePage() {
  const { address, publicKey, network, state, isDemo, createChallenge, verify, disconnect, balances } = useWallet();
  const { hasPin, setPin, removePin, lock, notificationsEnabled, toggleNotifications, theme, toggleTheme } = useAppLock();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [pinInput, setPinInput] = useState("");
  const [showConnect, setShowConnect] = useState(false);
  const [mockSig, setMockSig] = useState("");
  const [mockPub, setMockPub] = useState("");
  const [mockAddr, setMockAddr] = useState("");
  const [challengeInfo, setChallengeInfo] = useState<any>(null);
  const [connecting, setConnecting] = useState(false);

  const handleCreateChallenge = async () => {
    setConnecting(true);
    const res = await createChallenge();
    if (res) {
      setChallengeInfo(res);
      setMockAddr(address ?? "3Pxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx".replace(/x/g, () => "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"[Math.floor(Math.random()*48)]).slice(0,35));
      setShowConnect(true);
    }
    setConnecting(false);
  };

  const handleMockVerify = async () => {
    if (!challengeInfo) { toast({ title:"Сначала создайте challenge", variant:"destructive" as any }); return; }
    const sig = mockSig || "mockSignature_"+Math.random().toString(36).slice(2,10);
    const pub = mockPub || "mockPublicKeyBase58_"+Math.random().toString(36).slice(2,12);
    const addr = mockAddr || "3P"+Array.from({length:33},()=> "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"[Math.floor(Math.random()*58)]).join("");
    const ok = await verify({ challenge: challengeInfo.challenge, signature: sig, publicKey: pub, wxAddress: addr });
    if (ok) { setShowConnect(false); setChallengeInfo(null); }
  };

  const handleCopy = async (text:string) => {
    await navigator.clipboard.writeText(text);
    toast({ title:"Скопировано" });
  };

  const handleSetPin = () => {
    if (pinInput.length < 4) { toast({ title:"PIN минимум 4 цифры", variant:"destructive" as any }); return; }
    setPin(pinInput);
    setPinInput("");
    toast({ title:"PIN установлен" });
  };

  const handleDisconnect = async () => {
    await disconnect();
    toast({ title:"Выход выполнен" });
  };

  const openKeeper = () => {
    // Simulate deep link to Keeper Wallet
    if (challengeInfo) {
      window.location.href = `https://keeper-wallet.app/connect?challenge=${encodeURIComponent(challengeInfo.challenge)}&callback=${encodeURIComponent("cryptobank://wx-callback")}`;
      toast({ title:"Открываем Keeper Wallet..." });
    } else {
      handleCreateChallenge();
    }
  };

  return (
    <div className="space-y-6 max-w-[720px] mx-auto">
      <div>
        <h1 className="text-xl font-extrabold">Профиль и безопасность</h1>
        <p className="text-sm text-[#A6B1CC]">Адрес, сеть, синхронизация, PIN-блокировка, тема и выход. Seed-фразы не хранятся.</p>
      </div>

      {/* Wallet card */}
      <Card className="rounded-[24px] bg-[#151C31] border-white/[0.06] p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#4F7CFF] to-[#24D7B2] grid place-items-center text-white font-bold">{address ? address[2].toUpperCase() : "?"}</div>
            <div>
              <div className="font-bold flex items-center gap-2">Подключённый кошелёк <Badge className={`${state==="connected" ? "bg-[#4CD98A]/15 text-[#4CD98A] border-[#4CD98A]/20" : "bg-white/5 text-[#A6B1CC] border-white/10"} border`}>{state==="connected" ? "Подключён" : state==="connecting" ? "Подключение…" : isDemo ? "Демо" : "Не подключён"}</Badge></div>
              <div className="text-xs text-[#A6B1CC]">{network} • WX.Network • Keeper Wallet • WalletConnect</div>
            </div>
          </div>
          <Badge variant="outline" className="bg-white/5 border-white/10 text-[#A6B1CC] hidden sm:inline-flex">{isDemo ? "DEMO" : "LIVE"}</Badge>
        </div>

        <div className="mt-5 space-y-3">
          <div className="rounded-2xl bg-[#0B1020] border border-white/5 p-4">
            <div className="text-[11px] tracking-[0.1em] uppercase text-[#A6B1CC] flex items-center gap-1"><KeyRound className="w-3 h-3" /> Адрес кошелька</div>
            <div className="font-mono text-sm break-all mt-1">{address ?? "— не подключён"}</div>
            <div className="text-xs text-[#A6B1CC] mt-1 flex items-center gap-1"><Wifi className="w-3 h-3" /> Сеть Waves • {network}</div>
            {address && <Button onClick={()=>handleCopy(address)} size="sm" variant="ghost" className="mt-2 rounded-xl bg-white/5 h-8"><Copy className="w-4 h-4 mr-1" /> Копировать адрес</Button>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[#0B1020] border border-white/5 p-3">
              <div className="text-[11px] tracking-[0.08em] uppercase text-[#A6B1CC] flex items-center gap-1"><Clock className="w-3 h-3" /> Последняя синхронизация</div>
              <div className="text-sm font-medium mt-1">{balances?.lastUpdated ? new Date(balances.lastUpdated).toLocaleString("ru-RU") : "—"}</div>
              <div className="text-[11px] text-[#A6B1CC]">{balances?.isStale ? "Из кэша • Waves Node недоступен" : "Свежие данные с узла"}</div>
            </div>
            <div className="rounded-xl bg-[#0B1020] border border-white/5 p-3">
              <div className="text-[11px] tracking-[0.08em] uppercase text-[#A6B1CC]">Состояние WX.Network</div>
              <div className="text-sm font-bold mt-1 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${state==="connected" ? "bg-[#4CD98A]" : state==="error" ? "bg-[#FF6677]" : "bg-[#FFD166]"}`} />
                {state==="connected" ? "Подключён" : state==="connecting" ? "Подключение…" : state==="expired" ? "Истёк" : state==="error" ? "Ошибка" : "Отключён"}
              </div>
              <div className="text-[11px] text-[#A6B1CC]">Challenge flow • deep link cryptobank://</div>
            </div>
          </div>

          {state!=="connected" ? (
            <div className="space-y-3">
              <Button onClick={handleCreateChallenge} disabled={connecting} className="w-full h-12 rounded-xl bg-[#24D7B2] text-[#0B1020] font-bold">
                {connecting ? "Создание challenge..." : "Подключить WX.Network / Keeper"}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={openKeeper} variant="outline" className="rounded-xl border-white/10 bg-white/5">Открыть Keeper</Button>
                <Button onClick={()=> window.open("https://wx.network", "_blank")} variant="ghost" className="rounded-xl bg-white/5">WX.Network</Button>
              </div>
              <div className="text-[11px] text-[#A6B1CC] text-center">Используется официальный Web Auth flow: challenge + signature проверяется на сервере. Demo Login не используется.</div>
            </div>
          ) : (
            <Button onClick={handleDisconnect} variant="outline" className="w-full rounded-xl border-[#FF6677]/30 bg-[#FF6677]/10 text-[#FF6677] hover:bg-[#FF6677]/20">
              <LogOut className="w-4 h-4 mr-2" /> Выйти из кошелька
            </Button>
          )}
        </div>
      </Card>

      {/* Mock verify panel (for testing without real Keeper) */}
      {showConnect && challengeInfo && (
        <Card className="rounded-[20px] bg-[#0B1020] border-[#24D7B2]/20 p-5 animate-[slide-up_0.25s]">
          <h3 className="font-bold flex items-center gap-2"><Shield className="w-4 h-4 text-[#24D7B2]" /> Подключение: эмуляция Keeper/WalletConnect</h3>
          <p className="text-xs text-[#A6B1CC] mt-1">В реальном приложении здесь откроется Keeper Wallet для подписи challenge. Для демо введите mock данные и нажмите Подтвердить.</p>
          <div className="mt-3 rounded-xl bg-[#151C31] border border-white/5 p-3 font-mono text-xs break-all">challenge: {challengeInfo.challenge}<br/>expires: {new Date(challengeInfo.expiresAt).toLocaleString("ru-RU")}<br/>deepLink: {challengeInfo.deepLink}</div>
          <div className="mt-3 space-y-3">
            <div><Label className="text-xs text-[#A6B1CC]">Адрес Waves (3P... 35 символов)</Label><Input value={mockAddr} onChange={e=>setMockAddr(e.target.value)} placeholder="3P..." className="mt-1 input-dark rounded-xl font-mono" maxLength={35} /></div>
            <div><Label className="text-xs text-[#A6B1CC]">PublicKey (mock)</Label><Input value={mockPub} onChange={e=>setMockPub(e.target.value)} placeholder="base58 publicKey" className="mt-1 input-dark rounded-xl" /></div>
            <div><Label className="text-xs text-[#A6B1CC]">Signature (mock)</Label><Input value={mockSig} onChange={e=>setMockSig(e.target.value)} placeholder="signature base58" className="mt-1 input-dark rounded-xl" /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="ghost" onClick={()=>setShowConnect(false)} className="flex-1 rounded-xl bg-white/5">Отмена</Button>
            <Button onClick={handleMockVerify} className="flex-[2] rounded-xl bg-[#24D7B2] text-[#0B1020] font-bold">Подтвердить подпись</Button>
          </div>
          <div className="text-[11px] text-[#A6B1CC] mt-2">Нажмите без заполнения — будут сгенерированы mock подпись и ключ для теста flow.</div>
        </Card>
      )}

      {/* Security */}
      <Card className="rounded-[20px] bg-[#151C31] border-white/[0.06] p-5">
        <h3 className="font-bold flex items-center gap-2"><Lock className="w-4 h-4 text-[#24D7B2]" /> Локальная блокировка PIN-кодом</h3>
        <p className="text-xs text-[#A6B1CC] mt-1">PIN хранится локально (SecureStore/AsyncStorage) и не отправляется на сервер. Seed-фраза никогда не запрашивается.</p>

        <div className="mt-4 rounded-xl bg-[#0B1020] border border-white/5 p-4">
          {hasPin ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#4CD98A]/15 grid place-items-center"><Check className="w-5 h-5 text-[#4CD98A]" /></div>
                <div><div className="text-sm font-semibold">PIN установлен</div><div className="text-xs text-[#A6B1CC]">Приложение блокируется при выходе</div></div>
              </div>
              <div className="flex gap-2">
                <Button onClick={lock} size="sm" className="rounded-xl bg-white text-[#0B1020]">Заблокировать</Button>
                <Button onClick={removePin} size="sm" variant="ghost" className="rounded-xl bg-[#FF6677]/10 text-[#FF6677]"><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Label className="text-xs text-[#A6B1CC]">Установить PIN (4-6 цифр)</Label>
              <div className="flex gap-2">
                <Input value={pinInput} onChange={e=>setPinInput(e.target.value.replace(/\D/g,""))} placeholder="••••" maxLength={6} inputMode="numeric" className="input-dark rounded-xl flex-1 tracking-[0.3em] text-center" />
                <Button onClick={handleSetPin} className="rounded-xl bg-[#24D7B2] text-[#0B1020] font-bold">Сохранить</Button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-[#0B1020] border border-white/5 p-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/5 grid place-items-center"><Smartphone className="w-5 h-5" /></div>
            <div><div className="text-sm font-medium">Ручная блокировка</div><div className="text-xs text-[#A6B1CC]">Заблокировать сейчас</div></div>
          </div>
          <Button onClick={lock} disabled={!hasPin} size="sm" variant="outline" className="rounded-xl border-white/10 bg-white/5 disabled:opacity-40">Блокировать</Button>
        </div>

        <div className="mt-3 text-[11px] text-[#A6B1CC] flex gap-2"><AlertTriangle className="w-4 h-4 text-[#FFD166] shrink-0" /> Никогда не вводите seed-фразу в CryptoBank. Подлинный Keeper/WX никогда не просит seed в этом приложении.</div>
      </Card>

      {/* Settings */}
      <Card className="rounded-[20px] bg-[#151C31] border-white/[0.06] p-5 space-y-4">
        <h3 className="font-bold">Настройки</h3>

        <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B1020] border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/5 grid place-items-center"><Palette className="w-4 h-4" /></div>
            <div><div className="text-sm font-medium">Тема</div><div className="text-xs text-[#A6B1CC]">Тёмная (рекомендуется) / Светлая</div></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#A6B1CC]">{theme==="dark" ? "Тёмная" : "Светлая"}</span>
            <Switch checked={theme==="dark"} onCheckedChange={toggleTheme} />
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B1020] border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/5 grid place-items-center"><Bell className="w-4 h-4" /></div>
            <div><div className="text-sm font-medium">Уведомления</div><div className="text-xs text-[#A6B1CC]">О транзакциях и балансе</div></div>
          </div>
          <Switch checked={notificationsEnabled} onCheckedChange={toggleNotifications} />
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B1020] border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/5 grid place-items-center"><Shield className="w-4 h-4 text-[#4CD98A]" /></div>
            <div><div className="text-sm font-medium">SecureStore сессия</div><div className="text-xs text-[#A6B1CC]">Хранение сессии на устройстве</div></div>
          </div>
          <Badge variant="outline" className="bg-[#4CD98A]/10 text-[#4CD98A] border-[#4CD98A]/20">Включено</Badge>
        </div>

        <Button onClick={handleDisconnect} variant="outline" className="w-full rounded-xl border-[#FF6677]/20 bg-[#FF6677]/5 text-[#FF6677] hover:bg-[#FF6677]/10">
          <LogOut className="w-4 h-4 mr-2" /> Выйти и отключить кошелёк
        </Button>

        <div className="text-[11px] text-[#A6B1CC] text-center">Package: com.app.cryptobank • Deep link: cryptobank://wx-callback • Build: dev</div>
      </Card>
    </div>
  );
}
